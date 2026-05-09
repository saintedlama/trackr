import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createJwt } from './auth/jwt.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { createAuthRouter } from './auth/router.js';
import { createAdminRouter } from './account/router.js';
import { createTrackerRouter } from './tracker/router.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp(rawSecret) {
  const jwt = createJwt(rawSecret);
  const { requireAuth, requireAdmin } = createAuthMiddleware(jwt);

  const app = express();
  app.use(express.static(join(__dirname, 'public')));
  app.use(express.json());

  app.use(createAuthRouter(jwt));
  app.use(createAdminRouter({ requireAdmin }));
  app.use(createTrackerRouter({ requireAuth }));

  app.use((req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

  return app;
}
