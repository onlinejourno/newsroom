import { test } from "node:test";
import assert from "node:assert/strict";
import { safeUrl } from "./url";

test("safeUrl passes http(s) and blocks dangerous schemes", () => {
  assert.equal(safeUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeUrl("http://example.com"), "http://example.com");
  assert.equal(safeUrl("HTTPS://EXAMPLE.com"), "HTTPS://EXAMPLE.com");
  // XSS vectors → neutralised to "#"
  assert.equal(safeUrl("javascript:alert(1)"), "#");
  assert.equal(safeUrl("  javascript:alert(1)"), "#"); // leading whitespace
  assert.equal(safeUrl("data:text/html,<script>"), "#");
  assert.equal(safeUrl("vbscript:msgbox"), "#");
  assert.equal(safeUrl("/relative/path"), "#"); // not absolute http(s)
  assert.equal(safeUrl(null), "#");
  assert.equal(safeUrl(""), "#");
});
