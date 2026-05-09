import { Router } from 'express';
import { accounts } from '../db/index.js';
const { getUserByUsername, getUser, createUser, getUserCount, assignOrphanTrackers } = accounts;
import { hashPassword, verifyPassword } from './passwords.js';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function getTokenCookie(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : null;
}

export function createAuthRouter(jwt) {
  const router = Router();

  router.get('/api/me', async (req, res) => {
    const payload = await jwt.verifyToken(getTokenCookie(req));
    if (!payload) {
      return res.json({ authenticated: false, setupRequired: getUserCount() === 0 });
    }
    const user = getUser(payload.userId);
    if (!user) {
      res.clearCookie('token');
      return res.json({ authenticated: false, setupRequired: false });
    }
    res.json({ authenticated: true, id: user.id, username: user.username, role: user.role });
  });

  router.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = getUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'invalid credentials' });

    res.cookie('token', await jwt.signToken({ userId: user.id, role: user.role }), COOKIE_OPTS);
    res.json({ id: user.id, username: user.username, role: user.role });
  });

  router.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
  });

  router.post('/api/setup', async (req, res) => {
    if (getUserCount() > 0) return res.status(403).json({ error: 'already configured' });

    const { username, password } = req.body || {};
    if (!username?.trim()) return res.status(400).json({ error: 'username required' });
    if (!password) return res.status(400).json({ error: 'password required' });

    const hash = await hashPassword(password);
    const id = createUser(username.trim(), hash, 'admin');
    assignOrphanTrackers(id);

    res.cookie('token', await jwt.signToken({ userId: id, role: 'admin' }), COOKIE_OPTS);
    res.status(201).json({ id, username: username.trim(), role: 'admin' });
  });

  return router;
}
