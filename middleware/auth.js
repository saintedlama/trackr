export function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'unauthenticated' });
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}
