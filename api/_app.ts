import "dotenv/config";
import { createApp } from "../server/_core/app";

// This is the SOURCE for the Vercel serverless function — it is NOT deployed
// as-is. The underscore prefix keeps Vercel's zero-config /api scanner from
// picking it up directly. The `build:api` script (see package.json) bundles
// this file with esbuild into a single self-contained api/index.js, inlining
// every relative and "@shared/*"-aliased import from server/ and shared/ so
// Vercel's own function bundler never has to resolve a tsconfig path alias
// (which it can't) or a local relative import across the api/ boundary.
// Only bare npm-package specifiers (express, drizzle-orm, etc.) are left in
// the output — those resolve normally from node_modules at deploy time.
//
// Vercel treats a default-exported Express app as a request handler.
// No app.listen() here — Vercel invokes this per-request as a serverless
// function, and the built frontend (dist/public) is served separately as
// static output, configured via vercel.json.
const app = createApp();

export default app;
