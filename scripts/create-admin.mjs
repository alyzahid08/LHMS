// Creates (or updates) the first administrator account directly in the
// database. Referenced by LOCAL_SETUP.md but was missing from this export.
//
// Usage:
//   LEVELOSE_DATABASE_URL='postgres://...' node scripts/create-admin.mjs <username> <password> ["Full Name"]
//
// Safe to re-run: if the username already exists, its password/name/role
// are updated instead of creating a duplicate.

import bcrypt from "bcryptjs";
import postgres from "postgres";

const [, , usernameArg, passwordArg, nameArg] = process.argv;

if (!usernameArg || !passwordArg) {
  console.error("Usage: node scripts/create-admin.mjs <username> <password> [\"Full Name\"]");
  process.exit(1);
}

if (passwordArg.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const databaseUrl = process.env.LEVELOSE_DATABASE_URL;
if (!databaseUrl) {
  console.error("LEVELOSE_DATABASE_URL is not set.");
  process.exit(1);
}

const username = usernameArg.trim().toLowerCase();
const name = nameArg || "Hostel Administrator";

const sql = postgres(databaseUrl, { max: 1 });

try {
  const passwordHash = await bcrypt.hash(passwordArg, 12);
  const openId = `local:${username}`;

  const rows = await sql`
    insert into users (open_id, username, password_hash, name, login_method, role, is_active)
    values (${openId}, ${username}, ${passwordHash}, ${name}, 'local', 'admin', true)
    on conflict (username) do update set
      password_hash = excluded.password_hash,
      name = excluded.name,
      role = 'admin',
      is_active = true,
      updated_at = now()
    returning id, username, role;
  `;

  console.log("Administrator ready:", rows[0]);
} catch (err) {
  console.error("Failed to create administrator:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
