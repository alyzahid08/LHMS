import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

describe("Neon production database connection", () => {
  it("connects using the configured server-side URL", async () => {
    const db = await getDb();
    expect(db, "LEVELOSE_DATABASE_URL must be configured for this test").toBeTruthy();
    const result = await db!.execute(sql`select 1 as connected`);
    expect(result).toBeTruthy();
  }, 15_000);
});
