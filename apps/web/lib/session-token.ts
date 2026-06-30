// HMAC-signed session token, Web Crypto only so it runs in BOTH edge
// middleware and node server actions (ADR 0055). Token = "<accountId>.<sig>".
// Fail closed: a misconfigured prod deploy must NOT fall back to a public,
// forgeable signing key (anyone knowing it could forge a session for any account).
// Resolved LAZILY (not at module load) so `next build` — which runs with
// NODE_ENV=production but without the runtime SESSION_SECRET — doesn't throw.
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

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function signToken(accountId: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await key(),
    new TextEncoder().encode(accountId),
  );
  return `${accountId}.${b64url(sig)}`;
}

export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const id = token.slice(0, dot);
  const expected = await signToken(id);
  // constant-time-ish: compare full tokens
  return token === expected ? id : null;
}

export const SESSION_COOKIE = "oj_session";
