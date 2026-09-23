import { apiApp } from '../server/routes.js';

/**
 * Vercel Serverless Function entrypoint.
 * Routes all /api/* calls into the Express apiApp router.
 */
export default apiApp;
