// Planning logic (ADR 0059, Phase A) — pure, ground-up: turn a target publish
// date + the chosen production tasks into the *implications* a reporter should
// see at decision time (brief-by dates, the long pole, whether there's runway).
//
// LEAD_DAYS are configured norms now (admin-editable / learned later). Multi-modal
// parts run in parallel, so the binding constraint is the longest lead.

export type TaskKind =
  | "text"
  | "video"
  | "interactive"
  | "graphic"
  | "audio"
  | "photo"
  | "other";

export const TASK_KINDS: TaskKind[] = [
  "text",
  "video",
  "interactive",
  "graphic",
  "audio",
  "photo",
  "other",
];

export const KIND_LABEL: Record<TaskKind, string> = {
  text: "Text",
  video: "Video",
  interactive: "Interactive",
  graphic: "Graphic",
  audio: "Audio",
  photo: "Photo",
  other: "Other",
};

// Configured lead-time norms — typical days a desk needs for each kind.
export const LEAD_DAYS: Record<TaskKind, number> = {
  text: 0,
  photo: 1,
  graphic: 1,
  audio: 2,
  video: 2,
  interactive: 3,
  other: 1,
};

export type TaskImplication = {
  kind: TaskKind;
  leadDays: number;
  briefBy: Date | null; // targetEta - leadDays
};

export type PlanImplications = {
  tasks: TaskImplication[];
  daysNeeded: number; // the longest pole (parts run in parallel)
  critical: TaskKind | null; // the kind driving daysNeeded
  earliestStart: Date | null; // when the critical part must begin (targetEta - daysNeeded)
  feasible: boolean; // is there runway from today?
  slackDays: number | null; // days from today to earliestStart (negative = already behind)
};

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function epochDay(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function planImplications(
  targetEta: Date | null,
  kinds: TaskKind[],
  today: Date,
): PlanImplications {
  const list = kinds.length ? kinds : (["text"] as TaskKind[]);
  const tasks: TaskImplication[] = list.map((kind) => {
    const leadDays = LEAD_DAYS[kind] ?? 1;
    return { kind, leadDays, briefBy: targetEta ? addDays(targetEta, -leadDays) : null };
  });

  let daysNeeded = 0;
  let critical: TaskKind | null = null;
  for (const t of tasks) {
    if (t.leadDays > daysNeeded) {
      daysNeeded = t.leadDays;
      critical = t.kind;
    }
  }

  const earliestStart = targetEta ? addDays(targetEta, -daysNeeded) : null;
  const slackDays = earliestStart ? epochDay(earliestStart) - epochDay(today) : null;
  const feasible = slackDays === null ? true : slackDays >= 0;

  return { tasks, daysNeeded, critical, earliestStart, feasible, slackDays };
}
