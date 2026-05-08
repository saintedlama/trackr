import { Router } from 'express';
import { getTrackers, getTracker, createTracker, renameTracker, setTrackerGoal, deleteTracker } from '../db.js';

const router = Router();

router.get('/api/trackers', (req, res) => {
  res.json(getTrackers());
});

router.post('/api/trackers', (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  if (name.length > 40) return res.status(400).json({ error: 'name too long' });
  const id = createTracker(name);
  res.status(201).json({ id, name, goal: 'increase' });
});

router.get('/api/trackers/:id', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  res.json(tracker);
});

router.patch('/api/trackers/:id', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });

  let { name, goal } = req.body || {};

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

  res.json({ id: tracker.id, name, goal });
});

router.delete('/api/trackers/:id', (req, res) => {
  const tracker = getTracker(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'not found' });
  deleteTracker(tracker.id);
  res.json({ ok: true });
});

export default router;
