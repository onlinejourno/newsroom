import { test } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken, TOKEN_TTL_SECONDS } from "./session-token";

test("signToken → verifyToken roundtrip returns sub and tv", async () => {
  const token = await signToken("acct-1", 3);
  const claims = await verifyToken(token);
  assert.deepEqual(claims, { sub: "acct-1", tv: 3 });
});

test("tv defaults to 0 when omitted", async () => {
  const claims = await verifyToken(await signToken("acct-1"));
  assert.equal(claims?.tv, 0);
});

test("verifyToken rejects undefined / malformed", async () => {
  assert.equal(await verifyToken(undefined), null);
  assert.equal(await verifyToken(""), null);
  assert.equal(await verifyToken("no-dot"), null);
  assert.equal(await verifyToken("not-base64.bad-sig"), null);
});

test("verifyToken rejects a tampered signature", async () => {
  const token = await signToken("acct-1", 0);
  const dot = token.lastIndexOf(".");
  const tampered = `${token.slice(0, dot)}.${"A".repeat(token.length - dot - 1)}`;
  assert.equal(await verifyToken(tampered), null);
});

test("verifyToken rejects a tampered payload (sub swap)", async () => {
  const token = await signToken("acct-1", 0);
  const sig = token.slice(token.lastIndexOf(".") + 1);
  const forged = Buffer.from(
    JSON.stringify({ sub: "acct-evil", iat: 0, exp: 9_999_999_999, tv: 0 }),
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  assert.equal(await verifyToken(`${forged}.${sig}`), null);
});

test("verifyToken rejects an expired token", async () => {
  const now = Math.floor(Date.now() / 1000);
  // Forge claims with a past exp, signed by the real signer via a helper round:
  // sign a fresh token, then confirm exp is in the future, then craft expired.
  const expired = await signExpiredForTest("acct-1", now - 10);
  assert.equal(await verifyToken(expired), null);
});

test("TOKEN_TTL_SECONDS is 14 days (matches cookie maxAge)", () => {
  assert.equal(TOKEN_TTL_SECONDS, 60 * 60 * 24 * 14);
});

// Helper: re-implements the signing internals to mint a token whose exp is in
// the past, so the expiry branch is exercised without waiting 14 days.
async function signExpiredForTest(sub: string, exp: number): Promise<string> {
  const SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const json = JSON.stringify({ sub, iat: exp - 1, exp, tv: 0 });
  const payload = Buffer.from(json)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(payload),
  );
  const sig = Buffer.from(new Uint8Array(sigBuf))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${payload}.${sig}`;
}
