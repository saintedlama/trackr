import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, patch, del, createTracker } = useServer();

async function postEvent(trackerId) {
  return post(`/api/trackers/${trackerId}/events`);
}

test('GET /api/trackers returns an array', async () => {
  const { status, body } = await req('/api/trackers');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('GET /api/trackers includes todayCount of 0 for new tracker', async () => {
  const tracker = await createTracker();
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.todayCount, 0);
});

test('GET /api/trackers todayCount increments with each event', async () => {
  const tracker = await createTracker();
  await postEvent(tracker.id);
  await postEvent(tracker.id);
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.todayCount, 2);
});

test('POST /api/trackers creates a tracker and returns 201', async () => {
  const { status, body } = await post('/api/trackers', { name: 'My Tracker' });
  assert.equal(status, 201);
  assert.ok(typeof body.id === 'number');
  assert.equal(body.name, 'My Tracker');
});

test('POST /api/trackers trims whitespace from name', async () => {
  const { status, body } = await post('/api/trackers', { name: '  Trimmed  ' });
  assert.equal(status, 201);
  assert.equal(body.name, 'Trimmed');
});

test('POST /api/trackers with empty name returns 400', async () => {
  const { status, body } = await post('/api/trackers', { name: '' });
  assert.equal(status, 400);
  assert.equal(body.error, 'name required');
});

test('POST /api/trackers with whitespace-only name returns 400', async () => {
  const { status } = await post('/api/trackers', { name: '   ' });
  assert.equal(status, 400);
});

test('POST /api/trackers with missing name returns 400', async () => {
  const { status } = await post('/api/trackers', {});
  assert.equal(status, 400);
});

test('POST /api/trackers with name over 40 chars returns 400', async () => {
  const { status, body } = await post('/api/trackers', { name: 'a'.repeat(41) });
  assert.equal(status, 400);
  assert.equal(body.error, 'name too long');
});

test('POST /api/trackers with name exactly 40 chars succeeds', async () => {
  const { status } = await post('/api/trackers', { name: 'a'.repeat(40) });
  assert.equal(status, 201);
});

test('GET /api/trackers/:id returns the tracker', async () => {
  const created = await createTracker('Fetch Me');
  const { status, body } = await req(`/api/trackers/${created.id}`);
  assert.equal(status, 200);
  assert.equal(body.id, created.id);
  assert.equal(body.name, 'Fetch Me');
});

test('GET /api/trackers/:id returns 404 for unknown id', async () => {
  const { status } = await req('/api/trackers/99999');
  assert.equal(status, 404);
});

test('PATCH /api/trackers/:id renames a tracker', async () => {
  const tracker = await createTracker('Old Name');
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { name: 'New Name' });
  assert.equal(status, 200);
  assert.equal(body.name, 'New Name');
  const { body: fetched } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(fetched.name, 'New Name');
});

test('PATCH /api/trackers/:id returns 404 for unknown tracker', async () => {
  const { status } = await patch('/api/trackers/99999', { name: 'x' });
  assert.equal(status, 404);
});

test('PATCH /api/trackers/:id with empty name returns 400', async () => {
  const tracker = await createTracker();
  const { status } = await patch(`/api/trackers/${tracker.id}`, { name: '' });
  assert.equal(status, 400);
});

test('PATCH /api/trackers/:id with name over 40 chars returns 400', async () => {
  const tracker = await createTracker();
  const { status } = await patch(`/api/trackers/${tracker.id}`, { name: 'a'.repeat(41) });
  assert.equal(status, 400);
});

test('DELETE /api/trackers/:id deletes the tracker', async () => {
  const tracker = await createTracker('To Delete');
  const { status, body } = await del(`/api/trackers/${tracker.id}`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const { status: s2 } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(s2, 404);
});

test('DELETE /api/trackers/:id returns 404 for unknown tracker', async () => {
  const { status } = await del('/api/trackers/99999');
  assert.equal(status, 404);
});

test('GET /api/trackers includes newly created tracker', async () => {
  const name = `unique-${Date.now()}`;
  await createTracker(name);
  const { body } = await req('/api/trackers');
  assert.ok(body.some(t => t.name === name));
});

test('POST /api/trackers defaults goal to increase', async () => {
  const { body } = await post('/api/trackers', { name: 'Goal Default' });
  assert.equal(body.goal, 'increase');
});

test('PATCH /api/trackers/:id sets goal to decrease', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goal: 'decrease' });
  assert.equal(status, 200);
  assert.equal(body.goal, 'decrease');
  const { body: fetched } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(fetched.goal, 'decrease');
});

test('PATCH /api/trackers/:id sets goal back to increase', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { goal: 'decrease' });
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goal: 'increase' });
  assert.equal(status, 200);
  assert.equal(body.goal, 'increase');
});

test('PATCH /api/trackers/:id with invalid goal returns 400', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goal: 'maximize' });
  assert.equal(status, 400);
  assert.equal(body.error, 'invalid goal');
});

test('PATCH /api/trackers/:id goal update does not change name', async () => {
  const tracker = await createTracker('Keep This Name');
  await patch(`/api/trackers/${tracker.id}`, { goal: 'decrease' });
  const { body } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(body.name, 'Keep This Name');
  assert.equal(body.goal, 'decrease');
});
