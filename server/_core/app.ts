import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Builds the API-only Express app: body parsing and the tRPC router mounted
 * at /api/trpc.
 *
 * Deliberately does NOT call app.listen() and does NOT serve the built
 * frontend or Vite dev middleware — those are wired on separately by
 * whichever entry point uses this (see server/_core/index.ts for the
 * single-PC / local server, and server/_core/vercelHandler.ts for the
 * Vercel serverless function), because a serverless function should only
 * ever handle /api/* and let the platform serve the static frontend build
 * directly.
 */
export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
