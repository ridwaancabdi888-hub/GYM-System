// Vercel's zero-config convention: this file at api/index.mjs is
// automatically deployed as a Serverless Function at /api. vercel.json
// rewrites every /api/* request here while preserving the original path,
// so Express routes it internally exactly as it does locally. Vercel's
// Node.js runtime invokes the default export with plain (req, res) — the
// same signature an Express app already has — so no adapter is needed.
export { app as default } from '../backend/src/app.js';
