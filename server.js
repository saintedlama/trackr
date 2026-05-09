import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createApp } from './app.js';

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (existsSync('.env')) {
    const match = readFileSync('.env', 'utf8').match(/^JWT_SECRET=(.+)$/m);
    if (match) return match[1].trim();
  }

  const secret = randomBytes(32).toString('hex');
  appendFileSync('.env', `JWT_SECRET=${secret}\n`);
  return secret;
}

const app = createApp(loadSecret());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`trackr running on http://localhost:${PORT}`);
});
