import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { InsertUser, users } from "../drizzle/schema";

let client: postgres.Sql | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Opens only the explicitly configured local PostgreSQL database. */
export async function getDb() {
  const databaseUrl = process.env.LEVELOSE_DATABASE_URL;
  if (!databaseUrl) return null;
  if (!database) {
    client = postgres(databaseUrl, { max: 3, idle_timeout: 20, connect_timeout: 10 });
    database = drizzle(client, { schema });
  }
  return database;
}

export async function closeDb() {
  if (client) await client.end({ timeout: 5 });
  client = null;
  database = null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.insert(users).values({ ...user, lastSignedIn: user.lastSignedIn ?? now, updatedAt: now }).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? "local",
      role: user.role ?? undefined,
      isActive: user.isActive ?? undefined,
      lastSignedIn: user.lastSignedIn ?? now,
      updatedAt: now,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return result[0];
}
