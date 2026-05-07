import { Router } from 'express';
import { getList, createEvent, getEventsByDay } from '../db.js';

const router = Router();

router.post('/api/lists/:id/events', (req, res) => {
  const list = getList(req.params.id);
  if (!list) return res.status(404).json({ ok: false });
  createEvent(list.id);
  res.json({ ok: true });
});

router.get('/api/lists/:id/events', (req, res) => {
  const list = getList(req.params.id);
  if (!list) return res.status(404).json({ ok: false });
  res.json(getEventsByDay(list.id));
});

export default router;
