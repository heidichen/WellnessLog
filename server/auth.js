import jwt from 'jsonwebtoken'

// IMPORTANT: Set JWT_SECRET environment variable in production!
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change'
const COOKIE = 'wl_token'
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 90 * 24 * 60 * 60 * 1000,
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '90d' })
}

export function setTokenCookie(res, payload) {
  const token = signToken(payload)
  const secure = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE, token, { ...COOKIE_OPTS, secure })
}

export function clearTokenCookie(res) {
  res.clearCookie(COOKIE)
}

// Sets req.user if a valid token is present, but never fails
export function optionalAuth(req, res, next) {
  const token = req.cookies?.[COOKIE]
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET) } catch {}
  }
  next()
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

// Returns the user's role for a member, or null if no access
export async function getMemberRole(db, memberId, userId) {
  const row = await db('member_access')
    .where({ member_id: memberId, user_id: userId })
    .whereNotNull('role')
    .first()
  return row?.role || null
}

const ROLE_LEVEL = { viewer: 1, editor: 2, admin: 3 }

export async function assertMemberAccess(db, memberId, userId, minRole) {
  const role = await getMemberRole(db, memberId, userId)
  if (!role || ROLE_LEVEL[role] < ROLE_LEVEL[minRole]) {
    return false
  }
  return true
}
