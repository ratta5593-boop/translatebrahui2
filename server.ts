import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/routes.js';

dotenv.config();

// Ensure non-API-key client IDs (e.g. Google Cloud OAuth client identifiers starting with 'gen-lang-client')
// do not shadow the valid GEMINI_API_KEY in the @google/genai SDK
if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith('gen-lang-client')) {
  delete process.env.GOOGLE_API_KEY;
}
if (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY.startsWith('gen-lang-client')) {
  delete process.env.VITE_GEMINI_API_KEY;
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middlewares
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Health check and crawler routes for Cloud Run and container rollout probes
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\n');
  });

  // Mount API router
  app.use('/api', apiRouter);

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!doctype html><html><head><title>Brahui Translate</title></head><body><h1>Brahui Translate</h1></body></html>');
      }
    });
  } else {
    // In development, integrate Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Brahui AI Translation Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

