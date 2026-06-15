import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { seoAuditForUrl, upsertSeoAudit } from "@/lib/db";

const execFileP = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type SeoAudit = Record<string, unknown> & { error?: string; url?: string };

/** Run the full SEO + E-E-A-T audit CLI for a URL (server-side only). */
export async function runSeoAudit(
  url: string,
  opts: { trend?: string; need?: string; surfaces?: string[] } = {},
): Promise<SeoAudit> {
  if (!/^https?:\/\//i.test(url)) return { error: "URL must start with http(s)://" };
  const args = ["run", "--package", "onlinejourno-scoring", "onlinejourno-scoring",
    "audit", url, "--json"];
  if (opts.trend) args.push("--trend", opts.trend);
  if (opts.need) args.push("--need", opts.need);
  if (opts.surfaces?.length) args.push("--surfaces", opts.surfaces.join(","));
  try {
    const { stdout } = await execFileP("uv", args, {
      cwd: REPO_ROOT, timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(stdout) as SeoAudit;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cached read; runs + persists when missing or when force is set. */
export async function getOrRunSeoAudit(
  tenantId: string,
  url: string,
  opts: { trend?: string; need?: string; surfaces?: string[]; force?: boolean; storyId?: string | null } = {},
): Promise<SeoAudit> {
  if (!opts.force) {
    const cached = await seoAuditForUrl(tenantId, url);
    if (cached) return cached.audit as SeoAudit;
  }
  const audit = await runSeoAudit(url, opts);
  if (!audit.error) await upsertSeoAudit(tenantId, url, audit, opts.storyId ?? null);
  return audit;
}
