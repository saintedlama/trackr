import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './db.js';
import { SqliteStore } from './session-store.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import trackerRoutes from './routes/trackers.js';
import eventRoutes from './routes/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

app.use(session({
  store: new SqliteStore(db),
  secret: process.env.SESSION_SECRET || 'trackr-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(authRoutes);
app.use(adminRoutes);
app.use(trackerRoutes);
app.use(eventRoutes);

export default app;
