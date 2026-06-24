// Bootstrap a fresh self-host install: create the first newsroom (tenant) + an
// admin user so you can log in. Standalone — pg + node:crypto only, no Next
// imports — so it runs in the web image without a full app boot.
//
//   docker compose run --rm \
//     -e ADMIN_EMAIL="you@yournewsroom.org" \
//     -e ADMIN_PASSWORD="a-strong-password" \
//     -e OUTLET_NAME="Your Newsroom" \
//     web node apps/web/scripts/bootstrap.mjs
//
// Idempotent: re-running leaves an existing admin untouched.

import { randomBytes, scryptSync } from "node:crypto";

import pg from "pg";

const url = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const outlet = process.env.OUTLET_NAME || "My Newsroom";
const slug = process.env.OUTLET_SLUG || "self";

if (!url || !email || !password) {
  console.error(
    "Missing env. Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD " +
      "(optionally OUTLET_NAME, OUTLET_SLUG).",
  );
  process.exit(1);
}

// Mirrors apps/web/lib/auth.ts hashPassword: `${salt}:${scrypt(pw, salt, 64)}`.
function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const {
    rows: [tenant],
  } = await client.query(
    `insert into tenants (slug, name, tier) values ($1, $2, 'self')
       on conflict (slug) do update set name = excluded.name
     returning id`,
    [slug, outlet],
  );
  const { rowCount } = await client.query(
    `insert into users (tenant_id, email, display_name, password_hash, role, status)
     values ($1, $2, $3, $4, 'admin', 'approved')
       on conflict (tenant_id, email) do nothing`,
    [tenant.id, email, email.split("@")[0], hashPassword(password)],
  );
  console.log(
    rowCount
      ? `✓ Newsroom "${outlet}" (${slug}) + admin ${email} created. Log in at /en/login.`
      : `Admin ${email} already exists for "${slug}" — nothing to do.`,
  );
} finally {
  await client.end();
}
