import { Router } from 'express';
import { getTracker, createEvent, getEventsByDay, deleteEvent, setEventReason, getReasons } from '../db.js';

const router = Router();

router.post('/api/trackers/:id/events', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ ok: false });
  const id = createEvent(tracker.id);
  res.json({ ok: true, id });
});

router.get('/api/trackers/:id/events', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ ok: false });
  res.json(getEventsByDay(tracker.id));
});

router.get('/api/trackers/:id/events/reasons', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  res.json(getReasons(tracker.id));
});

router.patch('/api/trackers/:id/events/:eventId', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  const reason = req.body?.reason ?? null;
  if (reason !== null && typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason must be a string or null' });
  }
  setEventReason(req.params.eventId, tracker.id, reason === '' ? null : reason);
  res.json({ ok: true });
});

router.delete('/api/trackers/:id/events/:eventId', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  deleteEvent(req.params.eventId, tracker.id);
  res.json({ ok: true });
});

export default router;
