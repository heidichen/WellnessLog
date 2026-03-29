import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import db, { initDb } from './db.js'
import { requireAuth, assertMemberAccess } from './auth.js'
import authRouter from './routes/auth.js'
import membersRouter from './routes/members.js'
import entriesRouter from './routes/entries.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '20mb' }))
app.use(cookieParser())

// Auth routes — each route handles its own auth internally
app.use('/api/auth', authRouter)

// Proxy Claude API call server-side (avoids CORS, keeps key secret)
app.post('/api/analyze-food', requireAuth, async (req, res) => {
  const { base64, mimeType } = req.body
  if (!base64 || !mimeType) return res.status(400).json({ error: 'base64 and mimeType required' })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: 'List all the foods you can identify in this image, as a simple comma-separated list. Be specific (e.g. \'scrambled egg, steamed broccoli, white rice\') not generic.' },
          ],
        }],
      }),
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Claude API error' })
    res.json({ result: data.content[0].text.trim() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// All member and entry routes require auth
app.use('/api/members', requireAuth, membersRouter)
app.use('/api/entries', requireAuth, entriesRouter)

function toMember(r) {
  return { id: r.id, name: r.name, color: r.color, dob: r.dob || '', createdAt: r.created_at, createdBy: r.created_by }
}

function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// POST /api/share/bundle — create a multi-member share code (admin of all selected members required)
app.post('/api/share/bundle', requireAuth, async (req, res) => {
  const { memberIds, accessLevel } = req.body
  if (!Array.isArray(memberIds) || memberIds.length === 0) return res.status(400).json({ error: 'At least one member required' })
  if (!['editor', 'viewer'].includes(accessLevel)) return res.status(400).json({ error: 'Invalid access level' })

  const userId = req.user.userId
  for (const mid of memberIds) {
    const ok = await assertMemberAccess(db, mid, userId, 'admin')
    if (!ok) return res.status(403).json({ error: 'You must be admin of all selected members' })
  }

  let code
  for (let i = 0; i < 10; i++) {
    const candidate = generateShareCode()
    const existing = await db('share_bundles').where({ share_code: candidate }).first()
    if (!existing) { code = candidate; break }
  }
  if (!code) return res.status(500).json({ error: 'Failed to generate unique code' })

  const bundleId = randomUUID()
  const now = new Date().toISOString()
  await db('share_bundles').insert({ id: bundleId, share_code: code, created_by: userId, access_level: accessLevel, used_by: null, created_at: now })
  await db('share_bundle_members').insert(memberIds.map(mid => ({ id: randomUUID(), bundle_id: bundleId, member_id: mid })))

  const members = await db('members').whereIn('id', memberIds)
  res.json({ code, accessLevel, members: members.map(toMember) })
})

// POST /api/share/join — join via single-member or bundle code
app.post('/api/share/join', requireAuth, async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Code required' })
  const normalized = code.toUpperCase().trim()
  const userId = req.user.userId

  // Try bundle code first
  const bundle = await db('share_bundles').where({ share_code: normalized }).whereNull('used_by').first()
  if (bundle) {
    if (bundle.created_by === userId) return res.status(409).json({ error: 'You cannot join your own share code' })
    const bundleMembers = await db('share_bundle_members').where({ bundle_id: bundle.id })
    const granted = []
    for (const bm of bundleMembers) {
      const existing = await db('member_access').where({ member_id: bm.member_id, user_id: userId }).whereNotNull('role').first()
      if (!existing) {
        await db('member_access').insert({ id: randomUUID(), member_id: bm.member_id, user_id: userId, role: bundle.access_level, share_code: null, share_code_access: null, created_at: new Date().toISOString() })
        const m = await db('members').where({ id: bm.member_id }).first()
        granted.push({ ...toMember(m), role: bundle.access_level })
      }
    }
    await db('share_bundles').where({ id: bundle.id }).update({ used_by: userId })
    return res.json({ members: granted })
  }

  // Try single-member code
  const invite = await db('member_access').where({ share_code: normalized }).whereNull('user_id').first()
  if (!invite) return res.status(404).json({ error: 'Invalid or already used code' })

  const existing = await db('member_access').where({ member_id: invite.member_id, user_id: userId }).whereNotNull('role').first()
  if (existing) return res.status(409).json({ error: 'You already have access to this member' })

  await db('member_access').where({ id: invite.id }).update({ user_id: userId, role: invite.share_code_access })
  const member = await db('members').where({ id: invite.member_id }).first()
  res.json({ members: [{ ...toMember(member), role: invite.share_code_access }] })
})

// Export / Import
app.get('/api/export', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const accessRows = await db('member_access').where({ user_id: userId }).whereNotNull('role')
  const memberIds = accessRows.map(r => r.member_id)
  const [members, entries] = await Promise.all([
    memberIds.length ? db('members').whereIn('id', memberIds).orderBy('created_at') : [],
    memberIds.length ? db('entries').whereIn('member_id', memberIds).orderBy('created_at', 'desc') : [],
  ])
  const roleMap = Object.fromEntries(accessRows.map(r => [r.member_id, r.role]))
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    members: members.map(m => ({ id: m.id, name: m.name, color: m.color, dob: m.dob || '', createdAt: m.created_at, role: roleMap[m.id] })),
    entries: entries.map(e => ({
      id: e.id, memberId: e.member_id, type: e.type, date: e.date,
      time: e.time || '', title: e.title, notes: e.notes || '',
      severity: e.severity || '', photoDataUrl: e.photo_data_url || null,
      sleepQuality: e.sleep_quality || '', sleepDuration: e.sleep_duration || '',
      createdAt: e.created_at,
    })),
  })
})

app.post('/api/import', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const { members = [], entries = [] } = req.body
  try { await db.transaction(async trx => {
    for (const m of members) {
      const existing = await trx('members').where({ id: m.id }).first()
      if (existing) {
        await trx('members').where({ id: m.id }).update({ name: m.name, color: m.color, dob: m.dob || null })
      } else {
        await trx('members').insert({ id: m.id, created_by: userId, name: m.name, color: m.color, dob: m.dob || null, created_at: m.createdAt || new Date().toISOString() })
      }
      // Always ensure importing user has admin access (covers re-imports)
      const existingAccess = await trx('member_access')
        .where({ member_id: m.id, user_id: userId }).whereNotNull('role').first()
      if (!existingAccess) {
        await trx('member_access').insert({ id: randomUUID(), member_id: m.id, user_id: userId, role: 'admin', share_code: null, share_code_access: null, created_at: new Date().toISOString() })
      }
    }
    // Only import entries for members the user is admin or editor of
    for (const e of entries) {
      const access = await trx('member_access').where({ member_id: e.memberId, user_id: userId }).whereIn('role', ['admin', 'editor']).first()
      if (!access) continue
      const existingEntry = await trx('entries').where({ id: e.id }).first()
      if (!existingEntry) {
        await trx('entries').insert({
          id: e.id, member_id: e.memberId, created_by: userId,
          type: e.type, date: e.date, time: e.time || null,
          title: e.title, notes: e.notes || null, severity: e.severity || null,
          photo_data_url: e.photoDataUrl || null,
          sleep_quality: e.sleepQuality || null, sleep_duration: e.sleepDuration || null,
          created_at: e.createdAt || new Date().toISOString(),
        })
      }
    }
  }) } catch (err) {
    console.error('[import] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
  res.json({ ok: true })
})

// Serve frontend + start
const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

const PORT = process.env.PORT || 3001
initDb()
  .then(() => app.listen(PORT, () => console.log(`WellnessLog API → http://localhost:${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1) })
