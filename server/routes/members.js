import { Router } from 'express'
import { randomUUID } from 'crypto'
import db from '../db.js'
import { getMemberRole, assertMemberAccess } from '../auth.js'

const router = Router()

function toMember(r) {
  return { id: r.id, name: r.name, color: r.color, dob: r.dob || '', createdAt: r.created_at, createdBy: r.created_by }
}

function toAccess(r) {
  return {
    id: r.id, memberId: r.member_id, userId: r.user_id, role: r.role,
    shareCode: r.share_code || null, shareCodeAccess: r.share_code_access || null,
    createdAt: r.created_at,
  }
}

function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// GET /api/members
router.get('/', async (req, res) => {
  const userId = req.user.userId
  const accessRows = await db('member_access')
    .where({ user_id: userId })
    .whereNotNull('role')
  const memberIds = accessRows.map(r => r.member_id)
  if (!memberIds.length) return res.json([])
  const members = await db('members').whereIn('id', memberIds).orderBy('created_at')
  const roleMap = Object.fromEntries(accessRows.map(r => [r.member_id, r.role]))
  res.json(members.map(m => ({ ...toMember(m), role: roleMap[m.id] })))
})

// POST /api/members
router.post('/', async (req, res) => {
  const userId = req.user.userId
  const id = randomUUID()
  const now = new Date().toISOString()
  const member = { id, created_by: userId, name: req.body.name, color: req.body.color, dob: req.body.dob || null, created_at: now }
  await db('members').insert(member)
  await db('member_access').insert({ id: randomUUID(), member_id: id, user_id: userId, role: 'admin', share_code: null, share_code_access: null, created_at: now })
  res.json({ ...toMember(member), role: 'admin' })
})

// PUT /api/members/:id
router.put('/:id', async (req, res) => {
  const userId = req.user.userId
  const ok = await assertMemberAccess(db, req.params.id, userId, 'admin')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  const { name, color, dob } = req.body
  await db('members').where({ id: req.params.id }).update({ name, color, dob: dob || null })
  const row = await db('members').where({ id: req.params.id }).first()
  const role = await getMemberRole(db, req.params.id, userId)
  res.json({ ...toMember(row), role })
})

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
  const ok = await assertMemberAccess(db, req.params.id, req.user.userId, 'admin')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  await db('members').where({ id: req.params.id }).delete()
  res.json({ ok: true })
})

// GET /api/members/:id/access  (admin only)
router.get('/:id/access', async (req, res) => {
  const ok = await assertMemberAccess(db, req.params.id, req.user.userId, 'admin')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  const rows = await db('member_access').where({ member_id: req.params.id })
  // Join with users to get emails
  const userIds = rows.map(r => r.user_id).filter(Boolean)
  const users = userIds.length ? await db('users').whereIn('id', userIds) : []
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))
  res.json(rows.map(r => ({
    ...toAccess(r),
    userEmail: r.user_id ? (userMap[r.user_id]?.email || 'Guest') : null,
    isGuest: r.user_id ? !!userMap[r.user_id]?.is_guest : null,
  })))
})

// POST /api/members/:id/share  (admin only) - generate a share code
router.post('/:id/share', async (req, res) => {
  const ok = await assertMemberAccess(db, req.params.id, req.user.userId, 'admin')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  const { accessLevel } = req.body // 'editor' | 'viewer'
  if (!['editor', 'viewer'].includes(accessLevel)) return res.status(400).json({ error: 'Invalid access level' })

  let code
  let attempts = 0
  while (attempts < 10) {
    const candidate = generateShareCode()
    const existing = await db('member_access').where({ share_code: candidate }).first()
    if (!existing) { code = candidate; break }
    attempts++
  }
  if (!code) return res.status(500).json({ error: 'Failed to generate unique code' })

  const row = {
    id: randomUUID(),
    member_id: req.params.id,
    user_id: null,
    role: null,
    share_code: code,
    share_code_access: accessLevel,
    created_at: new Date().toISOString(),
  }
  await db('member_access').insert(row)
  res.json(toAccess(row))
})

// DELETE /api/members/:id/access/:accessId  (admin only) - revoke
router.delete('/:id/access/:accessId', async (req, res) => {
  const ok = await assertMemberAccess(db, req.params.id, req.user.userId, 'admin')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  // Don't allow revoking own admin access
  const row = await db('member_access').where({ id: req.params.accessId, member_id: req.params.id }).first()
  if (!row) return res.status(404).json({ error: 'Not found' })
  if (row.user_id === req.user.userId && row.role === 'admin') {
    return res.status(400).json({ error: 'Cannot revoke your own admin access' })
  }
  await db('member_access').where({ id: req.params.accessId }).delete()
  res.json({ ok: true })
})

export default router
