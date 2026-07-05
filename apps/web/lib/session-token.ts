// middleware and node server actions (ADR 0055).
// Token = "<payload>.<sig>" where payload = b64url(JSON{sub,iat,exp,tv}).
//   sub = account id, iat/exp = unix seconds, tv = users.token_version.
// exp bounds a leaked cookie's lifetime; tv enables server-side revocation
// (bump users.token_version to invalidate a user's live sessions). The tv
// check is enforced in getAccount() (node, has DB) — middleware on the edge
// cannot reach Postgres, so it relies on the signature + exp gate alone.
//
// Fail closed: a misconfigured prod deploy must NOT fall back to a public,
// forgeable signing key (anyone knowing it could forge a session for any
// account). Resolved LAZILY (not at module load) so `next build` — which runs
// with NODE_ENV=production but without the runtime SESSION_SECRET — doesn't throw.
let _secret: string | null = null;
function secret(): string {
  if (_secret !== null) return _secret;
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return (_secret = s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (>= 16 chars) in production");
  }
  return (_secret = "dev-only-insecure-secret-change-me");
}

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days, matches cookie maxAge

type Claims = { sub: string; iat: number; exp: number; tv: number };

async function key(usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

function b64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signToken(accountId: string, tv = 0): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Claims = { sub: accountId, iat: now, exp: now + TOKEN_TTL_SECONDS, tv };
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await key(["sign"]),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${b64url(sig)}`;
}

export async function verifyToken(
  token: string | undefined,
): Promise<{ sub: string; tv: number } | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(["verify"]),
      unb64url(sig),
      new TextEncoder().encode(payload),
    );
  } catch {
    return null; // malformed base64 in the signature segment
  }
  if (!valid) return null;

  let claims: Claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(unb64url(payload)));
  } catch {
    return null;
  }
  if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
  return { sub: claims.sub, tv: typeof claims.tv === "number" ? claims.tv : 0 };
}

export const SESSION_COOKIE = "oj_session";
