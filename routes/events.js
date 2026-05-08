import { Router } from 'express';
import { getTracker, createEvent, getEventsByDay, deleteEvent } from '../db.js';

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

router.delete('/api/trackers/:id/events/:eventId', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  deleteEvent(req.params.eventId, tracker.id);
  res.json({ ok: true });
});

export default router;
