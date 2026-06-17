import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// Repo root: apps/web → ../../
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type AnalyzeChannel = {
  score: number;
  grade: string;
  top_fix: string | null;
  signals: { name: string; value: number; max: number; note: string }[];
};

export type AnalyzeResult = {
  url: string;
  title: string;
  word_count: number | null;
  composite: number;
  channels: Record<string, AnalyzeChannel>;
  user_need?: string;
  priority_surfaces?: string[];
  top_fix?: string | null;
  error?: string;
};

/** Run the Channel Audit CLI for a URL (server-side only, dev/demo). */
export async function analyzeUrl(
  url: string,
  need?: string | null,
): Promise<AnalyzeResult> {
  if (!/^https?:\/\//i.test(url)) {
    return { error: "URL must start with http(s)://" } as AnalyzeResult;
  }
  // v1: on-demand audit shells `uv run`, absent from the Node-only prod image.
  // Disabled via env in prod (fly.toml [env]); unset locally so dev keeps working.
  if (process.env.DISABLE_ONDEMAND_AUDIT === "1") {
    return { error: "On-demand audit isn't enabled in this deployment yet.", url } as AnalyzeResult;
  }
  const args = [
    "run",
    "--package",
    "onlinejourno-agents",
    "onlinejourno-agents",
    "analyze-url",
    url,
    "--json",
  ];
  if (need && ["know", "understand", "feel", "do"].includes(need)) {
    args.push("--need", need);
  }
  try {
    const { stdout } = await execFileP("uv", args, {
      cwd: REPO_ROOT,
      timeout: 45_000,
      maxBuffer: 1024 * 1024,
    });
    const line = stdout.trim().split("\n").pop() ?? "{}";
    return JSON.parse(line) as AnalyzeResult;
  } catch (err) {
    return {
      error: `analysis failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`,
    } as AnalyzeResult;
  }
}
