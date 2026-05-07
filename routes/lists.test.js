import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useServer } from '../test-setup.js';

const { req, post, patch, del, createList } = useServer();

test('GET /api/lists returns an array', async () => {
  const { status, body } = await req('/api/lists');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('POST /api/lists creates a list and returns 201', async () => {
  const { status, body } = await post('/api/lists', { name: 'My List' });
  assert.equal(status, 201);
  assert.ok(typeof body.id === 'number');
  assert.equal(body.name, 'My List');
});

test('POST /api/lists trims whitespace from name', async () => {
  const { status, body } = await post('/api/lists', { name: '  Trimmed  ' });
  assert.equal(status, 201);
  assert.equal(body.name, 'Trimmed');
});

test('POST /api/lists with empty name returns 400', async () => {
  const { status, body } = await post('/api/lists', { name: '' });
  assert.equal(status, 400);
  assert.equal(body.error, 'name required');
});

test('POST /api/lists with whitespace-only name returns 400', async () => {
  const { status } = await post('/api/lists', { name: '   ' });
  assert.equal(status, 400);
});

test('POST /api/lists with missing name returns 400', async () => {
  const { status } = await post('/api/lists', {});
  assert.equal(status, 400);
});

test('POST /api/lists with name over 40 chars returns 400', async () => {
  const { status, body } = await post('/api/lists', { name: 'a'.repeat(41) });
  assert.equal(status, 400);
  assert.equal(body.error, 'name too long');
});

test('POST /api/lists with name exactly 40 chars succeeds', async () => {
  const { status } = await post('/api/lists', { name: 'a'.repeat(40) });
  assert.equal(status, 201);
});

test('GET /api/lists/:id returns the list', async () => {
  const created = await createList('Fetch Me');
  const { status, body } = await req(`/api/lists/${created.id}`);
  assert.equal(status, 200);
  assert.equal(body.id, created.id);
  assert.equal(body.name, 'Fetch Me');
});

test('GET /api/lists/:id returns 404 for unknown id', async () => {
  const { status } = await req('/api/lists/99999');
  assert.equal(status, 404);
});

test('PATCH /api/lists/:id renames a list', async () => {
  const list = await createList('Old Name');
  const { status, body } = await patch(`/api/lists/${list.id}`, { name: 'New Name' });
  assert.equal(status, 200);
  assert.equal(body.name, 'New Name');
  const { body: fetched } = await req(`/api/lists/${list.id}`);
  assert.equal(fetched.name, 'New Name');
});

test('PATCH /api/lists/:id returns 404 for unknown list', async () => {
  const { status } = await patch('/api/lists/99999', { name: 'x' });
  assert.equal(status, 404);
});

test('PATCH /api/lists/:id with empty name returns 400', async () => {
  const list = await createList();
  const { status } = await patch(`/api/lists/${list.id}`, { name: '' });
  assert.equal(status, 400);
});

test('PATCH /api/lists/:id with name over 40 chars returns 400', async () => {
  const list = await createList();
  const { status } = await patch(`/api/lists/${list.id}`, { name: 'a'.repeat(41) });
  assert.equal(status, 400);
});

test('DELETE /api/lists/:id deletes the list', async () => {
  const list = await createList('To Delete');
  const { status, body } = await del(`/api/lists/${list.id}`);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const { status: s2 } = await req(`/api/lists/${list.id}`);
  assert.equal(s2, 404);
});

test('DELETE /api/lists/:id returns 404 for unknown list', async () => {
  const { status } = await del('/api/lists/99999');
  assert.equal(status, 404);
});

test('GET /api/lists includes newly created list', async () => {
  const name = `unique-${Date.now()}`;
  await createList(name);
  const { body } = await req('/api/lists');
  assert.ok(body.some(l => l.name === name));
});
