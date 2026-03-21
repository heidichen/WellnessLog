import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import db from './db.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

// ── Members ──────────────────────────────────────────────────────────────────

app.get('/api/members', (_req, res) => {
  res.json(db.prepare('SELECT * FROM members ORDER BY created_at').all().map(toMember))
})

app.post('/api/members', (req, res) => {
  const row = { id: randomUUID(), name: req.body.name, color: req.body.color, dob: req.body.dob || null, created_at: new Date().toISOString() }
  db.prepare('INSERT INTO members VALUES (@id, @name, @color, @dob, @created_at)').run(row)
  res.json(toMember(row))
})

app.put('/api/members/:id', (req, res) => {
  const { name, color, dob } = req.body
  db.prepare('UPDATE members SET name=?, color=?, dob=? WHERE id=?').run(name, color, dob || null, req.params.id)
  res.json(toMember(db.prepare('SELECT * FROM members WHERE id=?').get(req.params.id)))
})

app.delete('/api/members/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ── Entries ───────────────────────────────────────────────────────────────────

app.get('/api/entries', (_req, res) => {
  res.json(db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all().map(toEntry))
})

app.post('/api/entries', (req, res) => {
  const b = req.body
  const row = {
    id: randomUUID(), member_id: b.memberId, type: b.type, date: b.date,
    time: b.time || null, title: b.title, notes: b.notes || null,
    severity: b.severity || null, photo_data_url: b.photoDataUrl || null,
    sleep_quality: b.sleepQuality || null, sleep_duration: b.sleepDuration || null,
    created_at: new Date().toISOString(),
  }
  db.prepare('INSERT INTO entries (id,member_id,type,date,time,title,notes,severity,photo_data_url,sleep_quality,sleep_duration,created_at) VALUES (@id,@member_id,@type,@date,@time,@title,@notes,@severity,@photo_data_url,@sleep_quality,@sleep_duration,@created_at)').run(row)
  res.json(toEntry(row))
})

app.put('/api/entries/:id', (req, res) => {
  const b = req.body
  db.prepare(`UPDATE entries SET member_id=?,type=?,date=?,time=?,title=?,notes=?,severity=?,photo_data_url=?,sleep_quality=?,sleep_duration=? WHERE id=?`)
    .run(b.memberId, b.type, b.date, b.time || null, b.title, b.notes || null, b.severity || null, b.photoDataUrl || null, b.sleepQuality || null, b.sleepDuration || null, req.params.id)
  res.json(toEntry(db.prepare('SELECT * FROM entries WHERE id=?').get(req.params.id)))
})

app.delete('/api/entries/:id', (req, res) => {
  db.prepare('DELETE FROM entries WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// ── Export / Import ───────────────────────────────────────────────────────────

app.get('/api/export', (_req, res) => {
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    members: db.prepare('SELECT * FROM members ORDER BY created_at').all().map(toMember),
    entries: db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all().map(toEntry),
  })
})

app.post('/api/import', (req, res) => {
  const { members = [], entries = [] } = req.body
  db.transaction(() => {
    db.prepare('DELETE FROM entries').run()
    db.prepare('DELETE FROM members').run()
    for (const m of members) {
      db.prepare('INSERT OR REPLACE INTO members VALUES (?,?,?,?,?)').run(m.id, m.name, m.color, m.dob || null, m.createdAt)
    }
    for (const e of entries) {
      db.prepare('INSERT OR REPLACE INTO entries (id,member_id,type,date,time,title,notes,severity,photo_data_url,sleep_quality,sleep_duration,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
        e.id, e.memberId, e.type, e.date, e.time || null,
        e.title, e.notes || null, e.severity || null, e.photoDataUrl || null,
        e.sleepQuality || null, e.sleepDuration || null, e.createdAt
      )
    }
  })()
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`WellnessLog API → http://localhost:${PORT}`))
