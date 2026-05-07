import { before, after } from 'node:test';
import { createServer } from 'node:http';
import app from '../src/app.js';

export function useServer() {
  let server;
  let base;

  before(() => new Promise(resolve => {
    server = createServer(app);
    server.listen(0, () => {
      base = `http://localhost:${server.address().port}`;
      resolve();
    });
  }));

  after(() => new Promise(resolve => server.close(resolve)));

  async function req(path, opts = {}) {
    const res = await fetch(base + path, opts);
    const body = await res.json();
    return { status: res.status, body };
  }

  function post(path, data) {
    return req(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  async function createList(name = `list-${Date.now()}`) {
    const { body } = await post('/api/lists', { name });
    return body;
  }

  return { req, post, createList };
}
