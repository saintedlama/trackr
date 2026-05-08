import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTrackers, getTracker, createTracker, renameTracker, setTrackerGoal, setTrackerCountGoal, deleteTracker } from '../db.js';

const router = Router();
router.use(requireAuth);

router.get('/api/trackers', (req, res) => {
  res.json(getTrackers(req.session.userId));
});

router.post('/api/trackers', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  if (name.length > 40) return res.status(400).json({ error: 'name too long' });
  const id = createTracker(name, req.session.userId);
  res.status(201).json({ id, name, goal: 'increase', countGoal: null });
});

router.get('/api/trackers/:id', (req, res) => {
  const tracker = getTracker(req.params.id, req.session.userId);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  res.json(tracker);
});

router.patch('/api/trackers/:id', (req, res) => {
  const tracker = getTracker(req.params.id, req.session.userId);
  if (!tracker) return res.status(404).json({ error: 'not found' });

  let { name, goal, countGoal } = req.body || {};

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

  res.json({ id: tracker.id, name, goal, countGoal });
});

router.delete('/api/trackers/:id', (req, res) => {
  const tracker = getTracker(req.params.id, req.session.userId);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  deleteTracker(tracker.id);
  res.json({ ok: true });
});

export default router;
