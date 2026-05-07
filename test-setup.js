import { before, after } from 'node:test';
import { createServer } from 'node:http';
import app from './app.js';

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

  function send(method, path, data) {
    return req(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  const post  = (path, data) => send('POST',  path, data);
  const patch = (path, data) => send('PATCH', path, data);
  const del   = (path)       => req(path, { method: 'DELETE' });

  async function createTracker(name = `tracker-${Date.now()}`) {
    const { body } = await post('/api/trackers', { name });
    return body;
  }

  return { req, post, patch, del, createTracker };
}
