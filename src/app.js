import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import listRoutes from './routes/lists.js';
import eventRoutes from './routes/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, '..', 'public')));
app.use(express.json());
app.use(listRoutes);
app.use(eventRoutes);

export default app;
