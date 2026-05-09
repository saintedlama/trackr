import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrations.js';
import { createAccountStore } from '../account/store.js';
import { createTrackerStore } from '../tracker/store.js';

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

runMigrations(db);

export const accounts = createAccountStore(db);
export const trackers = createTrackerStore(db);
