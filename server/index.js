import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import db, { initDb } from './db.js'
import { requireAuth } from './auth.js'
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

// All member and entry routes require auth
app.use('/api/members', requireAuth, membersRouter)
app.use('/api/entries', requireAuth, entriesRouter)

// Share join endpoint (inline, requires auth)
app.post('/api/share/join', requireAuth, async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Code required' })
  const invite = await db('member_access').where({ share_code: code.toUpperCase().trim() }).whereNull('user_id').first()
  if (!invite) return res.status(404).json({ error: 'Invalid or already used code' })

  const userId = req.user.userId
  // Check if user already has access
  const existing = await db('member_access').where({ member_id: invite.member_id, user_id: userId }).whereNotNull('role').first()
  if (existing) return res.status(409).json({ error: 'You already have access to this member' })

  // Grant access
  await db('member_access').where({ id: invite.id }).update({ user_id: userId, role: invite.share_code_access })
  const member = await db('members').where({ id: invite.member_id }).first()

  function toMember(r) {
    return { id: r.id, name: r.name, color: r.color, dob: r.dob || '', createdAt: r.created_at, createdBy: r.created_by }
  }

  const role = invite.share_code_access
  res.json({ ...toMember(member), role })
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
  await db.transaction(async trx => {
    // Only import members where user is admin
    for (const m of members) {
      const existing = await trx('members').where({ id: m.id }).first()
      if (existing) {
        const access = await trx('member_access').where({ member_id: m.id, user_id: userId, role: 'admin' }).first()
        if (access) await trx('members').where({ id: m.id }).update({ name: m.name, color: m.color, dob: m.dob || null })
      } else {
        await trx('members').insert({ id: m.id, created_by: userId, name: m.name, color: m.color, dob: m.dob || null, created_at: m.createdAt || new Date().toISOString() })
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
  })
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
