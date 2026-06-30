// SSRF guard for server-side fetches of user-supplied URLs (Node side).
// Mirrors the Python `onlinejourno_scoring.url_guard.safe_get` intent: only
// http(s), and the host must not resolve to a private/loopback/link-local/
// reserved/metadata address. Residual: DNS-rebinding TOCTOU (the downstream
// fetcher re-resolves) — this blocks the common direct-target case; pin the
// connection IP for full protection.
import { lookup } from "node:dns/promises";

const PRIVATE_V4: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0xff000000], // 0.0.0.0/8
  [0x0a000000, 0xff000000], // 10.0.0.0/8
  [0x7f000000, 0xff000000], // 127.0.0.0/8 loopback
  [0xa9fe0000, 0xffff0000], // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
  [0xac100000, 0xfff00000], // 172.16.0.0/12
  [0xc0a80000, 0xffff0000], // 192.168.0.0/16
  [0x64400000, 0xffc00000], // 100.64.0.0/10 CGNAT
  [0xe0000000, 0xf0000000], // 224.0.0.0/4 multicast
  [0xf0000000, 0xf0000000], // 240.0.0.0/4 reserved
];

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const x = Number(p);
    if (!Number.isInteger(x) || x < 0 || x > 255) return null;
    n = (n << 8) | x;
  }
  return n >>> 0;
}

function isPrivateIp(ip: string): boolean {
  const v4 = v4ToInt(ip);
  if (v4 !== null) return PRIVATE_V4.some(([base, mask]) => ((v4 & mask) >>> 0) === base);
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::") return true; // loopback / unspecified
  if (low.startsWith("fe80") || low.startsWith("fc") || low.startsWith("fd")) return true; // link-local, ULA
  if (low.startsWith("ff")) return true; // multicast
  const mapped = low.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

// Throws if `raw` is not a public http(s) URL. Call before handing a
// user-supplied URL to any server-side fetcher (or relaying it to one).
export async function assertPublicUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("URL must be http(s)");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isPrivateIp(host)) throw new Error("URL resolves to a non-public address");
  const addrs = await lookup(host, { all: true });
  if (addrs.length === 0) throw new Error("URL host did not resolve");
  for (const { address } of addrs) {
    if (isPrivateIp(address)) throw new Error("URL resolves to a non-public address");
  }
}
