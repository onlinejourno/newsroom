// Render-safe URL guard — only http(s) URLs may go into an href. Blocks
// javascript:/data:/vbscript: etc., which React does NOT sanitize in hrefs (a
// stored-XSS vector when the URL comes from ingested third-party content).
// Mirrors the standalone audit engine's _safe_url scheme allow-list.
export function safeUrl(url: string | null | undefined): string {
  return url && /^https?:\/\//i.test(url.trim()) ? url : "#";
}
