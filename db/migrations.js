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
    name: '006_add_goal_period_to_trackers',
    run: (db) => db.exec("ALTER TABLE trackers ADD COLUMN goal_period TEXT NOT NULL DEFAULT 'daily'"),
  },
];

export function runMigrations(db) {
  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map(r => r.name)
  );
  for (const { name, run } of migrations) {
    if (applied.has(name)) continue;
    run(db);
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
  }
}
