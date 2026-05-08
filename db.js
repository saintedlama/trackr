import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || './trackr.db';
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS migrations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trackers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id    INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    tracked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrations = [
  {
    name: '001_add_goal_to_trackers',
    run: (db) => db.exec("ALTER TABLE trackers ADD COLUMN goal TEXT NOT NULL DEFAULT 'increase'"),
  },
];

const applied = new Set(
  db.prepare('SELECT name FROM migrations').all().map(r => r.name)
);

for (const { name, run } of migrations) {
  if (applied.has(name)) continue;
  run(db);
  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
}

const stmts = {
  getTrackers:    db.prepare(`
    SELECT t.id, t.name, t.goal,
      COALESCE((SELECT COUNT(*) FROM events WHERE list_id = t.id AND DATE(tracked_at) = DATE('now')), 0) AS todayCount
    FROM trackers t
    ORDER BY t.name ASC
  `),
  getTracker:     db.prepare('SELECT id, name, goal FROM trackers WHERE id = ?'),
  createTracker:  db.prepare('INSERT INTO trackers (name) VALUES (?)'),
  renameTracker:  db.prepare('UPDATE trackers SET name = ? WHERE id = ?'),
  setGoal:        db.prepare('UPDATE trackers SET goal = ? WHERE id = ?'),
  deleteTracker:  db.prepare('DELETE FROM trackers WHERE id = ?'),
  createEvent:    db.prepare('INSERT INTO events (list_id) VALUES (?)'),
  getEventsRaw:   db.prepare(`
    SELECT id, DATE(tracked_at) AS day, TIME(tracked_at) AS time
    FROM events
    WHERE list_id = ?
    ORDER BY tracked_at ASC
  `),
  deleteEvent:    db.prepare('DELETE FROM events WHERE id = ? AND list_id = ?'),
};

export function getTrackers() {
  return stmts.getTrackers.all();
}

export function getTracker(id) {
  return stmts.getTracker.get(id) ?? null;
}

export function createTracker(name) {
  const result = stmts.createTracker.run(name);
  return result.lastInsertRowid;
}

export function renameTracker(id, name) {
  stmts.renameTracker.run(name, id);
}

export function setTrackerGoal(id, goal) {
  stmts.setGoal.run(goal, id);
}

export function deleteTracker(id) {
  stmts.deleteTracker.run(id);
}

export function createEvent(trackerId) {
  stmts.createEvent.run(trackerId);
}

export function getEventsByDay(trackerId) {
  const rows = stmts.getEventsRaw.all(trackerId);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.day)) map.set(row.day, []);
    map.get(row.day).push({ id: row.id, time: row.time });
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, times]) => ({ day, count: times.length, times }));
}

export function deleteEvent(eventId, trackerId) {
  stmts.deleteEvent.run(eventId, trackerId);
}
