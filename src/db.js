import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || './trackr.db';
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS lists (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id    INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    tracked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const stmts = {
  getLists:      db.prepare('SELECT id, name FROM lists ORDER BY name ASC'),
  getList:       db.prepare('SELECT id, name FROM lists WHERE id = ?'),
  createList:    db.prepare('INSERT INTO lists (name) VALUES (?)'),
  createEvent:   db.prepare('INSERT INTO events (list_id) VALUES (?)'),
  getEventsByDay: db.prepare(`
    SELECT DATE(tracked_at) AS day,
           COUNT(*)         AS count,
           GROUP_CONCAT(TIME(tracked_at), ',') AS times
    FROM events
    WHERE list_id = ?
    GROUP BY DATE(tracked_at)
    ORDER BY day DESC
  `),
};

export function getLists() {
  return stmts.getLists.all();
}

export function getList(id) {
  return stmts.getList.get(id) ?? null;
}

export function createList(name) {
  const result = stmts.createList.run(name);
  return result.lastInsertRowid;
}

export function createEvent(listId) {
  stmts.createEvent.run(listId);
}

export function getEventsByDay(listId) {
  return stmts.getEventsByDay.all(listId).map(row => ({
    day: row.day,
    count: row.count,
    times: row.times ? row.times.split(',') : [],
  }));
}
