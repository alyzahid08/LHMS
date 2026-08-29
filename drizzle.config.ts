import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.LEVELOSE_DATABASE_URL ?? "postgresql://localhost:5432/levelose",
  },
  strict: true,
  verbose: true,
});
