// index.js — Express app. Serves the JSON API and the static frontend.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import analytics from './routes/analytics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use('/api', analytics);
app.use(express.static(resolve(__dirname, '../../web')));   // serve web/ during local dev

// last-resort error handler so a bad query returns JSON, not an HTML stack trace
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API + dashboard: http://localhost:${PORT}`));
