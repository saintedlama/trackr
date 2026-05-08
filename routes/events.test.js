import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, del, createTracker } = useServer();

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

test('GET /api/trackers/:id/events times are objects with id and HH:MM:SS time', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);

  const { body } = await req(`/api/trackers/${tracker.id}/events`);
  const entry = body[0].times[0];
  assert.ok(typeof entry.id === 'number');
  assert.match(entry.time, /^\d{2}:\d{2}:\d{2}$/);
});

test('DELETE /api/trackers/:id/events/:eventId removes the event', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);

  const { body: before } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(before[0].count, 2);
  const eventId = before[0].times[0].id;

  const { status, body } = await del(`/api/trackers/${tracker.id}/events/${eventId}`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);

  const { body: after } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(after[0].count, 1);
  assert.ok(after[0].times.every(t => t.id !== eventId));
});

test('DELETE /api/trackers/:id/events/:eventId returns 404 for unknown tracker', async () => {
  const { status } = await del('/api/trackers/99999/events/1');
  assert.equal(status, 404);
});

test('DELETE /api/trackers/:id/events/:eventId silently ignores unknown event id', async () => {
  const tracker = await createTracker();
  const { status, body } = await del(`/api/trackers/${tracker.id}/events/99999`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});
