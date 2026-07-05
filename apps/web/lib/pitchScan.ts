// apps/web/lib/pitchScan.ts — server-only bridge to the pitch-scan CLI.
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// Repo root: apps/web → ../../
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type PitchEntity = { type: string; name: string };
export type PitchScan = {
  entities: PitchEntity[];
  topic: string | null;
  merit: number | null;
  reach: number;
  potential: number;
  archival_weight: number;
  pitch_weight: number;
  pitch_why: string;
  degraded: boolean;
  error?: string;
};

/** Run the pitch-scan CLI for a pitch text (server-side only, dev/demo). */
export async function scanPitch(
  tenant: string,
  text: string,
  conviction: "low" | "normal" | "high" = "normal",
): Promise<PitchScan> {
  if (!text.trim()) {
    return {
      entities: [],
      topic: null,
      merit: null,
      reach: 0,
      potential: 0,
      archival_weight: 0,
      pitch_weight: 0,
      pitch_why: "",
      degraded: false,
      error: "empty pitch",
    };
  }
  // v1: on-demand scan shells `uv run`, absent from the Node-only prod image.
  // Disabled via env in prod (fly.toml [env]); unset locally so dev keeps working.
  if (process.env.DISABLE_ONDEMAND_AUDIT === "1") {
    return {
      entities: [],
      topic: null,
      merit: null,
      reach: 0,
      potential: 0,
      archival_weight: 0,
      pitch_weight: 0,
      pitch_why: "",
      degraded: false,
      error: "On-demand audit isn't enabled in this deployment yet.",
    };
  }
  const args = [
    "run",
    "--package",
    "onlinejourno-agents",
    "onlinejourno-agents",
    "pitch-scan",
    "--tenant",
    tenant,
    "--text",
    text,
    "--conviction",
    conviction,
    "--json",
  ];
  try {
    const { stdout } = await execFileP("uv", args, {
      cwd: REPO_ROOT,
      timeout: 45_000,
      maxBuffer: 1024 * 1024,
    });
    const line = stdout.trim().split("\n").pop() ?? "{}";
    const parsed = JSON.parse(line) as PitchScan;
    // Empty/malformed stdout ("{}", early-exit, stderr-only error) parses to an
    // object with no numeric pitch_weight — treat as degraded, not fake success.
    if (typeof parsed.pitch_weight !== "number") {
      return {
        entities: [],
        topic: null,
        merit: null,
        reach: 0,
        potential: 0,
        archival_weight: 0,
        pitch_weight: 0,
        pitch_why: "",
        degraded: true,
        error: "empty or malformed scan output",
      };
    }
    return parsed;
  } catch (err) {
    return {
      entities: [],
      topic: null,
      merit: null,
      reach: 0,
      potential: 0,
      archival_weight: 0,
      pitch_weight: 0,
      pitch_why: "",
      degraded: true,
      error: `scan failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`,
    };
  }
}
