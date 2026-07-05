import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import {
  type OutletKeyword,
  cachedOutletKeywords,
  upsertOutletKeywords,
} from "@/lib/db";

const execFileP = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type OutletKeywords = {
  available: boolean;
  keywords?: OutletKeyword[];
  reason?: string;
};

export async function fetchOutletKeywords(
  domain: string,
): Promise<OutletKeywords> {
  if (!domain.trim()) return { available: false, reason: "no domain" };
  try {
    const { stdout } = await execFileP(
      "uv",
      [
        "run",
        "--package",
        "onlinejourno-scoring",
        "onlinejourno-scoring",
        "ranking-keywords",
        domain,
        "--json",
      ],
      { cwd: REPO_ROOT, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );
    return JSON.parse(stdout) as OutletKeywords;
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function getOrFetchOutletKeywords(
  tenantId: string,
  domain: string,
): Promise<OutletKeyword[]> {
  const cached = await cachedOutletKeywords(tenantId, domain);
  if (cached !== null) return cached;

  const result = await fetchOutletKeywords(domain);
  if (!result.available || !result.keywords) return [];

  await upsertOutletKeywords(tenantId, domain, result.keywords);
  return result.keywords;
}
