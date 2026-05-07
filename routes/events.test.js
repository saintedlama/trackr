import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, createTracker } = useServer();

test('POST /api/trackers/:id/events creates an event', async () => {
  const tracker = await createTracker();
  const { status, body } = await post(`/api/trackers/${tracker.id}/events`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});

test('POST /api/trackers/:id/events returns 404 for unknown tracker', async () => {
  const { status } = await post('/api/trackers/99999/events');
  assert.equal(status, 404);
});

test('GET /api/trackers/:id/events returns empty array for new tracker', async () => {
  const tracker = await createTracker();
  const { status, body } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(status, 200);
  assert.deepEqual(body, []);
});

test('GET /api/trackers/:id/events returns 404 for unknown tracker', async () => {
  const { status } = await req('/api/trackers/99999/events');
  assert.equal(status, 404);
});

test('GET /api/trackers/:id/events groups events by day', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);

  const { status, body } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].count, 3);
  assert.ok(Array.isArray(body[0].times));
  assert.equal(body[0].times.length, 3);
  assert.ok(typeof body[0].day === 'string');
});

test('GET /api/trackers/:id/events times are HH:MM:SS strings', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);

  const { body } = await req(`/api/trackers/${tracker.id}/events`);
  assert.match(body[0].times[0], /^\d{2}:\d{2}:\d{2}$/);
});
