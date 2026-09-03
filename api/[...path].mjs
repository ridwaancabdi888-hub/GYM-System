import serverless from 'serverless-http';
import { app } from '../backend/src/app.js';

// Vercel's file-system convention: any request under /api/* is routed to
// this single catch-all function (the [...path] filename), which forwards
// the original request untouched into the Express app. Named ".mjs" so
// Node always parses it as ESM, with no dependency on a root package.json.
export default serverless(app);
