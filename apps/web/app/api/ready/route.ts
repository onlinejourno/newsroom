import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Readiness check — deep health.
 *
 * Unlike /api/health (liveness: "is the process up?"), this verifies the app
 * can actually reach its database. Returns 200 {status:"ok"} when a trivial
 * query succeeds, 503 {status:"degraded"} when the DB is unreachable or the
 * credentials are wrong.
 *
 * The external uptime monitor (.github/workflows/uptime.yml) targets THIS
 * endpoint so a DB-credential / connectivity outage — which leaves /api/health
 * green while every DB-backed page 500s — actually fires an alert.
 *
 * Fly's HTTP liveness check stays on /api/health: a DB outage must NOT cause
 * Fly to restart an otherwise-healthy process.
 */
export const dynamic = "force-dynamic";

const g = globalThis as unknown as { __ojReadyPool?: Pool };
function pool(): Pool {
  g.__ojReadyPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return g.__ojReadyPool;
}

export async function GET() {
  const started = Date.now();
  try {
    await pool().query("select 1");
    return NextResponse.json(
      {
        status: "ok",
        service: "onlinejourno-web",
        db: "ok",
        ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "onlinejourno-web",
        db: "error",
        error: err instanceof Error ? err.message : String(err),
        ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
