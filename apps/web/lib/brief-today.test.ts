import { test } from "node:test";
import assert from "node:assert/strict";
import { leadToCard, newsroomNow, type LeadRow } from "./brief-today";

const lead: LeadRow = {
  title: "SEBI tightens disclosure norms", beat: "markets", importance: "high",
  status: "idea", trend_score: 72, note: "HC stay lifted — first-mover window open",
  created_at: "2026-06-18T09:30:00+05:30",
};

test("severity maps from importance", () => {
  assert.equal(leadToCard({ ...lead, importance: "urgent" }, null, 1).severity, "high");
  assert.equal(leadToCard({ ...lead, importance: "high" }, null, 1).severity, "high");
  assert.equal(leadToCard({ ...lead, importance: "normal" }, null, 1).severity, "med");
  assert.equal(leadToCard({ ...lead, importance: "low" }, null, 1).severity, "low");
});

test("action maps from status", () => {
  assert.equal(leadToCard({ ...lead, status: "idea" }, null, 1).action, "compose");
  assert.equal(leadToCard({ ...lead, status: "pitched" }, null, 1).action, "compose");
  assert.equal(leadToCard({ ...lead, status: "assigned" }, null, 1).action, "analyse");
  assert.equal(leadToCard({ ...lead, status: "filed" }, null, 1).action, "audit");
  assert.equal(leadToCard({ ...lead, status: "approved" }, null, 1).action, "audit");
});

test("potential is trend_score >= 60", () => {
  assert.equal(leadToCard({ ...lead, trend_score: 60 }, null, 1).potential, true);
  assert.equal(leadToCard({ ...lead, trend_score: 59 }, null, 1).potential, false);
  assert.equal(leadToCard({ ...lead, trend_score: null }, null, 1).potential, false);
});

test("why falls back note -> signal.trend_reason -> empty", () => {
  assert.equal(leadToCard(lead, null, 1).why, "HC stay lifted — first-mover window open");
  assert.equal(leadToCard({ ...lead, note: null }, { trend_reason: "rising fast", user_need: null }, 1).why, "rising fast");
  assert.equal(leadToCard({ ...lead, note: null }, null, 1).why, "");
});

test("need from signal; sources floored at 1", () => {
  assert.equal(leadToCard(lead, { trend_reason: null, user_need: "Understand" }, 5).need, "Understand");
  assert.equal(leadToCard(lead, null, 0).sources, 1);
  assert.equal(leadToCard(lead, null, 4).sources, 4);
});

test("newsroomNow: leads tone is accent only when n>0", () => {
  const z = newsroomNow({ signalsIn: 3, leadsNeedingDecision: 0, sourcesLive: 9, publishedToday: 2 });
  assert.equal(z.find((s) => s.key === "leads")!.tone, "neutral");
  const a = newsroomNow({ signalsIn: 3, leadsNeedingDecision: 4, sourcesLive: 9, publishedToday: 2 });
  assert.equal(a.find((s) => s.key === "leads")!.tone, "accent");
  assert.deepEqual(a.map((s) => s.key), ["signalsIn", "leads", "sources", "published"]);
});
