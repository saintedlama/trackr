import { before, after } from 'node:test';
import { createServer } from 'node:http';
import app from './app.js';

export function useServer() {
  let server;
  let base;
  let cookie = '';

  before(async () => {
    server = createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    base = `http://localhost:${server.address().port}`;

    // Try to create the first admin via setup; fall back to login if already configured.
    const setupRes = await fetch(`${base}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testadmin', password: 'testpass123' }),
    });

    if (setupRes.ok) {
      cookie = parseCookie(setupRes.headers.get('set-cookie'));
    } else {
      const loginRes = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testadmin', password: 'testpass123' }),
      });
      cookie = parseCookie(loginRes.headers.get('set-cookie'));
    }
  });

  after(() => new Promise(resolve => server.close(resolve)));

  async function req(path, opts = {}) {
    const res = await fetch(base + path, {
      ...opts,
      headers: { ...opts.headers, Cookie: cookie },
    });
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

function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0];
}
