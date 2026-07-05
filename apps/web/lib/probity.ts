// m-probity client (ADR 0052) — the platform talks to Tare
// ("Digital Mirror") engine over HTTP. The engine stays its own OSS service
// (Express + Playwright); we POST a URL, poll for the written JSON report,
// and surface the scores. On-demand only — a scan takes 15–40s.

import { assertPublicUrl } from "@/lib/ssrf";

const PROBITY_URL = process.env.PROBITY_URL ?? "http://localhost:4870";

export type ProbityResult = {
  reportUrl: string;
  overall: number;
  overallGrade: string;
  dimensions: Record<string, number>;
  flags: { id?: string; label?: string; severity?: string; title?: string }[];
  openness?: number;
  paywallScore?: number;
  summary?: {
    totalRequests?: number;
    thirdPartyRequests?: number;
    totalBytes?: number;
    trackers?: number;
  };
  error?: string;
};

export async function probityScan(url: string): Promise<ProbityResult> {
  const fail = (error: string) => ({ error }) as ProbityResult;
  // On-demand audits are disabled in prod (mirrors lib/analyze, lib/seoAudit).
  if (process.env.DISABLE_ONDEMAND_AUDIT === "1") return fail("on-demand audit is disabled");
  if (!/^https?:\/\//i.test(url)) return fail("URL must start with http(s)://");
  // SSRF: the engine fetches this URL — reject non-public targets before relaying.
  try {
    await assertPublicUrl(url);
  } catch {
    return fail("URL must be a public http(s) address");
  }

  let jobId: string;
  try {
    const res = await fetch(`${PROBITY_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(body.error ?? `probity engine returned ${res.status}`);
    }
    jobId = (await res.json()).jobId;
  } catch {
    return fail(
      "probity engine offline — start Tare (PORT=4870 npm start) " +
        "or set PROBITY_URL",
    );
  }

  // The engine writes <jobId>.json at ~95% progress; poll for it.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    try {
      const res = await fetch(`${PROBITY_URL}/api/download/${jobId}/json`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) continue;
      const report = await res.json();
      const s = report.scores ?? {};
      const t = report.totals ?? report.requestSummary ?? {};
      // overallGrade is {grade,label,...} in current engine builds, a string
      // in older ones — normalise to the label.
      const grade =
        typeof s.overallGrade === "object" && s.overallGrade
          ? (s.overallGrade.label ?? s.overallGrade.grade ?? "")
          : (s.overallGrade ?? "");
      return {
        reportUrl: `${PROBITY_URL}/api/download/${jobId}/html`,
        overall: s.overall ?? 0,
        overallGrade: grade,
        dimensions: s.dimensions ?? {},
        flags: s.flags ?? [],
        openness: s.openness,
        paywallScore: s.paywallScore,
        summary: {
          totalRequests: t.totalRequests ?? report.requests?.length,
          thirdPartyRequests: t.thirdPartyRequests,
          totalBytes: t.totalBytes ?? t.transferredBytes,
          trackers: (report.trackers ?? []).length || undefined,
        },
      };
    } catch {
      // keep polling until the deadline
    }
  }
  return fail("scan timed out after 90s (heavy page or engine stalled)");
}
