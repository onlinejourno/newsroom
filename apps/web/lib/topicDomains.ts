import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type TopicDomains = {
  available: boolean;
  topic?: string;
  days?: number;
  source?: string;
  domains?: { domain: string; count: number }[];
  reason?: string;
};

export async function fetchTopicDomains(
  topic: string,
  days = 7,
): Promise<TopicDomains> {
  if (!topic.trim()) return { available: false, reason: "no topic" };
  try {
    const { stdout } = await execFileP(
      "uv",
      [
        "run",
        "--package",
        "onlinejourno-scoring",
        "onlinejourno-scoring",
        "topic-domains",
        topic,
        "--days",
        String(days),
        "--json",
      ],
      { cwd: REPO_ROOT, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );
    return JSON.parse(stdout) as TopicDomains;
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}
