# Shared access for Levelose

Levelose is deployed on Vercel and can be opened on phones, tablets, and computers through the deployment's HTTPS URL. The `/demo/admin` and `/demo/resident` routes are database-free and safe for reviewing the experience with fictional records. Demo changes are stored only in the browser session and reset on refresh.

## Review the demo

1. Open the deployed Vercel URL for the project (Vercel → your project → Visit).
2. From the login screen, choose **Admin demo** or **Resident demo**.

No local PostgreSQL server, username, or password is required for the demo.

## Publish the real management system

The full system requires a hosted PostgreSQL database reachable by the deployed server. A public URL alone is not enough: without a hosted database, the deployed app can show the demo but cannot persist real residents, rooms, payments, complaints, visitors, or notices.

Before enabling real-data mode, create a Neon PostgreSQL project and database. In Neon, open **Connect** and copy the pooled connection string for the live application; it normally includes a `-pooler` hostname and `sslmode=require`. Run the project's PostgreSQL migration against Neon, create the first administrator, and then add these values in your Vercel project's **Settings → Environment Variables**:

| Variable | Purpose |
|---|---|
| `LEVELOSE_DATABASE_URL` | Hosted PostgreSQL connection string, including SSL settings where required |
| `LEVELOSE_DATA_ENCRYPTION_KEY` | Stable 32+ character secret for encrypted CNIC/B-Form values |
| `JWT_SECRET` | Stable session-signing secret; use a different value from the encryption key |
| `NODE_ENV` | Set to `production` |

Never put these values into frontend code, a public repository, or a committed `.env` file. After adding or changing environment variables, trigger a new deployment — they don't apply retroactively to a build that already ran.

From your own machine, run the migration and create the first administrator:

```bash
LEVELOSE_DATABASE_URL='your-neon-connection-string' pnpm drizzle-kit migrate
LEVELOSE_DATABASE_URL='your-neon-connection-string' node scripts/create-admin.mjs admin 'YourLongUniquePassword' 'Hostel Administrator'
```

Take a database backup before importing real records, and retain the encryption key with the backup — it is required to read encrypted identity values after restoration.

## Device access

Use the deployed HTTPS URL on a phone or tablet browser. The responsive interface changes the persistent desktop sidebar into compact navigation controls, stacks dashboard cards, and keeps wider record tables horizontally scrollable. Users do not need PostgreSQL installed on their phones or tablets; only the deployed server needs access to the hosted database.

## Before inviting residents

Verify administrator login, resident isolation, payment history, and backups on the deployed URL first.
