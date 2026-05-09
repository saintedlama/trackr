import { before, after } from 'node:test';
import { createServer } from 'node:http';
import { createApp } from './app.js';

export function useServer() {
  let server;
  let base;
  let cookie = '';

  before(async () => {
    server = createServer(createApp(process.env.JWT_SECRET));
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

  async function unauthed(path, opts = {}) {
    const res = await fetch(base + path, opts);
    const body = await res.json();
    return { status: res.status, body, headers: res.headers };
  }

  async function reqAs(asCookie, path, opts = {}) {
    const res = await fetch(base + path, {
      ...opts,
      headers: { ...opts.headers, Cookie: asCookie },
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  async function loginAs(username, password) {
    const res = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return { status: res.status, cookie: parseCookie(res.headers.get('set-cookie')) };
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

  return { req, post, patch, del, createTracker, unauthed, reqAs, loginAs };
}

function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0];
}
