import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import db from '../db.js'
import { setTokenCookie, clearTokenCookie, requireAuth, optionalAuth } from '../auth.js'

const router = Router()

function toUser(r) {
  return { id: r.id, email: r.email || null, isGuest: !!r.is_guest }
}

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  // requireAuth already ran — req.user is set
  const user = await db('users').where({ id: req.user.userId }).first()
  if (!user) return res.status(401).json({ error: 'User not found' })
  res.json(toUser(user))
})

// POST /api/auth/guest
router.post('/guest', async (req, res) => {
  const id = randomUUID()
  const now = new Date().toISOString()
  await db('users').insert({ id, email: null, password_hash: null, is_guest: true, created_at: now })
  setTokenCookie(res, { userId: id, isGuest: true })
  res.json(toUser({ id, email: null, is_guest: true }))
})

// POST /api/auth/register (optionalAuth so guests can upgrade)
router.post('/register', optionalAuth, async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const existing = await db('users').where({ email: email.toLowerCase() }).first()
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const id = randomUUID()
  const password_hash = await bcrypt.hash(password, 10)
  const now = new Date().toISOString()
  const isGuest = req.user?.isGuest || false

  if (isGuest && req.user?.userId) {
    // Upgrade guest account
    await db('users').where({ id: req.user.userId }).update({
      email: email.toLowerCase(),
      password_hash,
      is_guest: false,
    })
    const user = await db('users').where({ id: req.user.userId }).first()
    setTokenCookie(res, { userId: user.id, isGuest: false })
    return res.json(toUser(user))
  }

  await db('users').insert({ id, email: email.toLowerCase(), password_hash, is_guest: false, created_at: now })
  setTokenCookie(res, { userId: id, isGuest: false })
  res.json(toUser({ id, email, is_guest: false }))
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const user = await db('users').where({ email: email.toLowerCase() }).first()
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  setTokenCookie(res, { userId: user.id, isGuest: false })
  res.json(toUser(user))
})

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req, res) => {
  clearTokenCookie(res)
  res.json({ ok: true })
})

export default router
