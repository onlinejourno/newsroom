import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignalChips } from "@/components/SignalChips";
import { getAccount } from "@/lib/auth";
import {
  archiveMatches,
  journalistsForSignal,
  signalById,
} from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import { STATUS_META, assignableReporters, createLead, leadForSignal } from "@/lib/workflow";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function Stage({
  label,
  by,
  children,
}: {
  label: string;
  by: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ds-frame p-4">
      <div
        className="flex items-baseline justify-between gap-2 mb-2"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <p className="ds-label">{label}</p>
        <span className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
          {by}
        </span>
      </div>
      <div className="text-sm" style={{ fontFamily: "var(--font-body)" }}>
        {children}
      </div>
    </section>
  );
}

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tenantId = await currentTenantId();
  const signal = tenantId ? await signalById(tenantId, id) : null;

  if (!signal) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="ds-label">Signal not found.</p>
      </main>
    );
  }

  const e = signal.enrichment ?? {};
  const me = await getAccount();
  const canCommission = !!me && ["admin", "editor", "desk"].includes(me.role);

  async function commission(formData: FormData) {
    "use server";
    const tenantId = await currentTenantId();
    const me = await getAccount();
    const sig = tenantId ? await signalById(tenantId, id) : null;
    if (!tenantId || !me || !sig) return;
    if (!["admin", "editor", "desk"].includes(me.role)) return;
    // assigneeId is supplied by the T2 reporter selector; null when not chosen.
    const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
    await createLead({
      tenantId,
      actor: me,
      title: sig.headline ?? sig.url,
      // If a reporter is chosen up-front set origin "assigned" so the lead
      // lands in the Assigned lane; otherwise "requested" → Suggested.
      origin: assigneeId ? "assigned" : "requested",
      beat: sig.beat,
      bureau: me.bureau ?? null,
      signalId: id,
      assigneeId,
      trendScore: sig.trend_score,
      keywords: sig.enrichment?.analyse?.entities ?? [],
      topic: sig.enrichment?.classify?.topic ?? null,
    });
    redirect(`/${locale}/newslist` as Route);
  }

  // Reporter agency (ADR 0056): take a story up yourself — no commission needed.
  // It lands as an assigned-to-you lead; write it, then file.
  async function takeUp() {
    "use server";
    const tenantId = await currentTenantId();
    const me = await getAccount();
    const sig = tenantId ? await signalById(tenantId, id) : null;
    if (!tenantId || !me || !sig) return;
    await createLead({
      tenantId,
      actor: me,
      title: sig.headline ?? sig.url,
      origin: "self",
      assigneeId: me.id,
      beat: sig.beat,
      bureau: me.bureau ?? null,
      signalId: id,
      trendScore: sig.trend_score,
      keywords: sig.enrichment?.analyse?.entities ?? [],
      topic: sig.enrichment?.classify?.topic ?? null,
    });
    redirect(`/${locale}/newslist` as Route);
  }

  const [routed, archive, lead, reporters] = await Promise.all([
    journalistsForSignal(tenantId!, id),
    archiveMatches(tenantId!, e.analyse?.entities ?? []),
    leadForSignal(tenantId!, id),
    canCommission ? assignableReporters(tenantId!) : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const analyse = e.analyse ?? {};
  const classify = e.classify ?? {};
  const framing = e.framing ?? {};

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Signal</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {signal.headline ?? signal.url}
        </h1>
        <SignalChips signal={signal} />
        <p
          className="text-sm mt-3"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--color-fg-secondary)",
          }}
        >
          <a
            href={signal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open the record ↗
          </a>{" "}
          · published {formatDate(signal.published_at)}
        </p>
      </header>

      <p
        className="ds-label mb-3"
        title="The EIP pipeline, per signal: where it came from and what each layer added"
      >
        Provenance — what each layer added
      </p>

      {lead ? (
        <div
          className="ds-panel p-3 mb-4 text-sm flex flex-wrap items-center gap-3"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          <span className="ds-meta">Became a story</span>
          <span
            className="text-xs px-2 py-0.5 border font-semibold"
            style={{
              borderColor: STATUS_META[lead.status]?.color,
              color: STATUS_META[lead.status]?.color,
            }}
          >
            {STATUS_META[lead.status]?.label ?? lead.status}
          </span>
          {lead.assignee ? (
            <span style={{ color: "var(--color-fg-secondary)" }}>
              assigned to {lead.assignee}
            </span>
          ) : null}
          <Link
            href={`/${locale}/newslist` as Route}
            className="underline ml-auto"
            style={{ color: "var(--color-brand)" }}
          >
            View on the Newslist →
          </Link>
        </div>
      ) : me ? (
        <div className="flex flex-wrap gap-2 mb-4">
          <form action={takeUp}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--color-brand)", color: "white" }}
              title="Assign this to yourself and write it — no commission needed"
            >
              Take it up → I’ll write this
            </button>
          </form>
          {canCommission ? (
            <form action={commission} className="flex items-center gap-2">
              <select
                name="assigneeId"
                defaultValue=""
                className="text-sm border px-2 py-2"
                style={{ borderColor: "var(--color-frame)", background: "var(--color-bg)" }}
              >
                <option value="">— Commission (unassigned) —</option>
                {reporters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold border"
                style={{
                  borderColor: "var(--color-frame)",
                  color: "var(--color-fg-primary)",
                  background: "var(--color-bg-card)",
                }}
                title="Send it to the Newslist"
              >
                Commission → Newslist
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-3">
        <Stage label="① Source portal" by={signal.source_kind ?? "collector"}>
          <strong>{signal.source_name}</strong>
          {signal.source_family ? ` · family: ${signal.source_family}` : null}
          {signal.source_url ? (
            <>
              {" · "}
              <a
                className="underline"
                href={signal.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                portal
              </a>
            </>
          ) : null}
          <div
            className="text-xs mt-1"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            collected {formatDate(signal.fetched_at)} · language{" "}
            {signal.language}
          </div>
        </Stage>

        <Stage label="② Analyse" by="NLP / LLM">
          {analyse.summary ? <p className="mb-2">{analyse.summary}</p> : null}
          {(analyse.entities ?? []).length ? (
            <p>
              <strong>Entities:</strong> {(analyse.entities ?? []).join(" · ")}
            </p>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              Not yet enriched.
            </p>
          )}
          <p className="mt-1">
            <strong>Geo:</strong>{" "}
            {[signal.district, signal.region].filter(Boolean).join(", ") ||
              "not identified"}
          </p>
        </Stage>

        <Stage label="③ Classify" by="LLM">
          <p>
            <strong>Beat:</strong> {signal.beat ?? classify.beat ?? "—"} ·{" "}
            <strong>Reader need:</strong> {classify.user_need ?? "—"} ·{" "}
            <strong>Topic:</strong> {classify.topic ?? "—"}
          </p>
          {framing.frame ? (
            <p className="mt-1">
              <strong>PEJ frame:</strong> {framing.frame}
              {framing.rationale ? ` — ${framing.rationale}` : null}
            </p>
          ) : null}
        </Stage>

        <Stage label="④ Score" by="trend engine">
          {signal.trend_score != null ? (
            <p>
              <strong>Trend score:</strong> {signal.trend_score} — convergence
              across sources in the window (see{" "}
              <Link className="underline" href={`/${locale}/trends`}>
                Trends
              </Link>
              ).
            </p>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              No trend score yet — run <code>trends</code>.
            </p>
          )}
        </Stage>

        <Stage label="⑤ Route" by="beat / place match">
          {routed.length ? (
            <p>
              Reaches{" "}
              {routed.map((j, i) => (
                <span key={j.slug}>
                  {i > 0 ? ", " : ""}
                  <Link
                    className="underline"
                    href={`/${locale}/feed/${j.slug}`}
                  >
                    {j.name}
                  </Link>
                </span>
              ))}
              .
            </p>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              No journalist on this beat/place yet.
            </p>
          )}
        </Stage>

        <Stage label="⑥ Archive context" by="m-archive v1 — own coverage">
          {archive.length ? (
            <ul className="space-y-1">
              {archive.map((m) => (
                <li key={m.id}>
                  <a
                    className="underline"
                    href={m.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.headline ?? m.url}
                  </a>{" "}
                  <span style={{ color: "var(--color-fg-tertiary)" }}>
                    · {m.overlap} shared entit{m.overlap === 1 ? "y" : "ies"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              No prior coverage of these entities in the connected corpus —
              a digitised archive plugs in via the connector seam (ADR 0042).
            </p>
          )}
        </Stage>
      </div>
    </main>
  );
}
