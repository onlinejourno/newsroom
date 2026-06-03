import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 *
 * Used by:
 *   - Fly.io HTTP service health checks (apps/web/fly.toml).
 *   - External uptime monitors (e.g. Better Uptime) hitting GET /api/health.
 *
 * Returns 200 with a small JSON payload when the server can respond.
 * Intentionally does NOT touch the database, agents, or external services —
 * it answers "is this process up?" not "is the whole platform healthy?".
 * Deep health (db, agents, queue) lives in a separate /api/ready endpoint
 * to be added when those subsystems exist.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "onlinejourno-web",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
