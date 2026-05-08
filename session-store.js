import { Store } from 'express-session';

export class SqliteStore extends Store {
  constructor(db) {
    super();
    this._get     = db.prepare('SELECT data FROM sessions WHERE sid = ? AND expires > ?');
    this._set     = db.prepare(`
      INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires
    `);
    this._destroy = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this._prune   = db.prepare('DELETE FROM sessions WHERE expires <= ?');

    // Prune expired sessions every minute (unref so it doesn't block process exit).
    setInterval(() => this._prune.run(Date.now()), 60_000).unref();
  }

  get(sid, cb) {
    try {
      const row = this._get.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.data) : null);
    } catch (e) { cb(e); }
  }

  set(sid, session, cb) {
    const expires = session.cookie?.expires
      ? new Date(session.cookie.expires).getTime()
      : Date.now() + 7 * 24 * 60 * 60 * 1000;
    try {
      this._set.run(sid, JSON.stringify(session), expires);
      cb(null);
    } catch (e) { cb(e); }
  }

  destroy(sid, cb) {
    try {
      this._destroy.run(sid);
      cb(null);
    } catch (e) { cb(e); }
  }

  touch(sid, session, cb) {
    this.set(sid, session, cb);
  }
}
