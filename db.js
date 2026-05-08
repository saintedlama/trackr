import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || './trackr.db';
export const db = new DatabaseSync(DB_PATH);

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
  {
    name: '002_add_count_goal_to_trackers',
    run: (db) => db.exec('ALTER TABLE trackers ADD COLUMN count_goal INTEGER'),
  },
  {
    name: '003_add_reason_to_events',
    run: (db) => db.exec('ALTER TABLE events ADD COLUMN reason TEXT'),
  },
  {
    name: '004_add_users_table',
    run: (db) => db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        role          TEXT    NOT NULL DEFAULT 'user',
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
  },
  {
    name: '005_add_user_id_to_trackers',
    run: (db) => db.exec('ALTER TABLE trackers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE'),
  },
  {
    name: '006_add_sessions_table',
    run: (db) => db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid     TEXT    PRIMARY KEY,
        data    TEXT    NOT NULL,
        expires INTEGER NOT NULL
      )
    `),
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

// Prepared after migrations so all columns are visible to the query planner.
const stmts = {
  // Users
  getUsers:             db.prepare('SELECT id, username, role, created_at AS createdAt FROM users ORDER BY created_at ASC'),
  getUser:              db.prepare('SELECT id, username, role FROM users WHERE id = ?'),
  getUserByUsername:    db.prepare('SELECT id, username, password_hash AS passwordHash, role FROM users WHERE username = ?'),
  createUser:           db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'),
  deleteUser:           db.prepare('DELETE FROM users WHERE id = ?'),
  updateUserRole:       db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  updateUserPassword:   db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  getUserCount:         db.prepare('SELECT COUNT(*) AS count FROM users'),
  assignOrphanTrackers: db.prepare('UPDATE trackers SET user_id = ? WHERE user_id IS NULL'),

  // Trackers (scoped to user)
  getTrackers: db.prepare(`
    SELECT t.id, t.name, t.goal, t.count_goal AS countGoal,
      COALESCE((SELECT COUNT(*) FROM events WHERE list_id = t.id AND DATE(tracked_at) = DATE('now')), 0) AS todayCount
    FROM trackers t
    WHERE t.user_id = ?
    ORDER BY t.name ASC
  `),
  getTracker:     db.prepare('SELECT id, name, goal, count_goal AS countGoal FROM trackers WHERE id = ? AND user_id = ?'),
  createTracker:  db.prepare('INSERT INTO trackers (name, user_id) VALUES (?, ?)'),
  renameTracker:  db.prepare('UPDATE trackers SET name = ? WHERE id = ?'),
  setGoal:        db.prepare('UPDATE trackers SET goal = ? WHERE id = ?'),
  setCountGoal:   db.prepare('UPDATE trackers SET count_goal = ? WHERE id = ?'),
  deleteTracker:  db.prepare('DELETE FROM trackers WHERE id = ?'),

  // Events
  createEvent:    db.prepare('INSERT INTO events (list_id) VALUES (?)'),
  getEventsRaw:   db.prepare(`
    SELECT id, DATE(tracked_at) AS day, TIME(tracked_at) AS time, reason
    FROM events
    WHERE list_id = ?
    ORDER BY tracked_at ASC
  `),
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

// ─── Users ────────────────────────────────────────────────────────────────────

export function getUsers() {
  return stmts.getUsers.all();
}

export function getUser(id) {
  return stmts.getUser.get(id) ?? null;
}

export function getUserByUsername(username) {
  return stmts.getUserByUsername.get(username) ?? null;
}

export function createUser(username, passwordHash, role = 'user') {
  return stmts.createUser.run(username, passwordHash, role).lastInsertRowid;
}

export function deleteUser(id) {
  stmts.deleteUser.run(id);
}

export function updateUserRole(id, role) {
  stmts.updateUserRole.run(role, id);
}

export function updateUserPassword(id, passwordHash) {
  stmts.updateUserPassword.run(passwordHash, id);
}

export function getUserCount() {
  return stmts.getUserCount.get().count;
}

export function assignOrphanTrackers(userId) {
  stmts.assignOrphanTrackers.run(userId);
}

// ─── Trackers ─────────────────────────────────────────────────────────────────

export function getTrackers(userId) {
  return stmts.getTrackers.all(userId);
}

export function getTracker(id, userId) {
  return stmts.getTracker.get(id, userId) ?? null;
}

export function createTracker(name, userId) {
  return stmts.createTracker.run(name, userId).lastInsertRowid;
}

export function renameTracker(id, name) {
  stmts.renameTracker.run(name, id);
}

export function setTrackerGoal(id, goal) {
  stmts.setGoal.run(goal, id);
}

export function setTrackerCountGoal(id, countGoal) {
  stmts.setCountGoal.run(countGoal, id);
}

export function deleteTracker(id) {
  stmts.deleteTracker.run(id);
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function createEvent(trackerId) {
  return stmts.createEvent.run(trackerId).lastInsertRowid;
}

export function getEventsByDay(trackerId) {
  const rows = stmts.getEventsRaw.all(trackerId);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.day)) map.set(row.day, []);
    map.get(row.day).push({ id: row.id, time: row.time, reason: row.reason ?? null });
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, times]) => ({ day, count: times.length, times }));
}

export function deleteEvent(eventId, trackerId) {
  stmts.deleteEvent.run(eventId, trackerId);
}

export function setEventReason(eventId, trackerId, reason) {
  stmts.setEventReason.run(reason, eventId, trackerId);
}

export function getReasons(trackerId) {
  return stmts.getReasons.all(trackerId);
}
