import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, patch, del, unauthed, reqAs, loginAs } = useServer();

// ─── helpers ─────────────────────────────────────────────────────────────────

function uniqueName(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function createUser(username = uniqueName(), password = 'pass') {
  const { body } = await post('/api/admin/users', { username, password });
  return { ...body, password };
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

test('GET /api/admin/users returns list including the admin', async () => {
  const { status, body } = await req('/api/admin/users');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  assert.ok(body.some(u => u.username === 'testadmin' && u.role === 'admin'));
});

test('GET /api/admin/users returns 401 without auth', async () => {
  const { status } = await unauthed('/api/admin/users');
  assert.equal(status, 401);
});

test('GET /api/admin/users returns 403 for non-admin user', async () => {
  const user = await createUser();
  const { cookie } = await loginAs(user.username, user.password);
  const { status } = await reqAs(cookie, '/api/admin/users');
  assert.equal(status, 403);
});

// ─── POST /api/admin/users ────────────────────────────────────────────────────

test('POST /api/admin/users creates a user with role user', async () => {
  const username = uniqueName();
  const { status, body } = await post('/api/admin/users', { username, password: 'pass' });
  assert.equal(status, 201);
  assert.ok(typeof body.id === 'number');
  assert.equal(body.username, username);
  assert.equal(body.role, 'user');
});

test('POST /api/admin/users returns 400 without username', async () => {
  const { status } = await post('/api/admin/users', { password: 'pass' });
  assert.equal(status, 400);
});

test('POST /api/admin/users returns 400 without password', async () => {
  const { status } = await post('/api/admin/users', { username: uniqueName() });
  assert.equal(status, 400);
});

test('POST /api/admin/users returns 409 for duplicate username', async () => {
  const username = uniqueName();
  await post('/api/admin/users', { username, password: 'pass' });
  const { status } = await post('/api/admin/users', { username, password: 'pass' });
  assert.equal(status, 409);
});

test('POST /api/admin/users returns 401 without auth', async () => {
  const { status } = await unauthed('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uniqueName(), password: 'pass' }),
  });
  assert.equal(status, 401);
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────

test('DELETE /api/admin/users/:id deletes the user', async () => {
  const user = await createUser();
  const { status, body } = await del(`/api/admin/users/${user.id}`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const { body: users } = await req('/api/admin/users');
  assert.ok(!users.some(u => u.id === user.id));
});

test('DELETE /api/admin/users/:id returns 400 when deleting own account', async () => {
  const { body: me } = await req('/api/me');
  const { status } = await del(`/api/admin/users/${me.id}`);
  assert.equal(status, 400);
});

test('DELETE /api/admin/users/:id returns 401 without auth', async () => {
  const user = await createUser();
  const { status } = await unauthed(`/api/admin/users/${user.id}`, { method: 'DELETE' });
  assert.equal(status, 401);
});

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────

test('PATCH /api/admin/users/:id/role promotes user to admin', async () => {
  const user = await createUser();
  const { status, body } = await patch(`/api/admin/users/${user.id}/role`, { role: 'admin' });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const { body: users } = await req('/api/admin/users');
  assert.equal(users.find(u => u.id === user.id).role, 'admin');
});

test('PATCH /api/admin/users/:id/role demotes admin to user', async () => {
  const user = await createUser();
  await patch(`/api/admin/users/${user.id}/role`, { role: 'admin' });
  const { status } = await patch(`/api/admin/users/${user.id}/role`, { role: 'user' });
  assert.equal(status, 200);
  const { body: users } = await req('/api/admin/users');
  assert.equal(users.find(u => u.id === user.id).role, 'user');
});

test('PATCH /api/admin/users/:id/role returns 400 when modifying own role', async () => {
  const { body: me } = await req('/api/me');
  const { status } = await patch(`/api/admin/users/${me.id}/role`, { role: 'user' });
  assert.equal(status, 400);
});

test('PATCH /api/admin/users/:id/role returns 400 with invalid role', async () => {
  const user = await createUser();
  const { status } = await patch(`/api/admin/users/${user.id}/role`, { role: 'superadmin' });
  assert.equal(status, 400);
});

test('PATCH /api/admin/users/:id/role returns 401 without auth', async () => {
  const user = await createUser();
  const { status } = await unauthed(`/api/admin/users/${user.id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' }),
  });
  assert.equal(status, 401);
});

// ─── POST /api/admin/users/:id/password ──────────────────────────────────────

test('POST /api/admin/users/:id/password resets the password', async () => {
  const username = uniqueName();
  const user = await createUser(username, 'oldpass');
  const { status, body } = await post(`/api/admin/users/${user.id}/password`, { password: 'newpass' });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const { status: loginStatus } = await loginAs(username, 'newpass');
  assert.equal(loginStatus, 200);
});

test('POST /api/admin/users/:id/password old password no longer works after reset', async () => {
  const username = uniqueName();
  const user = await createUser(username, 'oldpass');
  await post(`/api/admin/users/${user.id}/password`, { password: 'newpass' });
  const { status } = await loginAs(username, 'oldpass');
  assert.equal(status, 401);
});

test('POST /api/admin/users/:id/password returns 400 without password', async () => {
  const user = await createUser();
  const { status } = await post(`/api/admin/users/${user.id}/password`, {});
  assert.equal(status, 400);
});

test('POST /api/admin/users/:id/password returns 401 without auth', async () => {
  const user = await createUser();
  const { status } = await unauthed(`/api/admin/users/${user.id}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'newpass' }),
  });
  assert.equal(status, 401);
});
