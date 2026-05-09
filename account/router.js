import { Router } from 'express';
import { accounts } from './store.js';
const { getUsers, createUser, deleteUser, updateUserRole, updateUserPassword } = accounts;
import { hashPassword } from '../auth/passwords.js';

export function createAdminRouter({ requireAdmin }) {
  const router = Router();
  router.use(requireAdmin);

  router.get('/api/admin/users', (req, res) => {
    res.json(getUsers());
  });

  router.post('/api/admin/users', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username?.trim()) return res.status(400).json({ error: 'username required' });
    if (!password) return res.status(400).json({ error: 'password required' });

    try {
      const hash = await hashPassword(password);
      const id = createUser(username.trim(), hash);
      res.status(201).json({ id, username: username.trim(), role: 'user' });
    } catch (e) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'username already taken' });
      throw e;
    }
  });

  router.delete('/api/admin/users/:id', (req, res) => {
    if (Number(req.params.id) === req.user.userId) {
      return res.status(400).json({ error: 'cannot delete your own account' });
    }
    deleteUser(req.params.id);
    res.json({ ok: true });
  });

  router.patch('/api/admin/users/:id/role', (req, res) => {
    if (Number(req.params.id) === req.user.userId) {
      return res.status(400).json({ error: 'cannot change your own role' });
    }
    const { role } = req.body || {};
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'invalid role' });
    updateUserRole(req.params.id, role);
    res.json({ ok: true });
  });

  router.post('/api/admin/users/:id/password', async (req, res) => {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'password required' });
    const hash = await hashPassword(password);
    updateUserPassword(req.params.id, hash);
    res.json({ ok: true });
  });

  return router;
}
