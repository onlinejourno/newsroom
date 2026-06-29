// Story-lead state machine (ADR 0056) — the signal→published workflow.
import { Pool } from "pg";

import type { Account } from "@/lib/auth";
import { calendarEventById, linkCalendarEventLead } from "@/lib/db";

const globalForPool = globalThis as unknown as { __ojPool?: Pool };
function pool(): Pool {
  globalForPool.__ojPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
  return globalForPool.__ojPool;
}

export const STATUSES = [
  "idea",
  "pitched",
  "assigned",
  "filed",
  "approved",
  "published",
] as const;
export type Status = (typeof STATUSES)[number] | "killed";

export const STATUS_META: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "#6b7280" },
  pitched: { label: "Pitched", color: "#7c3aed" },
  assigned: { label: "Assigned", color: "#2563eb" },
  filed: { label: "Filed", color: "#d97706" },
  approved: { label: "Approved", color: "#0d9488" },
  published: { label: "Published", color: "#16a34a" },
  killed: { label: "Killed", color: "#dc2626" },
};

export type Lead = {
  id: string;
  title: string;
  beat: string | null;
  bureau: string | null;
  origin: string;
  status: string;
  importance: string;
  signal_id: string | null;
  story_id: string | null;
  assignee_id: string | null;
  assignee: string | null;
  commissioner: string | null;
  pitcher: string | null;
  story_url: string | null;
  target_surfaces: string[];
  plan_approval: string;
  eta: Date | null;
  trend_score: number | null;
  keywords: string[];
  topic: string | null;
  note: string | null;
  created_at: Date;
  published_at: Date | null;
  on_time: boolean | null;
  // Pitch-scan fields (Task 9)
  pitch_weight: number | null;
  pitch_why: string | null;
  entities: unknown[];
};

const SELECT = `
  select l.id, l.title, l.beat, l.bureau, l.origin, l.status, l.importance,
         l.signal_id, l.story_id, l.assignee_id, l.eta, l.trend_score, l.keywords, l.topic,
         l.note, l.created_at, l.published_at,
         l.pitch_weight, l.pitch_why, l.entities,
         a.display_name as assignee, c.display_name as commissioner,
         p.display_name as pitcher, s.url as story_url,
         l.target_surfaces, l.plan_approval,
         case when l.eta is null or l.published_at is null then null
              else l.published_at <= l.eta end as on_time
    from story_leads l
    left join users a on a.id = l.assignee_id
    left join users c on c.id = l.commissioner_id
    left join users p on p.id = l.created_by
    left join stories s on s.id = l.story_id`;

export async function listLeads(
  tenantId: string,
  opts: { bureau?: string | null; beat?: string | null; mineId?: string | null } = {},
): Promise<Lead[]> {
  const { rows } = await pool().query<Lead>(
    `${SELECT}
      where l.tenant_id = $1 and l.status <> 'killed'
        and ($2::text is null or l.bureau = $2)
        and ($3::text is null or l.beat = $3)
        and ($4::uuid is null or l.assignee_id = $4)
      order by l.created_at desc`,
    [tenantId, opts.bureau ?? null, opts.beat ?? null, opts.mineId ?? null],
  );
  return rows;
}

export async function bureaus(tenantId: string): Promise<string[]> {
  const { rows } = await pool().query<{ bureau: string }>(
    "select distinct bureau from story_leads where tenant_id=$1 and bureau is not null order by 1",
    [tenantId],
  );
  return rows.map((r) => r.bureau);
}

// Reporters a lead can be assigned to (the people who file stories).
export async function assignableReporters(
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  const { rows } = await pool().query<{ id: string; name: string }>(
    `select id, coalesce(display_name, email) as name
       from users
      where tenant_id = $1 and status = 'approved'
        and role in ('reporter', 'desk')
      order by name`,
    [tenantId],
  );
  return rows;
}

// The live lead a signal became, if any (spine cross-link: signal → its lead).
export async function leadForSignal(
  tenantId: string,
  signalId: string,
): Promise<{ id: string; status: string; assignee: string | null } | null> {
  const { rows } = await pool().query<{
    id: string;
    status: string;
    assignee: string | null;
  }>(
    `select l.id, l.status, a.display_name as assignee
       from story_leads l
       left join users a on a.id = l.assignee_id
      where l.tenant_id = $1 and l.signal_id = $2 and l.status <> 'killed'
      order by l.created_at desc
      limit 1`,
    [tenantId, signalId],
  );
  return rows[0] ?? null;
}

// Create a lead. Editors/desk commission (assigned/requested); reporters pitch.
export async function createLead(args: {
  tenantId: string;
  actor: Account;
  title: string;
  origin: "assigned" | "pitched" | "requested" | "self";
  beat?: string | null;
  bureau?: string | null;
  importance?: string;
  signalId?: string | null;
  assigneeId?: string | null;
  eta?: string | null;
  trendScore?: number | null;
  keywords?: string[];
  topic?: string | null;
  note?: string | null;
  // Pitch-scan fields (only set for reporter pitches; all nullable for commission path)
  entities?: unknown | null;
  reach?: number | null;
  potential?: number | null;
  archival_weight?: number | null;
  conviction?: string | null;
  pitch_weight?: number | null;
  pitch_why?: string | null;
}): Promise<string | null> {
  const isDesk = ["admin", "editor", "desk"].includes(args.actor.role);
  if (args.origin === "pitched" || args.origin === "self") {
    // anyone signed in may pitch a story to the desk, or take one up themselves
  } else if (!isDesk) {
    return null; // only desk/editor commission
  }
  const status =
    args.origin === "pitched"
      ? "pitched"
      : args.origin === "requested"
        ? "idea"
        : "assigned";
  const tsCol =
    status === "pitched" ? "pitched_at" : status === "idea" ? "created_at" : "assigned_at";
  const { rows } = await pool().query<{ id: string }>(
    `insert into story_leads
       (tenant_id, title, beat, bureau, origin, status, importance, signal_id,
        assignee_id, commissioner_id, created_by, eta, trend_score, keywords, topic, note,
        entities, reach, potential, archival_weight, conviction, pitch_weight, pitch_why,
        ${tsCol})
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23, now())
     returning id`,
    [
      args.tenantId,
      args.title.slice(0, 300),
      args.beat ?? null,
      args.bureau ?? null,
      args.origin,
      status,
      args.importance ?? "normal",
      args.signalId ?? null,
      args.assigneeId ?? null, // a reporter is chosen at assign time, not here
      args.origin === "pitched" || args.origin === "self" ? null : args.actor.id, // commissioner
      args.actor.id, // created_by — who pitched/commissioned it
      args.eta || null,
      args.trendScore == null ? null : Math.round(args.trendScore), // trend_score is integer
      args.keywords ?? [],
      args.topic ?? null,
      args.note ?? null,
      // entities + conviction are NOT NULL (migration 0027) — fall back to the
      // column defaults so callers that omit them (commission, takeUp, calendar)
      // never bind null. Guard against a non-array entities payload.
      JSON.stringify(Array.isArray(args.entities) ? args.entities : []),
      args.reach ?? null,
      args.potential ?? null,
      args.archival_weight ?? null,
      args.conviction ?? "normal",
      args.pitch_weight ?? null,
      args.pitch_why ?? null,
    ],
  );
  return rows[0]?.id ?? null;
}

const STAMP: Record<string, string> = {
  assigned: "assigned_at",
  filed: "filed_at",
  approved: "approved_at",
  published: "published_at",
};

// Advance a lead; returns false if the actor's role can't make the move.
export async function transition(
  tenantId: string,
  actor: Account,
  leadId: string,
  to: Status,
): Promise<boolean> {
  const isDesk = ["admin", "editor", "desk"].includes(actor.role);
  const { rows } = await pool().query<{ status: string; assignee_id: string | null }>(
    "select status, assignee_id from story_leads where tenant_id=$1 and id=$2",
    [tenantId, leadId],
  );
  const lead = rows[0];
  if (!lead) return false;

  const deskMove =
    (lead.status === "pitched" && (to === "assigned" || to === "killed")) ||
    (lead.status === "filed" && (to === "approved" || to === "killed")) ||
    (lead.status === "approved" && to === "published") ||
    to === "killed";
  const fileMove =
    lead.status === "assigned" &&
    to === "filed" &&
    (isDesk || lead.assignee_id === actor.id);

  if (deskMove && !isDesk) return false;
  if (!deskMove && !fileMove) return false;

  const stamp = STAMP[to] ? `, ${STAMP[to]} = now()` : "";
  // $1 tenant, $2 lead, $3 new status; $4 commissioner only when assigning.
  const params: unknown[] = [tenantId, leadId, to];
  let setCommish = "";
  if (to === "assigned") {
    setCommish = ", commissioner_id = $4";
    params.push(actor.id);
  }
  await pool().query(
    `update story_leads set status = $3${stamp}${setCommish}
      where tenant_id = $1 and id = $2`,
    params,
  );
  return true;
}

// Assign a pitched/idea lead to a named reporter. Captures the reporter
// (assignee) AND the commissioner (the desk actor doing the assigning), so the
// lead reads "assigned to <reporter> by <commissioner>". Desk/editor only.
export async function assignLead(
  tenantId: string,
  actor: Account,
  leadId: string,
  assigneeId: string,
): Promise<boolean> {
  const isDesk = ["admin", "editor", "desk"].includes(actor.role);
  if (!isDesk || !assigneeId) return false;
  const { rowCount } = await pool().query(
    `update story_leads
        set status = 'assigned', assignee_id = $3, commissioner_id = $4,
            assigned_at = now()
      where tenant_id = $1 and id = $2 and status in ('idea', 'pitched')`,
    [tenantId, leadId, assigneeId, actor.id],
  );
  return (rowCount ?? 0) > 0;
}

// Commission a calendar event into a lead (ADR 0057 §2, manual path).
// Mirrors the auto cron: requested→idea lead, then links the event. Desk only;
// no-ops if the event is missing, undated, or already linked.
// When assigneeId is provided the lead is immediately assigned to that reporter
// (status = "assigned"); commissioner remains actor (the editor). When
// assigneeId is null/undefined the lead lands unassigned in Suggested (status =
// "idea") — unchanged behaviour.
export async function commissionFromCalendarEvent(
  tenantId: string,
  actor: Account,
  eventId: string,
  assigneeId?: string | null,
): Promise<string | null> {
  const ev = await calendarEventById(tenantId, eventId);
  if (!ev || !ev.target_date || ev.lead_id) return null;
  const pastDue = new Date(ev.target_date) < new Date();
  // When an assignee is chosen up-front use "assigned" origin so createLead
  // sets status = "assigned" directly; otherwise "requested" → "idea".
  const origin = assigneeId ? "assigned" : "requested";
  const leadId = await createLead({
    tenantId,
    actor,
    title: ev.what,
    origin,
    beat: ev.topic,
    importance: pastDue ? "high" : "normal",
    signalId: ev.signal_id,
    assigneeId: assigneeId ?? null,
    eta: typeof ev.target_date === "string" ? ev.target_date : ev.target_date.toISOString(),
    topic: ev.topic,
    note: pastDue ? `Promised by ${ev.who ?? "—"} — delivered?` : null,
  });
  if (leadId) await linkCalendarEventLead(tenantId, eventId, leadId);
  return leadId;
}

// A journalist (or desk) claims an existing Suggested/idea or pitched lead and
// commits to writing it themselves. Sets assignee_id = actor.id, status →
// "assigned". Desk may take up on behalf of any reporter by passing a different
// actor; self-claim always uses actor.id. No-ops on leads already assigned.
export async function takeUpLead(
  tenantId: string,
  actor: Account,
  leadId: string,
): Promise<boolean> {
  const { rowCount } = await pool().query(
    `update story_leads
        set status = 'assigned', assignee_id = $3, assigned_at = now()
      where tenant_id = $1 and id = $2 and status in ('idea', 'pitched')`,
    [tenantId, leadId, actor.id],
  );
  return (rowCount ?? 0) > 0;
}
