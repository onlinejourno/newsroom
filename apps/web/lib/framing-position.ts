// Pure "where you stand" derivation — the editorial logic for the FRAME·Analyse
// cards. No DB, no React; fully unit-tested. See docs/superpowers/specs/
// 2026-06-18-onlinejourno-phase-b-design.md.

export type PositionTag = "NO_ANGLE" | "BEHIND" | "ON_IT" | "PEAK";
export type Confidence = "full" | "amber" | "low";

export type PositionInputs = {
  ownRecent: number; // own published stories on the topic in the window
  peerRecent: number; // peer signals on the topic in the window
  peerCount: number; // distinct peer outlets covering it
  peerMedian: number; // median per-peer mention count
  trajectory: string; // from lib/trends.ts predictTrajectory
  ownCombative: number;
  ownExplanatory: number;
  peerCombative: number;
  peerExplanatory: number;
  nOwn: number; // own framing-coded count on the topic
  nPeer: number; // peer framing-coded count on the topic
};

export type Position = {
  tag: PositionTag;
  confidence: Confidence;
  peersCombativeHeavy: boolean; // framing nuance, only when confidence allows
  ownThinExplanatory: boolean;
};

// Trajectory strings (lib/trends.ts predictTrajectory) that mean the topic has
// crested. Everything else among live topics is treated as rising.
const PEAKED = new Set<string>([
  "near peak — may plateau",
  "at peak — watch for plateau",
  "fading fast — post-peak",
  "cooling — interest declining",
]);

function confidenceFor(nPeer: number): Confidence {
  if (nPeer >= 30) return "full";
  if (nPeer >= 5) return "amber";
  return "low";
}

export function derivePosition(i: PositionInputs): Position {
  const confidence = confidenceFor(i.nPeer);
  // Never assert a framing nuance on too small a sample (honest-data).
  const peersCombativeHeavy =
    confidence !== "low" && i.peerCombative > i.peerExplanatory && i.peerCombative > 0;
  const ownThinExplanatory = i.ownExplanatory === 0 || i.ownExplanatory < i.ownCombative;

  let tag: PositionTag;
  if (i.ownRecent === 0) {
    tag = "NO_ANGLE"; // page only passes topics that peers (or you) cover
  } else if (PEAKED.has(i.trajectory)) {
    tag = "PEAK";
  } else if (i.ownRecent < i.peerMedian) {
    tag = "BEHIND";
  } else {
    tag = "ON_IT";
  }
  return { tag, confidence, peersCombativeHeavy, ownThinExplanatory };
}

export type ImplicationSlots = {
  momentum: number;
  peerCount: number;
  event?: string | null; // omitted if no clear driver — never fabricated
  briefReady?: boolean; // a matching calendar_event / story_lead exists
};

export function implicationFor(pos: Position, s: ImplicationSlots): string {
  switch (pos.tag) {
    case "NO_ANGLE": {
      const base = `Peer-led (${s.peerCount} outlet${s.peerCount === 1 ? "" : "s"}). No angle from you yet.`;
      return pos.peersCombativeHeavy ? `${base} Explanatory angle open.` : base;
    }
    case "BEHIND": {
      const since = s.event ? ` since ${s.event}` : "";
      const brief = s.briefReady ? " You have a brief ready." : "";
      return `Peers ahead${since} — you're light on it.${brief}`;
    }
    case "ON_IT":
      return pos.peersCombativeHeavy && pos.ownThinExplanatory
        ? "Explanatory window still open."
        : "On it — keeping pace.";
    case "PEAK":
      return "Past peak — your angle's live.";
  }
}

// CSS class for the tag chip (classes already in globals.css from Phase A).
export function tagClass(tag: PositionTag): string {
  return {
    NO_ANGLE: "ds-tag-noangle",
    BEHIND: "ds-tag-behind",
    ON_IT: "ds-tag-onit",
    PEAK: "ds-tag-peak",
  }[tag];
}

export function tagLabel(tag: PositionTag): string {
  return { NO_ANGLE: "NO ANGLE", BEHIND: "BEHIND", ON_IT: "ON IT", PEAK: "PEAK" }[tag];
}
