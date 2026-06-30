import assert from "node:assert/strict";
import { test } from "node:test";

import { assertPublicUrl } from "./ssrf";

test("assertPublicUrl rejects non-http(s) schemes", async () => {
  await assert.rejects(assertPublicUrl("ftp://example.com/x"));
  await assert.rejects(assertPublicUrl("file:///etc/passwd"));
  await assert.rejects(assertPublicUrl("not a url"));
});

test("assertPublicUrl rejects private / loopback / link-local literal IPs", async () => {
  for (const u of [
    "http://169.254.169.254/latest/meta-data/", // cloud metadata
    "http://127.0.0.1/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://[::1]/",
  ]) {
    await assert.rejects(assertPublicUrl(u), new RegExp("non-public"), `should block ${u}`);
  }
});

test("assertPublicUrl rejects hostnames that resolve to loopback", async () => {
  // localhost resolves locally (no network) to a loopback address.
  await assert.rejects(assertPublicUrl("http://localhost:8080/"));
});
