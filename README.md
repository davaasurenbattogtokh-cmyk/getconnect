# GET CONNECTED EXPO 2026

**Domain:** https://getconnect.business/  
**Organizer:** BNI NEXUS  
**Repository:** https://github.com/davaasurenbattogtokh-cmyk/getconnect

Production Next.js application for **Hostinger Business/Cloud Node.js hosting**, using the plan's MySQL database. Registration, booth reservations, approvals/cancellations, admin sessions, settings, email outbox and uploaded logos are durable MySQL records. No Cloudflare account, D1, R2, Worker emulator or filesystem uploads are required.

## Hostinger deployment

1. In hPanel, open **Websites → Dashboard → Databases → Management**. Create a MySQL database and its user. Copy the **full names including Hostinger's prefix**, and save the database password privately. This password is different from the application-admin password.
2. Connect this GitHub repository, branch **main**, as a **Next.js** Node.js application. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Node.js | 22.x (at least 22.13) or 24.x |
   | Root directory | Repository root (`.`) |
   | Build command | `npm run build` |
   | Start command | `npm run start` |
   | Build output directory, if requested | `.next` |

   A `pnpm-lock.yaml` is included for reproducible pnpm installation. Use the package manager detected by Hostinger. Do not use a static/Vite deployment preset; API routes require a running Node.js server. The start script honors the hosting provider's `PORT`; do not add a fixed `PORT` value in hPanel.

3. Add the following environment values in hPanel. Paste **values only, without surrounding quotes**:

   | Key | Value |
   | --- | --- |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD_HASH` | Full PBKDF2 hash generated with `pnpm admin:hash` or `npm run admin:hash`; never the plaintext password |
   | `APP_URL` | `https://getconnect.business` |
   | `DB_HOST` | `127.0.0.1` |
   | `DB_PORT` | `3306` |
   | `DB_NAME` | Actual full database name, e.g. `u123456789_getconnect` (example only) |
   | `DB_USER` | Actual full database username from hPanel |
   | `DB_PASSWORD` | Password assigned to that database user |
   | `RESEND_API_KEY` | Your Resend sending key; optional until email setup is complete |
   | `MAIL_FROM` | Example: `BNI NEXUS <noreply@getconnect.business>`, after verifying that domain in Resend |

   Remove obsolete `EXPO_D1_DATABASE_ID`, `EXPO_D1_DATABASE_NAME` and `EXPO_R2_BUCKET_NAME` fields. They are not used by this version. Keep secret values in hPanel, never GitHub.

4. Deploy/redeploy. On the first API request the app creates its missing tables with additive `CREATE TABLE IF NOT EXISTS` statements. The database user must have CREATE access to its own database. Existing records are not deleted. Alternatively, import `db/schema.sql` with phpMyAdmin before opening registration, or run `npm run db:migrate` with the database environment configured.
5. Attach the real domain in hPanel and ensure HTTPS is enabled. `APP_URL` must match the origin visitors actually use, including `www` if used; it controls request-origin validation, secure admin cookies and email status links. If testing a temporary Hostinger subdomain, temporarily use its HTTPS URL, then restore the real domain when connected.
6. Open `/admin/login` (or **Admin** in the footer). Sign in with the username and password corresponding to the configured hash. Enter public contact details and any additional chapter suggestions.
7. Verify the full workflow on the actual host: register → pending hold → approve → logo appears on map and in directory → confirmation email → cancel with reason → booth available again. A successful source push/build alone does not prove live database, DNS or email configuration.

Official references: [Hostinger Node.js deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [Hostinger MySQL connection](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

## Data and behavior

- Multiple selected booths are reserved in **one InnoDB transaction**. Unique booth keys prevent double booking; any conflict rolls the complete request back. Deadlocks retry the transaction, not individual statements.
- Pending holds last 48 hours. Availability reads and admin decisions reconcile expired holds. Approval publishes the organization and its logo; rejection/cancellation frees booths. A cancellation/rejection reason is required. Audit entries and email-outbox records are part of the same guarded decision transaction.
- A chapter is mandatory **before selecting the map**. BNI NEXUS and the 14 confirmed regional chapters receive 200,000 MNT/m²; other chapters receive 350,000 MNT/m². Sponsor packages remain 20,000,000 MNT. The server computes and saves the quote, ignoring submitted prices.
- Logos must be PNG/JPG/WebP, maximum 5 MB. Their binary data is stored in packet-safe 256 KiB database chunks, so restarts and source redeployments do not delete uploads. Include these tables in database backups. Unapproved logos require an admin session. Private contacts and 1:1 wishes are not returned by the public exhibitor API.
- Logo storage uses the MySQL quota: allow approximately 510 MB for 102 maximum-size logos, plus application data and backups. Actual typical logos are much smaller. Keep the plan's database backups enabled.
- Admin passwords use PBKDF2-SHA256 with 100,000 iterations and a random salt. The repository contains no actual password/hash. Sessions are random 256-bit tokens, stored only as SHA-256 hashes in MySQL, with 8-hour expiry, HttpOnly/SameSite=Strict cookies and Secure cookies when `APP_URL` is HTTPS. Logout revokes the session. Failed logins have an atomic per-IP 15-minute rate limit. Hostinger must overwrite/maintain trusted proxy `X-Forwarded-For` headers.
- Resend is optional until configured. Without its key and verified sender, mail stays **pending**, and admin reports mail as unconfigured. Delivery failure does not undo registration/approval; admin can retry pending/failed messages. Provider requests have stable idempotency keys. No background daemon is required.
- The map has 100 numbered booths and two sponsor booths, with overhead subtle 3D blocks, multi-booth organization logos, hover information and exhibitor details. Registration includes mandatory desired 1:1 organization/person/goal.

This is a new, independent Hostinger database. Source export does **not** copy any live records, sessions, secret values or uploads from another hosting provider. Importing old production data would be a separate, explicit migration.

## Local development and verification

Use Node.js >=22.13.0 and the pnpm version in `package.json`:

```sh
pnpm install --frozen-lockfile
# Set local values from .env.example in an ignored .env.local file.
pnpm dev
pnpm build
pnpm start
```

`pnpm admin:hash` reads a password through hidden input and prints its hash. `pnpm db:migrate` uses environment values from the shell; with Node 22+, `.env.local` can be loaded with `node --env-file=.env.local scripts/migrate.mjs`.

`pnpm check` checks types. `pnpm test:integration` requires a **local** MySQL/MariaDB server and `DB_HOST=127.0.0.1`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` exported. The test user needs permission to create and drop a fresh `getconnect_qa_*` database. The harness refuses non-local hosts, creates its own random database and credentials, runs the production Next.js server, tests authentication, registration, all tariff chapters, transaction conflicts, cancellation, logo access, 5 MB uploads, process restart durability and rate limiting, then removes only its own test database. It never sends real email or accesses the configured production `DB_NAME`.

## Assets and identity

Official supplied logos retain their artwork; Montserrat includes its OFL license. Hero scenes and the map teaser are AI concepts. `participant-kit-web.pdf` is the web-optimized participant kit. Event: **2026.11.20–22 · Мишээл Экспо**. Organizer: **BNI NEXUS**.
