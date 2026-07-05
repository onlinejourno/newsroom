import { SignalChips, TagLegend } from "@/components/SignalChips";
import { Card } from "@/components/ui/card";
import {
  distinctSignalBeats,
  fetchLatestSignals,
  needMixCounts,
} from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";
const LIMIT = 20;
const BODY_TRUNCATE_CHARS = 280;
const MIX_WINDOW_HOURS = 168;

// Need-mix panel (ADR 0049): the reader-need balance of the classified inflow,
// with the classic overproduction flag.
const NEED_ORDER = ["know", "understand", "feel", "do"] as const;
const NEED_COLORS: Record<string, string> = {
  know: "var(--color-info)",
  understand: "var(--color-magenta)",
  feel: "var(--color-amber-accent)",
  do: "var(--color-ioj-green-600)",
};
const OVERPRODUCTION_SHARE = 0.6;

function NeedMixPanel({ rows }: { rows: { user_need: string; n: number }[] }) {
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (total === 0) return null;
  const share = (need: string) =>
    (rows.find((r) => r.user_need === need)?.n ?? 0) / total;
  const flags: string[] = [];
  for (const need of NEED_ORDER) {
    if (share(need) > OVERPRODUCTION_SHARE) {
      flags.push(
        need === "know"
          ? `'Update me' overproduction (${Math.round(share(need) * 100)}%)`
          : `'${need}' heavy (${Math.round(share(need) * 100)}%)`,
      );
    }
  }
  if (total >= 5 && share("do") === 0) {
    flags.push("no actionable ('do') coverage — promising gap");
  }
  return (
    <Card
      className="mb-10"
      style={{ fontFamily: "var(--font-ui)" }}
      eyebrow={`Need mix · last ${MIX_WINDOW_HOURS / 24} days · ${total} classified`}
    >
      <div
        className="flex h-3 w-full overflow-hidden rounded-full mb-2"
        style={{ background: "var(--color-border)" }}
      >
        {NEED_ORDER.map((need) =>
          share(need) > 0 ? (
            <div
              key={need}
              style={{
                width: `${share(need) * 100}%`,
                background: NEED_COLORS[need],
              }}
              title={`${need}: ${Math.round(share(need) * 100)}%`}
            />
          ) : null,
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--color-fg-secondary)" }}>
        {NEED_ORDER.map(
          (need) => `${need} ${Math.round(share(need) * 100)}%`,
        ).join(" · ")}
      </p>
      {flags.length > 0 ? (
        <p className="text-xs mt-1 font-semibold" style={{ color: "var(--color-amber-600)" }}>
          ⚠ {flags.join("; ")}
        </p>
      ) : null}
    </Card>
  );
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

/**
 * Strip HTML tags and decode the common entities that show up in RSS
 * summaries, then collapse whitespace. RSS feeds frequently put marked-up
 * HTML in `<description>` / `<summary>`; rendering it as plain text avoids
 * raw `<p>` tags showing in the UI and prevents truncation from cutting
 * mid-tag.
 */
function stripHtml(value: string): string {
  return value
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  // Trim at the nearest word boundary before `max` so truncation does not
  // cut a word in half.
  const slice = value.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

export default async function SignalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ beat?: string; msm?: string }>;
}) {
  const { locale } = await params;
  const { beat, msm } = await searchParams;
  // Original sources dominate by default (ADR 0050); MSM test feeds opt-in.
  const primaryOnly = msm !== "1";
  const tenantId = await currentTenantId();

  if (!tenantId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <p className="ds-label mb-2">Setup required</p>
          <h1
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Database is not seeded.
          </h1>
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-fg-secondary)",
            }}
          >
            Apply migrations under <code>infra/migrations/</code> and rerun the
            ingest CLI to populate the <code>signals</code> table.
          </p>
        </div>
      </main>
    );
  }

  const [signals, mixRows, beats] = await Promise.all([
    fetchLatestSignals(tenantId, LIMIT, beat || null, primaryOnly),
    needMixCounts(tenantId, MIX_WINDOW_HOURS),
    distinctSignalBeats(tenantId),
  ]);

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-10">
        <p className="ds-label mb-2">OnlineJourno · Signals</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Latest signals
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          {signals.length} most recent.
          Each signal is enriched by the Analyse + Classify layers — beat,
          place, entities, and the{" "}
          <strong>reader need</strong> it serves (Know · Understand · Feel ·
          Do).
        </p>
      </header>

      <hr className="ds-rule mb-10" />

      <TagLegend />

      <form
        method="get"
        className="mb-6 flex items-center gap-2 text-sm"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <label>
          Beat:{" "}
          <select
            name="beat"
            defaultValue={beat ?? ""}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            <option value="">all beats</option>
            {beats.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            name="msm"
            value="1"
            defaultChecked={!primaryOnly}
          />
          Include own-site + competitor feeds
        </label>
        <button
          type="submit"
          className="px-3 py-1 border font-semibold"
          style={{ borderColor: "var(--color-rule)" }}
        >
          Apply
        </button>
      </form>

      <NeedMixPanel rows={mixRows} />

      {signals.length === 0 ? (
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          No signals yet. Run{" "}
          <code>onlinejourno-ingest collect --tenant self</code> to ingest the
          first ones.
        </p>
      ) : (
        <ol className="space-y-8 list-none">
          {signals.map((signal) => (
            <li key={signal.id}>
              <p className="ds-label mb-1">
                {signal.source_name ?? "Unknown source"} ·{" "}
                {formatDate(signal.published_at)}
              </p>
              <a
                href={signal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xl md:text-2xl font-bold leading-snug"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-fg-primary)",
                }}
              >
                {signal.headline ?? signal.url}
              </a>
              <SignalChips signal={signal} />
              {signal.body_text ? (
                <p
                  className="mt-2 text-base"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-fg-secondary)",
                  }}
                >
                  {truncate(stripHtml(signal.body_text), BODY_TRUNCATE_CHARS)}
                </p>
              ) : null}
              <p
                className="mt-3 text-xs"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--color-fg-tertiary)",
                }}
              >
                Fetched {formatDate(signal.fetched_at)} · {signal.language} ·{" "}
                <a className="underline" href={`/${locale}/signal/${signal.id}`}>
                  detail
                </a>
              </p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
