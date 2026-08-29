# Shared access for Levelose

Levelose can be opened on phones, tablets, and computers through a managed HTTPS URL. The current `/demo/admin` and `/demo/resident` routes are database-free and are safe for reviewing the experience with fictional records. Demo changes are stored only in the browser session and reset on refresh.

## Publish the demo now

1. Open the Levelose project in the Management UI.
2. Confirm the latest checkpoint is available.
3. Click **Publish** in the top-right corner.
4. Keep the generated `manus.space` URL private while reviewing the demo, or configure the project's visibility and a custom domain in Settings → Domains.
5. Open the published URL on any device. From the login screen, choose **Admin demo** or **Resident demo**.

No localhost address, PostgreSQL server, username, or password is required for the demo.

## Publish the real management system

The full system requires a hosted PostgreSQL database reachable by the deployed server. A public URL alone is not enough: without a hosted database, the published app can show the demo but cannot persist real residents, rooms, payments, complaints, visitors, or notices.

Before publishing real-data mode, create a Neon PostgreSQL project and database. In Neon, open **Connect** and copy the pooled connection string for the live application; it normally includes a `-pooler` hostname and `sslmode=require`. Keep the direct, unpooled connection string for migrations if Neon provides it. Run the project's PostgreSQL migration against Neon, create the first administrator, and then add these values in the Management UI's server-side Secrets panel:

| Secret | Purpose |
|---|---|
| `LEVELOSE_DATABASE_URL` | Hosted PostgreSQL connection string, including SSL settings where required |
| `LEVELOSE_DATA_ENCRYPTION_KEY` | Stable 32+ character secret for encrypted CNIC/B-Form values |
| `JWT_SECRET` | Stable session-signing secret; use a different value from the encryption key |

Never put these values into frontend code, a public repository, or a client-side `.env` file. After the migration, create the first administrator from the project environment with `node scripts/create-admin.mjs admin 'YourLongUniquePassword' 'Hostel Administrator'`. Take a database backup before importing real records, and retain the encryption key with the backup because it is required to read encrypted identity values after restoration.

## Device access

After publishing, use the HTTPS URL on a phone or tablet browser. The responsive interface changes the persistent desktop sidebar into compact navigation controls, stacks dashboard cards, and keeps wider record tables horizontally scrollable. Users do not need PostgreSQL installed on their phones or tablets; only the deployed server needs access to the hosted database.

## Important distinction

The current project was initially created with a managed TiDB-compatible development database while the Levelose business schema targets PostgreSQL. The managed SQL console therefore cannot apply the PostgreSQL enum migration to Neon. The Neon migration must be run from the project environment using the Neon connection, as in `pnpm drizzle-kit migrate`. The demo routes deliberately avoid the development-database mismatch. Before inviting residents, verify administrator login, resident isolation, payment history, and backups on the published URL.
