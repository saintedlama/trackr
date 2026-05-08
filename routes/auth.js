import { Router } from 'express';
import { getUserByUsername, getUser, createUser, getUserCount, assignOrphanTrackers } from '../db.js';
import { hashPassword, verifyPassword } from '../auth.js';

const router = Router();

router.get('/api/me', (req, res) => {
  if (!req.session?.userId) {
    return res.json({ authenticated: false, setupRequired: getUserCount() === 0 });
  }
  const user = getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
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

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'session error' });
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.post('/api/setup', async (req, res) => {
  if (getUserCount() > 0) return res.status(403).json({ error: 'already configured' });

  const { username, password } = req.body || {};
  if (!username?.trim()) return res.status(400).json({ error: 'username required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });

  const hash = await hashPassword(password);
  const id = createUser(username.trim(), hash, 'admin');
  assignOrphanTrackers(id);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'session error' });
    req.session.userId = id;
    req.session.role = 'admin';
    res.status(201).json({ id, username: username.trim(), role: 'admin' });
  });
});

export default router;
