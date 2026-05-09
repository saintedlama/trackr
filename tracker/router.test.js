import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, patch, del, createTracker } = useServer();

// ─── trackers ─────────────────────────────────────────────────────────────────

test('GET /api/trackers returns an array', async () => {
  const { status, body } = await req('/api/trackers');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('GET /api/trackers includes periodCount of 0 for new tracker', async () => {
  const tracker = await createTracker();
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.periodCount, 0);
});

test('GET /api/trackers periodCount increments with each event', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.periodCount, 2);
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

test('POST /api/trackers defaults countGoal to null', async () => {
  const { body } = await post('/api/trackers', { name: 'Count Goal Default' });
  const { body: fetched } = await req(`/api/trackers/${body.id}`);
  assert.equal(fetched.countGoal, null);
});

test('PATCH /api/trackers/:id sets countGoal', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { countGoal: 5 });
  assert.equal(status, 200);
  assert.equal(body.countGoal, 5);
  const { body: fetched } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(fetched.countGoal, 5);
});

test('PATCH /api/trackers/:id clears countGoal with null', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { countGoal: 3 });
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { countGoal: null });
  assert.equal(status, 200);
  assert.equal(body.countGoal, null);
});

test('PATCH /api/trackers/:id rejects countGoal of 0', async () => {
  const tracker = await createTracker();
  const { status } = await patch(`/api/trackers/${tracker.id}`, { countGoal: 0 });
  assert.equal(status, 400);
});

test('PATCH /api/trackers/:id rejects non-integer countGoal', async () => {
  const tracker = await createTracker();
  const { status } = await patch(`/api/trackers/${tracker.id}`, { countGoal: 2.5 });
  assert.equal(status, 400);
});

test('GET /api/trackers includes countGoal', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { countGoal: 7 });
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.countGoal, 7);
});

test('POST /api/trackers defaults goalPeriod to daily', async () => {
  const { body } = await post('/api/trackers', { name: 'Period Default' });
  assert.equal(body.goalPeriod, 'daily');
  const { body: fetched } = await req(`/api/trackers/${body.id}`);
  assert.equal(fetched.goalPeriod, 'daily');
});

test('PATCH /api/trackers/:id sets goalPeriod to weekly', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'weekly' });
  assert.equal(status, 200);
  assert.equal(body.goalPeriod, 'weekly');
  const { body: fetched } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(fetched.goalPeriod, 'weekly');
});

test('PATCH /api/trackers/:id sets goalPeriod back to daily', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'weekly' });
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'daily' });
  assert.equal(status, 200);
  assert.equal(body.goalPeriod, 'daily');
});

test('PATCH /api/trackers/:id with invalid goalPeriod returns 400', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'hourly' });
  assert.equal(status, 400);
  assert.equal(body.error, 'invalid goalPeriod');
});

test('PATCH /api/trackers/:id sets goalPeriod to monthly', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'monthly' });
  assert.equal(status, 200);
  assert.equal(body.goalPeriod, 'monthly');
  const { body: fetched } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(fetched.goalPeriod, 'monthly');
});

test('PATCH /api/trackers/:id sets goalPeriod to yearly', async () => {
  const tracker = await createTracker();
  const { status, body } = await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'yearly' });
  assert.equal(status, 200);
  assert.equal(body.goalPeriod, 'yearly');
  const { body: fetched } = await req(`/api/trackers/${tracker.id}`);
  assert.equal(fetched.goalPeriod, 'yearly');
});

test('GET /api/trackers monthly periodCount counts events in current month', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'monthly' });
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.periodCount, 2);
});

test('GET /api/trackers yearly periodCount counts events in current year', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'yearly' });
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.periodCount, 2);
});

test('GET /api/trackers weekly periodCount counts events in current week', async () => {
  const tracker = await createTracker();
  await patch(`/api/trackers/${tracker.id}`, { goalPeriod: 'weekly' });
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);
  const { body } = await req('/api/trackers');
  const found = body.find(t => t.id === tracker.id);
  assert.equal(found.periodCount, 2);
});

// ─── events ───────────────────────────────────────────────────────────────────

test('POST /api/trackers/:id/events creates an event and returns its id', async () => {
  const tracker = await createTracker();
  const { status, body } = await post(`/api/trackers/${tracker.id}/events`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(typeof body.id === 'number');
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

test('GET /api/trackers/:id/events returns a flat array of events', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);

  const { status, body } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(status, 200);
  assert.equal(body.length, 3);
  assert.ok(typeof body[0].id === 'number');
});

test('GET /api/trackers/:id/events events have null reason by default', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  const { body } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(body[0].reason, null);
});

test('GET /api/trackers/:id/events events have id and UTC ISO trackedAt', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);

  const { body } = await req(`/api/trackers/${tracker.id}/events`);
  const entry = body[0];
  assert.ok(typeof entry.id === 'number');
  assert.match(entry.trackedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});

test('DELETE /api/trackers/:id/events/:eventId removes the event', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  await post(`/api/trackers/${tracker.id}/events`);

  const { body: before } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(before.length, 2);
  const eventId = before[0].id;

  const { status, body } = await del(`/api/trackers/${tracker.id}/events/${eventId}`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);

  const { body: after } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(after.length, 1);
  assert.ok(after.every(e => e.id !== eventId));
});

test('DELETE /api/trackers/:id/events/:eventId returns 404 for unknown tracker', async () => {
  const { status } = await del('/api/trackers/99999/events/1');
  assert.equal(status, 404);
});

test('PATCH /api/trackers/:id/events/:eventId sets reason', async () => {
  const tracker = await createTracker();
  const { body: created } = await post(`/api/trackers/${tracker.id}/events`);
  const { status, body } = await patch(`/api/trackers/${tracker.id}/events/${created.id}`, { reason: 'stress' });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const { body: events } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(events[0].reason, 'stress');
});

test('PATCH /api/trackers/:id/events/:eventId clears reason with null', async () => {
  const tracker = await createTracker();
  const { body: created } = await post(`/api/trackers/${tracker.id}/events`);
  await patch(`/api/trackers/${tracker.id}/events/${created.id}`, { reason: 'stress' });
  await patch(`/api/trackers/${tracker.id}/events/${created.id}`, { reason: null });
  const { body: events } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(events[0].reason, null);
});

test('GET /api/trackers/:id/events/reasons returns reason counts', async () => {
  const tracker = await createTracker();
  const { body: e1 } = await post(`/api/trackers/${tracker.id}/events`);
  const { body: e2 } = await post(`/api/trackers/${tracker.id}/events`);
  await patch(`/api/trackers/${tracker.id}/events/${e1.id}`, { reason: 'boredom' });
  await patch(`/api/trackers/${tracker.id}/events/${e2.id}`, { reason: 'boredom' });
  const { body: e3 } = await post(`/api/trackers/${tracker.id}/events`);
  await patch(`/api/trackers/${tracker.id}/events/${e3.id}`, { reason: 'stress' });
  const { status, body } = await req(`/api/trackers/${tracker.id}/events/reasons`);
  assert.equal(status, 200);
  assert.equal(body[0].reason, 'boredom');
  assert.equal(body[0].count, 2);
  assert.equal(body[1].reason, 'stress');
  assert.equal(body[1].count, 1);
});

test('GET /api/trackers/:id/events/reasons returns empty for no reasons', async () => {
  const tracker = await createTracker();
  await post(`/api/trackers/${tracker.id}/events`);
  const { status, body } = await req(`/api/trackers/${tracker.id}/events`);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('DELETE /api/trackers/:id/events/:eventId silently ignores unknown event id', async () => {
  const tracker = await createTracker();
  const { status, body } = await del(`/api/trackers/${tracker.id}/events/99999`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});
