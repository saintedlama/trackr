import { Router } from 'express';
import { trackers as db } from './store.js';
const {
  getTrackers, getTracker, createTracker, renameTracker,
  setTrackerGoal, setTrackerCountGoal, setTrackerGoalPeriod, deleteTracker,
  getEvents, createEvent, deleteEvent, setEventReason, getReasons,
} = db;

function weekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d.toLocaleDateString('en-CA');
}

export function createTrackerRouter({ requireAuth }) {
  const router = Router();
  router.use(requireAuth);

  router.get('/api/trackers', (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    res.json(getTrackers(req.user.userId, date, weekStart(date)));
  });

  router.post('/api/trackers', (req, res) => {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    if (name.length > 40) return res.status(400).json({ error: 'name too long' });
    const id = createTracker(name, req.user.userId);
    res.status(201).json({ id, name, goal: 'increase', countGoal: null, goalPeriod: 'daily' });
  });

  router.get('/api/trackers/:id', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ error: 'not found' });
    res.json(tracker);
  });

  router.patch('/api/trackers/:id', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ error: 'not found' });

    let { name, goal, countGoal, goalPeriod } = req.body || {};

    if (name !== undefined) {
      name = name.trim();
      if (!name) return res.status(400).json({ error: 'name required' });
      if (name.length > 40) return res.status(400).json({ error: 'name too long' });
      renameTracker(tracker.id, name);
    } else {
      name = tracker.name;
    }

    if (goal !== undefined) {
      if (!['increase', 'decrease'].includes(goal)) return res.status(400).json({ error: 'invalid goal' });
      setTrackerGoal(tracker.id, goal);
    } else {
      goal = tracker.goal;
    }

    if (countGoal !== undefined) {
      if (countGoal !== null && (!Number.isInteger(countGoal) || countGoal < 1)) {
        return res.status(400).json({ error: 'countGoal must be a positive integer or null' });
      }
      setTrackerCountGoal(tracker.id, countGoal);
    } else {
      countGoal = tracker.countGoal;
    }

    if (goalPeriod !== undefined) {
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(goalPeriod)) return res.status(400).json({ error: 'invalid goalPeriod' });
      setTrackerGoalPeriod(tracker.id, goalPeriod);
    } else {
      goalPeriod = tracker.goalPeriod;
    }

    res.json({ id: tracker.id, name, goal, countGoal, goalPeriod });
  });

  router.delete('/api/trackers/:id', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ error: 'not found' });
    deleteTracker(tracker.id);
    res.json({ ok: true });
  });

  router.post('/api/trackers/:id/events', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ ok: false });
    const id = createEvent(tracker.id);
    res.json({ ok: true, id });
  });

  router.get('/api/trackers/:id/events', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ ok: false });
    res.json(getEvents(tracker.id));
  });

  router.get('/api/trackers/:id/events/reasons', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ error: 'not found' });
    res.json(getReasons(tracker.id));
  });

  router.patch('/api/trackers/:id/events/:eventId', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ error: 'not found' });
    const reason = req.body?.reason ?? null;
    if (reason !== null && typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason must be a string or null' });
    }
    setEventReason(req.params.eventId, tracker.id, reason === '' ? null : reason);
    res.json({ ok: true });
  });

  router.delete('/api/trackers/:id/events/:eventId', (req, res) => {
    const tracker = getTracker(req.params.id, req.user.userId);
    if (!tracker) return res.status(404).json({ error: 'not found' });
    deleteEvent(req.params.eventId, tracker.id);
    res.json({ ok: true });
  });

  return router;
}
