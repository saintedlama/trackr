import { Router } from 'express';
import { getTracker, createEvent, getEventsByDay } from '../db.js';

const router = Router();

router.post('/api/trackers/:id/events', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ ok: false });
  createEvent(tracker.id);
  res.json({ ok: true });
});

router.get('/api/trackers/:id/events', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ ok: false });
  res.json(getEventsByDay(tracker.id));
});

export default router;
