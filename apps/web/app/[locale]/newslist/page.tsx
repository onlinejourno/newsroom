import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAccount } from "@/lib/auth";
import { tenantIdForSlug } from "@/lib/db";
import {
  STATUS_META,
  type Lead,
  type Status,
  bureaus,
  createLead,
  listLeads,
  transition,
} from "@/lib/workflow";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const COLUMNS: Status[] = ["pitched", "assigned", "filed", "approved", "published"];
const IMPORTANCE_COLOR: Record<string, string> = {
  urgent: "#dc2626",
  high: "#d97706",
  normal: "#6b7280",
  low: "#9ca3af",
};

function eta(d: Date | null): string {
  if (!d) return "no ETA";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));
}

// Which status this viewer can move a lead TO, given its current state.
function nextMoves(status: string, isDesk: boolean, isAssignee: boolean): Status[] {
  if (status === "pitched" && isDesk) return ["assigned", "killed"];
  if (status === "assigned" && (isDesk || isAssignee)) return ["filed"];
  if (status === "filed" && isDesk) return ["approved", "killed"];
  if (status === "approved" && isDesk) return ["published"];
  return [];
}

export default async function NewslistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bureau?: string; mine?: string }>;
}) {
  const { locale } = await params;
  const { bureau, mine } = await searchParams;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const me = await getAccount();
  if (!tenantId || !me) redirect(`/${locale}/login` as Route);

  const isDesk = ["admin", "editor", "desk"].includes(me!.role);
  const [leads, bureauList] = await Promise.all([
    listLeads(tenantId!, {
      bureau: bureau || null,
      mineId: mine === "1" ? me!.id : null,
    }),
    bureaus(tenantId!),
  ]);

  async function addLead(formData: FormData) {
    "use server";
    const tenantId = await tenantIdForSlug(TENANT_SLUG);
    const me = await getAccount();
    if (!tenantId || !me) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const desk = ["admin", "editor", "desk"].includes(me.role);
    await createLead({
      tenantId,
      actor: me,
      title,
      origin: desk ? "requested" : "pitched",
      beat: String(formData.get("beat") ?? "").trim() || null,
      bureau: me.bureau ?? null,
      importance: String(formData.get("importance") ?? "normal"),
    });
    redirect(`/${locale}/newslist` as Route);
  }

  async function move(formData: FormData) {
    "use server";
    const tenantId = await tenantIdForSlug(TENANT_SLUG);
    const me = await getAccount();
    if (!tenantId || !me) return;
    await transition(
      tenantId,
      me,
      String(formData.get("id")),
      String(formData.get("to")) as Status,
    );
    redirect(`/${locale}/newslist` as Route);
  }

  const byStatus = (s: string) => leads.filter((l) => l.status === s);

  const card = (l: Lead) => {
    const moves = nextMoves(l.status, isDesk, false);
    return (
      <div key={l.id} className="ds-panel p-3 mb-2 text-sm">
        <div className="flex items-center gap-2 mb-1" style={{ fontFamily: "var(--font-ui)" }}>
          <span
            title={`importance: ${l.importance}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: IMPORTANCE_COLOR[l.importance],
              display: "inline-block",
            }}
          />
          {l.trend_score != null ? (
            <span className="text-xs" style={{ color: "#dc2626" }}>
              🔥 {l.trend_score}
            </span>
          ) : null}
          <span className="text-xs ml-auto" style={{ color: "var(--color-fg-tertiary)" }}>
            {l.origin}
          </span>
        </div>
        <p className="font-semibold leading-snug" style={{ fontFamily: "var(--font-display)" }}>
          {l.signal_id ? (
            <a className="hover:underline" href={`/${locale}/signal/${l.signal_id}`}>
              {l.title}
            </a>
          ) : (
            l.title
          )}
        </p>
        <p className="text-xs mt-1" style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}>
          {[l.beat, l.bureau].filter(Boolean).join(" · ")}
          {l.assignee ? ` · ${l.assignee}` : ""}
        </p>
        <p className="text-xs" style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-tertiary)" }}>
          ETA {eta(l.eta)}
          {l.on_time === true ? " · ✅ on time" : l.on_time === false ? " · ⚠ late" : ""}
          {l.status === "published" && l.story_id ? (
            <>
              {" · "}
              <a className="underline" href={`/${locale}/scores`}>
                audit
              </a>
            </>
          ) : null}
        </p>
        {l.keywords.length ? (
          <p className="text-xs mt-1" style={{ color: "var(--color-fg-tertiary)" }}>
            {l.keywords.slice(0, 4).join(" · ")}
          </p>
        ) : null}
        {moves.length ? (
          <div className="flex gap-1 mt-2 flex-wrap">
            {moves.map((to) => (
              <form action={move} key={to}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="to" value={to} />
                <button
                  type="submit"
                  className="text-xs px-2 py-0.5 border font-semibold"
                  style={{ borderColor: STATUS_META[to].color, color: STATUS_META[to].color }}
                >
                  → {STATUS_META[to].label}
                </button>
              </form>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Newslist</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Newslist · signal → published
        </h1>
        <p
          className="text-base max-w-3xl"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-secondary)" }}
        >
          Every story in flight, the state it&rsquo;s in, who&rsquo;s filing it,
          its ETA and whether it&rsquo;ll catch the trend — visible to the whole
          desk (ADR 0056). {leads.length} leads.
        </p>
      </header>

      {/* How to read a card — decode the markers so the board explains itself. */}
      <div
        className="ds-panel p-3 mb-5 text-xs flex flex-wrap items-center gap-x-6 gap-y-2"
        style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
      >
        <span className="ds-meta">How to read a card</span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#dc2626", display: "inline-block" }} /> urgent
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#d97706", display: "inline-block", marginLeft: 6 }} /> high
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#6b7280", display: "inline-block", marginLeft: 6 }} /> normal
          <span style={{ color: "var(--color-fg-tertiary)" }}>— importance</span>
        </span>
        <span>🔥 <span style={{ color: "var(--color-fg-tertiary)" }}>trend score — riding a moving topic</span></span>
        <span>
          <strong>pitched / requested / assigned</strong>{" "}
          <span style={{ color: "var(--color-fg-tertiary)" }}>— how it entered</span>
        </span>
        <span>✅ on time · ⚠ late <span style={{ color: "var(--color-fg-tertiary)" }}>vs its ETA</span></span>
        <span style={{ color: "var(--color-fg-tertiary)" }}>columns = its stage, signal → published</span>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6" style={{ fontFamily: "var(--font-ui)" }}>
        <form action={addLead} className="flex flex-wrap gap-2 items-end">
          <input
            name="title"
            required
            placeholder={isDesk ? "Commission a story…" : "Pitch a story…"}
            className="border rounded-sm px-3 py-2 text-sm min-w-64"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          />
          <input
            name="beat"
            placeholder="beat"
            className="border rounded-sm px-2 py-2 text-sm w-28"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          />
          <select
            name="importance"
            className="border rounded-sm px-2 py-2 text-sm"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          >
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
            <option value="low">low</option>
          </select>
          <button
            type="submit"
            className="px-3 py-2 rounded-sm text-sm font-semibold"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            {isDesk ? "Commission" : "Pitch"}
          </button>
        </form>
        <span className="text-xs flex gap-3" style={{ color: "var(--color-fg-tertiary)" }}>
          <a className="underline" href={`/${locale}/newslist`}>all</a>
          <a className="underline" href={`/${locale}/newslist?mine=1`}>mine</a>
          {bureauList.map((b) => (
            <a key={b} className="underline" href={`/${locale}/newslist?bureau=${encodeURIComponent(b)}`}>
              {b}
            </a>
          ))}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {COLUMNS.map((s) => (
          <div key={s}>
            <p
              className="text-xs uppercase tracking-wide font-bold mb-2 pb-1 flex items-center gap-2"
              style={{ color: STATUS_META[s].color, borderBottom: `2px solid ${STATUS_META[s].color}` }}
            >
              <span style={{ width: 8, height: 8, background: STATUS_META[s].color, display: "inline-block" }} />
              {STATUS_META[s].label} · {byStatus(s).length}
            </p>
            {byStatus(s).map(card)}
          </div>
        ))}
      </div>
    </main>
  );
}
