import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from './setup.js';

const { req, post, createList } = useServer();

test('POST /api/lists/:id/events creates an event', async () => {
  const list = await createList();
  const { status, body } = await post(`/api/lists/${list.id}/events`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});

test('POST /api/lists/:id/events returns 404 for unknown list', async () => {
  const { status } = await post('/api/lists/99999/events');
  assert.equal(status, 404);
});

test('GET /api/lists/:id/events returns empty array for new list', async () => {
  const list = await createList();
  const { status, body } = await req(`/api/lists/${list.id}/events`);
  assert.equal(status, 200);
  assert.deepEqual(body, []);
});

test('GET /api/lists/:id/events returns 404 for unknown list', async () => {
  const { status } = await req('/api/lists/99999/events');
  assert.equal(status, 404);
});

test('GET /api/lists/:id/events groups events by day', async () => {
  const list = await createList();
  await post(`/api/lists/${list.id}/events`);
  await post(`/api/lists/${list.id}/events`);
  await post(`/api/lists/${list.id}/events`);

  const { status, body } = await req(`/api/lists/${list.id}/events`);
  assert.equal(status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].count, 3);
  assert.ok(Array.isArray(body[0].times));
  assert.equal(body[0].times.length, 3);
  assert.ok(typeof body[0].day === 'string');
});

test('GET /api/lists/:id/events times are HH:MM:SS strings', async () => {
  const list = await createList();
  await post(`/api/lists/${list.id}/events`);

  const { body } = await req(`/api/lists/${list.id}/events`);
  assert.match(body[0].times[0], /^\d{2}:\d{2}:\d{2}$/);
});
