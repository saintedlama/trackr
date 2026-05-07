import { Router } from 'express';
import { getLists, getList, createList, renameList, deleteList } from '../db.js';

const router = Router();

router.get('/api/lists', (req, res) => {
  res.json(getLists());
});

router.post('/api/lists', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  if (name.length > 40) return res.status(400).json({ error: 'name too long' });
  const id = createList(name);
  res.status(201).json({ id, name });
});

router.get('/api/lists/:id', (req, res) => {
  const list = getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'not found' });
  res.json(list);
});

router.patch('/api/lists/:id', (req, res) => {
  const list = getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'not found' });
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  if (name.length > 40) return res.status(400).json({ error: 'name too long' });
  renameList(list.id, name);
  res.json({ id: list.id, name });
});

router.delete('/api/lists/:id', (req, res) => {
  const list = getList(req.params.id);
  if (!list) return res.status(404).json({ error: 'not found' });
  deleteList(list.id);
  res.json({ ok: true });
});

export default router;
