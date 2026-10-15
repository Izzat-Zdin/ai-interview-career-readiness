import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import mockInterviewRoutes from './modules/mock-interview/routes/mock-interview.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

export const app = express();
const PORT = Number(process.env.PORT) || 5000;

console.log(`AI Interview Server v${pkg.version}`);
console.log('PORT from env:', process.env.PORT, 'Using:', PORT);


app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/mock-interview', mockInterviewRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Only start the server directly when this file is the entry point,
// not when it is imported by tests.
const isMain = import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('/src/index.js');
if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
