"""Reach contract — Python conformance against the shared golden fixtures.

The SAME tests/golden/reach.golden.json is loaded by the TS mirror (Frontmatter).
If either implementation drifts, this (or the TS test) fails.
"""
import json
import pathlib

from onlinejourno_agents.reach import (
    ReachSubject,
    SurfaceSignal,
    compute_reach,
    ConnectorReachAgent,
)

GOLDEN = pathlib.Path(__file__).parent / "golden" / "reach.golden.json"


def _cases():
    return json.loads(GOLDEN.read_text())["cases"]


def test_golden_conformance():
    subj = ReachSubject(kind="story", title="t", entity="e", geo="IN")
    for c in _cases():
        sigs = [SurfaceSignal(s["surface"], s["value"], s["basis"], weight=s["weight"]) for s in c["signals"]]
        got = compute_reach(subj, sigs)
        exp = c["expect"]
        assert round(got.reach, 1) == exp["reach"], c["name"]
        assert round(got.confidence, 2) == exp["confidence"], c["name"]
        assert got.basis_summary == exp["basis_summary"], c["name"]


def test_unavailable_recorded_never_scored():
    subj = ReachSubject(kind="story")
    r = compute_reach(subj, [SurfaceSignal("social", 99, "unavailable", weight=5)])
    assert r.reach == 0.0 and r.confidence == 0.0  # dark surface never inflates reach


def test_to_dict_shape():
    subj = ReachSubject(kind="story")
    r = compute_reach(subj, [SurfaceSignal("search", 50, "observed")])
    d = r.to_dict()
    assert set(d) == {"reach", "confidence", "basis_summary", "surfaces", "note"}
    assert set(d["surfaces"][0]) == {"surface", "value", "basis", "weight", "note", "raw"}


def test_connector_agent_no_connectors_is_empty_reach():
    # No connectors wired -> no signals -> honest zero, never raises.
    agent = ConnectorReachAgent({})
    r = agent.reach(ReachSubject(kind="story", entity="x", url="https://e/x"))
    assert r.reach == 0.0 and r.confidence == 0.0 and r.basis_summary == "unavailable"
