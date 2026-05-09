import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, unauthed } = useServer();

test('GET /api/me when not authenticated returns unauthenticated', async () => {
  const { status, body } = await unauthed('/api/me');
  assert.equal(status, 200);
  assert.equal(body.authenticated, false);
  assert.equal(body.setupRequired, false);
});

test('GET /api/me when authenticated returns user info', async () => {
  const { status, body } = await req('/api/me');
  assert.equal(status, 200);
  assert.equal(body.authenticated, true);
  assert.equal(body.username, 'testadmin');
  assert.equal(body.role, 'admin');
  assert.ok(typeof body.id === 'number');
});

test('POST /api/login with valid credentials returns user and sets cookie', async () => {
  const { status, body, headers } = await unauthed('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'testpass123' }),
  });
  assert.equal(status, 200);
  assert.equal(body.username, 'testadmin');
  assert.equal(body.role, 'admin');
  assert.ok(headers.get('set-cookie')?.startsWith('token='));
});

test('POST /api/login with wrong password returns 401', async () => {
  const { status } = await unauthed('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'wrong' }),
  });
  assert.equal(status, 401);
});

test('POST /api/login with unknown username returns 401', async () => {
  const { status } = await unauthed('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nobody', password: 'testpass123' }),
  });
  assert.equal(status, 401);
});

test('POST /api/login with missing password returns 400', async () => {
  const { status } = await unauthed('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin' }),
  });
  assert.equal(status, 400);
});

test('POST /api/login with missing username returns 400', async () => {
  const { status } = await unauthed('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'testpass123' }),
  });
  assert.equal(status, 400);
});

test('POST /api/logout returns ok', async () => {
  const { status, body } = await post('/api/logout');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});

test('POST /api/setup when already configured returns 403', async () => {
  const { status } = await unauthed('/api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'second', password: 'pass' }),
  });
  assert.equal(status, 403);
});

test('GET /api/me with a tampered token returns unauthenticated', async () => {
  const { status, body } = await unauthed('/api/me', {
    headers: { Cookie: 'token=totally.invalid.token' },
  });
  assert.equal(status, 200);
  assert.equal(body.authenticated, false);
});

test('GET /api/trackers with a tampered token returns 401', async () => {
  const { status } = await unauthed('/api/trackers', {
    headers: { Cookie: 'token=totally.invalid.token' },
  });
  assert.equal(status, 401);
});
