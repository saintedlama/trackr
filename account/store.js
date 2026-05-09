import { db } from '../db/index.js';

const stmts = {
  getUsers:             db.prepare('SELECT id, username, role, created_at AS createdAt FROM users ORDER BY created_at ASC'),
  getUser:              db.prepare('SELECT id, username, role FROM users WHERE id = ?'),
  getUserByUsername:    db.prepare('SELECT id, username, password_hash AS passwordHash, role FROM users WHERE username = ?'),
  createUser:           db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'),
  deleteUser:           db.prepare('DELETE FROM users WHERE id = ?'),
  updateUserRole:       db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  updateUserPassword:   db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  getUserCount:         db.prepare('SELECT COUNT(*) AS count FROM users'),
  assignOrphanTrackers: db.prepare('UPDATE trackers SET user_id = ? WHERE user_id IS NULL'),
};

export const accounts = {
  getUsers() {
    return stmts.getUsers.all();
  },
  getUser(id) {
    return stmts.getUser.get(id) ?? null;
  },
  getUserByUsername(username) {
    return stmts.getUserByUsername.get(username) ?? null;
  },
  createUser(username, passwordHash, role = 'user') {
    return stmts.createUser.run(username, passwordHash, role).lastInsertRowid;
  },
  deleteUser(id) {
    stmts.deleteUser.run(id);
  },
  updateUserRole(id, role) {
    stmts.updateUserRole.run(role, id);
  },
  updateUserPassword(id, passwordHash) {
    stmts.updateUserPassword.run(passwordHash, id);
  },
  getUserCount() {
    return stmts.getUserCount.get().count;
  },
  assignOrphanTrackers(userId) {
    stmts.assignOrphanTrackers.run(userId);
  },
};
