# GET CONNECTED EXPO 2026

**Domain:** https://getconnect.business/  
**Organizer:** BNI NEXUS  
**Repository:** https://github.com/davaasurenbattogtokh-cmyk/getconnect

Vinext/React website with Cloudflare D1 records and R2 logo uploads. The complete frontend, API routes, administrator login, uploaded-logo handling, database schema/migrations and source assets are included. This application requires a Worker runtime, D1 and R2; deploying the frontend alone will not provide registration or administration.

## Run locally

Use Node.js >=22.13 and the pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm build
# Apply each SQL file in drizzle/ to the local D1 database, in filename order:
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fearless_red_wolf.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_old_human_fly.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_even_masked_marvel.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_tranquil_satana.sql
pnpm dev
```

Set local runtime values in an untracked `.dev.vars` file using the key names from `.env.example`. Generate a password hash with `pnpm admin:hash`; the password input is hidden. Never commit the resulting local secrets file.

## Routes

- `/`: expo introduction, four generated hero scenes, pointer-reactive globe, program and FAQ.
- `/exhibitors`: overhead interactive 3D-block floor plan, multi-booth selection, approved exhibitors and filters.
- `/register`: four-step application with chapter selected before the map, chapter-based pricing, mandatory logo, contact and one-to-one meeting interests.
- `/status?token=...`: private unguessable application-status link.
- `/admin`: password-authenticated administration, approval, rejection, cancellation, hold extension, CSV, mail outbox, contact settings and chapters.

## Configuration

Sites provisions `DB` and `BUCKET` through `.openai/hosting.json`. Schema migrations live under `drizzle/`.

The site deploys owner-private and preserves the Sites/ChatGPT outer access boundary. Application administration uses the explicit username/password login at `/admin/login`; Footer **Admin** opens it. Runtime secrets `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` configure credentials. The password hash format is `pbkdf2-sha256$100000$<32-hex-salt>$<64-hex-hash>`. Passwords never appear in source or browser bundles.

Authenticated sessions use random 256-bit tokens; D1 stores only SHA-256 token hashes, with an eight-hour expiry. Cookies are HttpOnly, SameSite=Strict, host-only and Secure on HTTPS. Logout revokes the stored session. Login attempts are limited to ten per fifteen-minute IP window. Every protected API authorizes the session server-side; platform identity alone never grants application-admin permissions. Existing platform sign-in integration remains intact.

Transactional email uses Resend over HTTPS. Configure the runtime secrets `RESEND_API_KEY` and `MAIL_FROM` (a verified sender), then redeploy. The outbox truthfully remains pending until configured. The admin can retry delivery. Email requests carry stable idempotency keys; notification failure never rolls back registration or approval.

Public contact details and additional standard-rate chapter suggestions are editable in admin. BNI Nexus and the 14 confirmed regional chapters receive 200,000 MNT/m²; all others receive 350,000 MNT/m². Both map entry points require a selected chapter. The server computes and saves the unit rate and total independently from client-submitted prices. Sponsor packages remain 20,000,000 MNT. No names, exhibitors or testimonials were invented. The directory starts empty. At least one nonempty chapter must always be supplied, even before the organizer fills the suggestion list.

Temporary holds last 48 hours. Availability requests and decisions reconcile expired holds. Selection alone never reserves inventory. Requests acquire all selected booth IDs atomically in a D1 batch; unique booth keys prevent double booking. Reject/cancel frees inventory and removes the public listing atomically. Private contact email and meeting wishes never appear in public exhibitor API responses.

## Validation

`node node_modules/typescript/bin/tsc --noEmit`

`node tests/run-worker.mjs` (isolated D1/R2 Worker integration suite)

`node tests/integration.mjs http://127.0.0.1:4173` (optional HTTP test runner)

The integration script refuses non-local destinations. The isolated Worker harness creates ephemeral test-only credentials and tests password login, session revocation, rate limiting and the registration workflow; local and hosted databases are separate. It does not send real mail.

The built asset `participant-kit-web.pdf` is a web-optimized copy of the supplied participant kit. Official supplied logos retain their original artwork. Hero scenes and the illustrative map preview are AI concepts; the selectable map is authored SVG with the source plan's booth coordinates, 100 numbered booths and two sponsor booths.

## Independent production deployment: getconnect.business

The existing ChatGPT Site and its stored database/files are separate from a new external deployment. This GitHub repository contains source and schema only, not live participant records, uploaded logos or secret values. Changing source metadata does not change DNS or activate the domain.

The current backend is designed for Cloudflare Workers with D1 and R2. A conventional PHP-only shared host or GitHub Pages cannot run the API as-is. A different server requires a backend/storage adaptation.

For an independent Cloudflare deployment:

1. Add `getconnect.business` to your Cloudflare account and activate its zone. Authenticate Wrangler in that account.
2. Create the production resources and retain the returned real D1 database ID:

   ```sh
   pnpm exec wrangler d1 create getconnect-business
   pnpm exec wrangler r2 bucket create getconnect-business-logos
   ```

3. Build the app, then prepare the production config with the resource ID from step 2. The following environment values are non-secret identifiers; replace `YOUR_D1_DATABASE_ID` with the provider's returned ID:

   ```sh
   pnpm build
   EXPO_D1_DATABASE_ID=YOUR_D1_DATABASE_ID EXPO_R2_BUCKET_NAME=getconnect-business-logos pnpm deploy:prepare
   ```

   This writes an ignored `dist/server/wrangler.production.json`. It preserves the verified build's modules and assets, declares the real DB/BUCKET bindings and configures the `getconnect.business` custom domain. It does not deploy or change DNS by itself.

4. Apply the schema to the new database:

   ```sh
   pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.production.json
   ```

5. Deploy the Worker, and configure runtime secrets through Wrangler's hidden prompts (or the Cloudflare dashboard). Use the generated hash from `pnpm admin:hash` for `ADMIN_PASSWORD_HASH`; do not paste the plaintext password as the hash:

   ```sh
   pnpm exec wrangler deploy --config dist/server/wrangler.production.json
   pnpm exec wrangler secret put ADMIN_USERNAME --config dist/server/wrangler.production.json
   pnpm exec wrangler secret put ADMIN_PASSWORD_HASH --config dist/server/wrangler.production.json
   pnpm exec wrangler secret put RESEND_API_KEY --config dist/server/wrangler.production.json
   pnpm exec wrangler secret put MAIL_FROM --config dist/server/wrangler.production.json
   ```

   Use `admin` as the configured username. The password itself is intentionally not stored in this repository. The email service requires a verified sender. Before opening registration, complete the runtime configuration, verify HTTPS on the custom domain and run the complete register → approve → logo publication → email → cancel flow.

6. In `/admin/login`, sign in and enter the public contact information and additional chapter suggestions. On an independent Cloudflare deployment there is no ChatGPT hosting gate; the application-admin password remains required.

Production references: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) and [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
