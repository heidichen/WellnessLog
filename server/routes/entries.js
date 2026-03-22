import { Router } from 'express'
import { randomUUID } from 'crypto'
import db from '../db.js'
import { assertMemberAccess } from '../auth.js'

const router = Router()

function toEntry(r) {
  return {
    id: r.id, memberId: r.member_id, type: r.type, date: r.date,
    time: r.time || '', title: r.title, notes: r.notes || '',
    severity: r.severity || '', photoDataUrl: r.photo_data_url || null,
    sleepQuality: r.sleep_quality || '', sleepDuration: r.sleep_duration || '',
    createdAt: r.created_at, createdBy: r.created_by || null,
  }
}

async function getAccessibleMemberIds(userId) {
  const rows = await db('member_access').where({ user_id: userId }).whereNotNull('role')
  return rows.map(r => r.member_id)
}

// GET /api/entries
router.get('/', async (req, res) => {
  const memberIds = await getAccessibleMemberIds(req.user.userId)
  if (!memberIds.length) return res.json([])
  const rows = await db('entries').whereIn('member_id', memberIds).orderBy('created_at', 'desc')
  res.json(rows.map(toEntry))
})

// POST /api/entries
router.post('/', async (req, res) => {
  const b = req.body
  const ok = await assertMemberAccess(db, b.memberId, req.user.userId, 'editor')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  const row = {
    id: randomUUID(), member_id: b.memberId, created_by: req.user.userId,
    type: b.type, date: b.date, time: b.time || null,
    title: b.title, notes: b.notes || null, severity: b.severity || null,
    photo_data_url: b.photoDataUrl || null,
    sleep_quality: b.sleepQuality || null, sleep_duration: b.sleepDuration || null,
    created_at: new Date().toISOString(),
  }
  await db('entries').insert(row)
  res.json(toEntry(row))
})

// PUT /api/entries/:id
router.put('/:id', async (req, res) => {
  const b = req.body
  const entry = await db('entries').where({ id: req.params.id }).first()
  if (!entry) return res.status(404).json({ error: 'Not found' })
  const ok = await assertMemberAccess(db, entry.member_id, req.user.userId, 'editor')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  await db('entries').where({ id: req.params.id }).update({
    member_id: b.memberId, type: b.type, date: b.date, time: b.time || null,
    title: b.title, notes: b.notes || null, severity: b.severity || null,
    photo_data_url: b.photoDataUrl || null,
    sleep_quality: b.sleepQuality || null, sleep_duration: b.sleepDuration || null,
  })
  const row = await db('entries').where({ id: req.params.id }).first()
  res.json(toEntry(row))
})

// DELETE /api/entries/:id
router.delete('/:id', async (req, res) => {
  const entry = await db('entries').where({ id: req.params.id }).first()
  if (!entry) return res.status(404).json({ error: 'Not found' })
  const ok = await assertMemberAccess(db, entry.member_id, req.user.userId, 'admin')
  if (!ok) return res.status(403).json({ error: 'Forbidden' })
  await db('entries').where({ id: req.params.id }).delete()
  res.json({ ok: true })
})

export default router
