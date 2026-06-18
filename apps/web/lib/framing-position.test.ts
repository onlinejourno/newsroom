import { test } from "node:test";
import assert from "node:assert/strict";
import { derivePosition, implicationFor, type PositionInputs } from "./framing-position";

const base: PositionInputs = {
  ownRecent: 3, peerRecent: 10, peerCount: 4, peerMedian: 2,
  trajectory: "still building — peak not yet reached",
  ownCombative: 1, ownExplanatory: 2,
  peerCombative: 8, peerExplanatory: 1,
  nOwn: 6, nPeer: 40,
};

test("NO ANGLE when own coverage is zero and peers cover it", () => {
  const p = derivePosition({ ...base, ownRecent: 0 });
  assert.equal(p.tag, "NO_ANGLE");
});

test("PEAK when own covers and trajectory has peaked", () => {
  const p = derivePosition({ ...base, trajectory: "at peak — watch for plateau" });
  assert.equal(p.tag, "PEAK");
});

test("BEHIND when rising and own is below the peer median", () => {
  const p = derivePosition({ ...base, ownRecent: 1, peerMedian: 5 });
  assert.equal(p.tag, "BEHIND");
});

test("ON IT when rising and own is at/above the peer median", () => {
  const p = derivePosition({ ...base, ownRecent: 5, peerMedian: 2 });
  assert.equal(p.tag, "ON_IT");
});

test("confidence: full ≥30, amber 5–29, low <5", () => {
  assert.equal(derivePosition({ ...base, nPeer: 30 }).confidence, "full");
  assert.equal(derivePosition({ ...base, nPeer: 29 }).confidence, "amber");
  assert.equal(derivePosition({ ...base, nPeer: 5 }).confidence, "amber");
  assert.equal(derivePosition({ ...base, nPeer: 4 }).confidence, "low");
});

test("low confidence suppresses the framing nuance", () => {
  const p = derivePosition({ ...base, ownRecent: 0, nPeer: 3 });
  assert.equal(p.peersCombativeHeavy, false);
});

test("NO ANGLE implication names the peer count and the explanatory opening", () => {
  const p = derivePosition({ ...base, ownRecent: 0 });
  assert.equal(
    implicationFor(p, { momentum: 70, peerCount: 4 }),
    "Peer-led (4 outlets). No angle from you yet. Explanatory angle open.",
  );
});

test("BEHIND implication omits unknown slots, keeps known ones", () => {
  const p = derivePosition({ ...base, ownRecent: 1, peerMedian: 5 });
  assert.equal(implicationFor(p, { momentum: 70, peerCount: 4 }), "Peers ahead — you're light on it.");
  assert.equal(
    implicationFor(p, { momentum: 70, peerCount: 4, event: "the HC stay", briefReady: true }),
    "Peers ahead since the HC stay — you're light on it. You have a brief ready.",
  );
});

test("ON IT implication is the explanatory window when peers are combative and you're thin", () => {
  const p = derivePosition({ ...base, ownRecent: 5, peerMedian: 2, ownExplanatory: 0, ownCombative: 1 });
  assert.equal(implicationFor(p, { momentum: 50, peerCount: 4 }), "Explanatory window still open.");
});
