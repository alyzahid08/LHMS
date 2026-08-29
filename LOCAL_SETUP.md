# Levelose Management System — Local Setup

Levelose is designed to run on a single PC with **Node.js**, the supplied React and Express application, and a local **PostgreSQL** service. The managed preview database is TiDB-compatible rather than PostgreSQL, so its schema cannot be applied there. For the intended local installation, use the PostgreSQL migration included in this project.

| Requirement | Recommended version | Purpose |
|---|---:|---|
| Node.js | 20 or newer | Runs the Levelose web application |
| PostgreSQL | 15 or newer | Holds the encrypted, relational operational records |
| `pg_dump` / `pg_restore` | Matching PostgreSQL major version | Provides reliable backups and restoration |

## 1. Install and configure

Install Node.js and PostgreSQL using the normal package installer for your operating system. Create a local database and an account with a strong password. Substitute your own values in the following commands; do not commit an `.env` file.

```bash
createdb levelose
export LEVELOSE_DATABASE_URL='postgresql://levelose_app:replace-with-strong-password@localhost:5432/levelose'
export LEVELOSE_DATA_ENCRYPTION_KEY='generate-and-store-a-random-32-plus-character-secret'
export JWT_SECRET='generate-and-store-a-separate-random-32-plus-character-secret'
pnpm install
```

> The encryption key protects CNIC/B-Form values at rest. Keep it safe and unchanged: losing it makes existing encrypted identity values unrecoverable.

## 2. Create the relational schema and first administrator

Run the migration once on an empty Levelose database, then create the first administrator from the command line. The account password must have at least 10 characters. Do not put this password in shell history on shared computers.

```bash
pnpm drizzle-kit migrate
node scripts/create-admin.mjs admin 'replace-with-a-long-unique-password' 'Hostel Administrator'
```

Then start Levelose and browse to the local server address displayed in the terminal, usually `http://localhost:3000`.

```bash
pnpm dev
```

The first administrator can now sign in, create rooms, create resident accounts, and manage the day-to-day records. The server automatically uses the configured available port and must not be hard-coded.

## 3. Security operations

Levelose hashes local passwords with bcrypt, uses HTTP-only session cookies, validates data at the server boundary, and scopes resident queries to the authenticated resident's own linked profile. Administrator-only procedures remain enforced server-side even if someone tries to navigate directly to an admin URL. CNIC/B-Form values are encrypted before they enter PostgreSQL; resident-facing lists only receive masked identity values.

Visitor requests and physical visit records intentionally use one `visitors` lifecycle record rather than disconnected duplicate tables. A resident-created request is marked with `requested_by_resident`, passes through the approval state, and then receives entry and exit timestamps on the same auditable record. This keeps the requester, approval decision, and actual visit together without losing history.

## 4. Database backup and restore

Back up the database while PostgreSQL is running. Store the resulting custom-format `.dump` file on an encrypted removable drive or a separate protected location. Test a restore periodically on a different, empty database.

```bash
# Create a dated backup
pg_dump --format=custom --file="levelose-$(date +%F).dump" "$LEVELOSE_DATABASE_URL"

# Restore to a separate empty database for verification
createdb levelose_restore_check
pg_restore --clean --if-exists --no-owner --dbname='postgresql://levelose_app:replace-with-strong-password@localhost:5432/levelose_restore_check' levelose-YYYY-MM-DD.dump
```

For an operational recovery, stop Levelose first, make a final copy of the current database, then restore the approved backup into the production `levelose` database. Preserve the encryption key used when the backup was created; it is essential for decrypting resident identity values after restoration.

## 5. Preview environment note

The project preview provided during development uses a TiDB-compatible managed database. It is not PostgreSQL, and the Levelose PostgreSQL migration is deliberately not applied to it. The source code, migration, first-admin script, and local setup guide target the requested single-PC PostgreSQL deployment. Complete the final operational test on the target PC after setting `LEVELOSE_DATABASE_URL` and running the migration.
