import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import db, { initDb } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

// ── Members ──────────────────────────────────────────────────────────────────

app.get('/api/members', async (_req, res) => {
  const rows = await db('members').orderBy('created_at')
  res.json(rows.map(toMember))
})

app.post('/api/members', async (req, res) => {
  const row = { id: randomUUID(), name: req.body.name, color: req.body.color, dob: req.body.dob || null, created_at: new Date().toISOString() }
  await db('members').insert(row)
  res.json(toMember(row))
})

app.put('/api/members/:id', async (req, res) => {
  const { name, color, dob } = req.body
  await db('members').where({ id: req.params.id }).update({ name, color, dob: dob || null })
  const row = await db('members').where({ id: req.params.id }).first()
  res.json(toMember(row))
})

app.delete('/api/members/:id', async (req, res) => {
  await db('members').where({ id: req.params.id }).delete()
  res.json({ ok: true })
})

// ── Entries ───────────────────────────────────────────────────────────────────

app.get('/api/entries', async (_req, res) => {
  const rows = await db('entries').orderBy('created_at', 'desc')
  res.json(rows.map(toEntry))
})

app.post('/api/entries', async (req, res) => {
  const b = req.body
  const row = {
    id: randomUUID(), member_id: b.memberId, type: b.type, date: b.date,
    time: b.time || null, title: b.title, notes: b.notes || null,
    severity: b.severity || null, photo_data_url: b.photoDataUrl || null,
    sleep_quality: b.sleepQuality || null, sleep_duration: b.sleepDuration || null,
    created_at: new Date().toISOString(),
  }
  await db('entries').insert(row)
  res.json(toEntry(row))
})

app.put('/api/entries/:id', async (req, res) => {
  const b = req.body
  await db('entries').where({ id: req.params.id }).update({
    member_id: b.memberId, type: b.type, date: b.date, time: b.time || null,
    title: b.title, notes: b.notes || null, severity: b.severity || null,
    photo_data_url: b.photoDataUrl || null,
    sleep_quality: b.sleepQuality || null, sleep_duration: b.sleepDuration || null,
  })
  const row = await db('entries').where({ id: req.params.id }).first()
  res.json(toEntry(row))
})

app.delete('/api/entries/:id', async (req, res) => {
  await db('entries').where({ id: req.params.id }).delete()
  res.json({ ok: true })
})

// ── Export / Import ───────────────────────────────────────────────────────────

app.get('/api/export', async (_req, res) => {
  const [members, entries] = await Promise.all([
    db('members').orderBy('created_at'),
    db('entries').orderBy('created_at', 'desc'),
  ])
  res.json({ version: 1, exportedAt: new Date().toISOString(), members: members.map(toMember), entries: entries.map(toEntry) })
})

app.post('/api/import', async (req, res) => {
  const { members = [], entries = [] } = req.body
  await db.transaction(async trx => {
    await trx('entries').delete()
    await trx('members').delete()
    for (const m of members) {
      await trx('members').insert({ id: m.id, name: m.name, color: m.color, dob: m.dob || null, created_at: m.createdAt })
    }
    for (const e of entries) {
      await trx('entries').insert({
        id: e.id, member_id: e.memberId, type: e.type, date: e.date, time: e.time || null,
        title: e.title, notes: e.notes || null, severity: e.severity || null,
        photo_data_url: e.photoDataUrl || null,
        sleep_quality: e.sleepQuality || null, sleep_duration: e.sleepDuration || null,
        created_at: e.createdAt,
      })
    }
  })
  res.json({ ok: true })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMember(r) {
  return { id: r.id, name: r.name, color: r.color, dob: r.dob || '', createdAt: r.created_at }
}

function toEntry(r) {
  return {
    id: r.id, memberId: r.member_id, type: r.type, date: r.date,
    time: r.time || '', title: r.title, notes: r.notes || '',
    severity: r.severity || '', photoDataUrl: r.photo_data_url || null,
    sleepQuality: r.sleep_quality || '', sleepDuration: r.sleep_duration || '',
    createdAt: r.created_at,
  }
}

// ── Serve frontend + start ─────────────────────────────────────────────────────

const distPath = join(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
initDb()
  .then(() => app.listen(PORT, () => console.log(`WellnessLog API → http://localhost:${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1) })
