// Server-side auth (ADR 0055): scrypt passwords, account queries, session
// cookie. Node-only (node:crypto) — never imported by middleware.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { Pool } from "pg";

import { SESSION_COOKIE, signToken, verifyToken } from "@/lib/session-token";

const globalForPool = globalThis as unknown as { __ojPool?: Pool };
function pool(): Pool {
  globalForPool.__ojPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
  return globalForPool.__ojPool;
}

export type Account = {
  id: string;
  tenant_id: string;
  demo: boolean;
  email: string;
  display_name: string | null;
  role: "admin" | "editor" | "desk" | "reporter" | "viewer";
  status: string;
  bureau: string | null;
  profile_slug: string | null;
  beats: string[];
  region: string | null;
};

// ── password ────────────────────────────────────────────────────────────
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Set a new password for an account (self-serve change; admin reset later).
export async function setPassword(accountId: string, newPassword: string): Promise<void> {
  await pool().query("update users set password_hash = $2 where id = $1", [
    accountId,
    hashPassword(newPassword),
  ]);
}

// ── session ─────────────────────────────────────────────────────────────
export async function startSession(accountId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signToken(accountId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  });
  await pool().query("update users set last_login_at = now() where id = $1", [
    accountId,
  ]);
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

const SELECT = `
  select u.id, u.tenant_id, u.demo, u.email, u.display_name, u.role, u.status, u.bureau,
         j.slug as profile_slug,
         coalesce(array(select jsonb_array_elements_text(j.beats)), '{}') as beats,
         j.region
    from users u
    left join journalist_profiles j on j.id = u.profile_id`;

export async function getAccount(): Promise<Account | null> {
  const jar = await cookies();
  const id = await verifyToken(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const { rows } = await pool().query<Account>(
    `${SELECT} where u.id = $1 and u.status = 'approved'`,
    [id],
  );
  return rows[0] ?? null;
}

export async function accountByEmail(
  tenantId: string,
  email: string,
): Promise<(Account & { password_hash: string | null }) | null> {
  const { rows } = await pool().query(
    `${SELECT.replace("j.region", "j.region, u.password_hash")}
       where u.tenant_id = $1 and lower(u.email) = lower($2)`,
    [tenantId, email],
  );
  return rows[0] ?? null;
}

/** Resolve a login by email across all tenants (one-newsroom-per-install: emails
 *  are globally unique in practice). Returns the full account + credential, so the
 *  caller has role/profile_slug/tenant_id for the post-login redirect. */
export async function userByEmail(
  email: string,
): Promise<(Account & { password_hash: string | null }) | null> {
  const { rows } = await pool().query(
    `${SELECT.replace("j.region", "j.region, u.password_hash")}
       where lower(u.email) = lower($1)
       order by u.created_at asc limit 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function accountIdByEmail(
  tenantId: string,
  email: string,
): Promise<string | null> {
  const { rows } = await pool().query<{ id: string }>(
    "select id from users where tenant_id = $1 and lower(email) = lower($2)",
    [tenantId, email],
  );
  return rows[0]?.id ?? null;
}

// ── registration / approval ───────────────────────────────────────────────
export async function tenantEmailDomain(tenantId: string): Promise<string | null> {
  const { rows } = await pool().query<{ d: string | null }>(
    "select config->>'email_domain' as d from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.d ?? null;
}

export async function createPendingAccount(args: {
  tenantId: string;
  email: string;
  displayName: string;
  password: string;
  role: string;
  bureau: string | null;
}): Promise<void> {
  await pool().query(
    `insert into users (tenant_id, email, display_name, password_hash, role, status, bureau)
     values ($1,$2,$3,$4,$5,'pending',$6)`,
    [
      args.tenantId,
      args.email,
      args.displayName,
      hashPassword(args.password),
      args.role,
      args.bureau,
    ],
  );
}

export async function listAccounts(
  tenantId: string,
): Promise<(Account & { last_login_at: Date | null })[]> {
  const { rows } = await pool().query(
    `${SELECT.replace("j.region", "j.region, u.last_login_at")}
       where u.tenant_id = $1 order by
         case u.status when 'pending' then 0 else 1 end, u.display_name`,
    [tenantId],
  );
  return rows;
}

export async function setAccountStatus(
  tenantId: string,
  id: string,
  status: string,
): Promise<void> {
  await pool().query(
    `update users set status = $3,
       approved_at = case when $3='approved' then now() else approved_at end
     where tenant_id = $1 and id = $2`,
    [tenantId, id, status],
  );
}

// Role → landing room (RBAC tier). Specific editor/desk views are follow-ons.
export function roomForRole(role: string, slug: string | null): string {
  switch (role) {
    case "admin":
      return "admin/users";
    case "editor":
      return "scores";
    case "desk":
      return "gaps";
    case "reporter":
      return slug ? `feed/${slug}` : "signals";
    default:
      return "signals";
  }
}

// ── read-only demo (public showcase, 2b) ──────────────────────────────────
// Guard lives in a pure module (no Next imports) so it's unit-testable.
export { ReadOnlyDemoError, ForbiddenError, assertWritable, assertAdmin } from "@/lib/writable";

/** Resolve the demo-viewer account for a tenant slug (public showcase). Returns
 *  the account id + the locale-room to land on, or null. Does NOT set a cookie —
 *  the /showcase Route Handler sets the session cookie on its redirect response
 *  (Next forbids cookie writes during a page render). */
export async function demoViewerSession(
  tenantSlug = "demo",
): Promise<{ accountId: string; room: string } | null> {
  const { rows } = await pool().query<{ id: string; role: string; profile_slug: string | null }>(
    `select u.id, u.role, j.slug as profile_slug
       from users u
       join tenants t on t.id = u.tenant_id
       left join journalist_profiles j on j.id = u.profile_id
      where t.slug = $1 and u.demo = true and u.status = 'approved'
      order by u.created_at limit 1`,
    [tenantSlug],
  );
  const v = rows[0];
  if (!v) return null;
  return { accountId: v.id, room: roomForRole(v.role, v.profile_slug) };
}
