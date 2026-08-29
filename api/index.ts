import "dotenv/config";
import { createApp } from "../server/_core/app";

// Vercel treats a default-exported Express app as a request handler.
// No app.listen() here — Vercel invokes this per-request as a serverless
// function, and the built frontend (dist/public) is served separately as
// static output, configured via vercel.json.
const app = createApp();

export default app;
