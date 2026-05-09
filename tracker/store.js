import { db } from '../db/index.js';

const stmts = {
  getTrackers: db.prepare(`
    SELECT t.id, t.name, t.goal, t.count_goal AS countGoal, t.goal_period AS goalPeriod,
      COALESCE((
        SELECT COUNT(*) FROM events
        WHERE list_id = t.id
        AND (
          (t.goal_period = 'daily'   AND DATE(tracked_at) = ?) OR
          (t.goal_period = 'weekly'  AND DATE(tracked_at) >= ? AND DATE(tracked_at) <= ?) OR
          (t.goal_period = 'monthly' AND strftime('%Y-%m', tracked_at) = strftime('%Y-%m', ?)) OR
          (t.goal_period = 'yearly'  AND strftime('%Y', tracked_at) = strftime('%Y', ?))
        )
      ), 0) AS periodCount
    FROM trackers t
    WHERE t.user_id = ?
    ORDER BY t.name ASC
  `),
  getTracker:     db.prepare('SELECT id, name, goal, count_goal AS countGoal, goal_period AS goalPeriod FROM trackers WHERE id = ? AND user_id = ?'),
  createTracker:  db.prepare('INSERT INTO trackers (name, user_id) VALUES (?, ?)'),
  renameTracker:  db.prepare('UPDATE trackers SET name = ? WHERE id = ?'),
  setGoal:        db.prepare('UPDATE trackers SET goal = ? WHERE id = ?'),
  setCountGoal:   db.prepare('UPDATE trackers SET count_goal = ? WHERE id = ?'),
  setGoalPeriod:  db.prepare("UPDATE trackers SET goal_period = ? WHERE id = ?"),
  deleteTracker:  db.prepare('DELETE FROM trackers WHERE id = ?'),

  getEvents: db.prepare(`
    SELECT id, strftime('%Y-%m-%dT%H:%M:%SZ', tracked_at) AS trackedAt, reason
    FROM events
    WHERE list_id = ?
    ORDER BY tracked_at ASC
  `),
  createEvent:    db.prepare('INSERT INTO events (list_id) VALUES (?)'),
  deleteEvent:    db.prepare('DELETE FROM events WHERE id = ? AND list_id = ?'),
  setEventReason: db.prepare('UPDATE events SET reason = ? WHERE id = ? AND list_id = ?'),
  getReasons:     db.prepare(`
    SELECT reason, COUNT(*) AS count
    FROM events
    WHERE list_id = ? AND reason IS NOT NULL AND reason != ''
    GROUP BY reason
    ORDER BY count DESC
  `),
};

export const trackers = {
  getTrackers(userId, date, weekStart) {
    return stmts.getTrackers.all(date, weekStart, date, date, date, userId);
  },
  getTracker(id, userId) {
    return stmts.getTracker.get(id, userId) ?? null;
  },
  createTracker(name, userId) {
    return stmts.createTracker.run(name, userId).lastInsertRowid;
  },
  renameTracker(id, name) {
    stmts.renameTracker.run(name, id);
  },
  setTrackerGoal(id, goal) {
    stmts.setGoal.run(goal, id);
  },
  setTrackerCountGoal(id, countGoal) {
    stmts.setCountGoal.run(countGoal, id);
  },
  setTrackerGoalPeriod(id, goalPeriod) {
    stmts.setGoalPeriod.run(goalPeriod, id);
  },
  deleteTracker(id) {
    stmts.deleteTracker.run(id);
  },

  getEvents(trackerId) {
    return stmts.getEvents.all(trackerId).map(r => ({ ...r, reason: r.reason ?? null }));
  },
  createEvent(trackerId) {
    return stmts.createEvent.run(trackerId).lastInsertRowid;
  },
  deleteEvent(eventId, trackerId) {
    stmts.deleteEvent.run(eventId, trackerId);
  },
  setEventReason(eventId, trackerId, reason) {
    stmts.setEventReason.run(reason, eventId, trackerId);
  },
  getReasons(trackerId) {
    return stmts.getReasons.all(trackerId);
  },
};
