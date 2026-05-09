function getTokenCookie(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : null;
}

export function createAuthMiddleware(jwt) {
  async function requireAuth(req, res, next) {
    const payload = await jwt.verifyToken(getTokenCookie(req));
    if (!payload) return res.status(401).json({ error: 'unauthenticated' });
    req.user = payload;
    next();
  }

  async function requireAdmin(req, res, next) {
    const payload = await jwt.verifyToken(getTokenCookie(req));
    if (!payload) return res.status(401).json({ error: 'unauthenticated' });
    if (payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    req.user = payload;
    next();
  }

  return { requireAuth, requireAdmin };
}
