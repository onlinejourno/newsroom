"""Trend scoring — ported momentum/trajectory logic + convergence ranking."""

from __future__ import annotations

from onlinejourno_agents.trend_score import (
    predict_trajectory,
    slope_to_score,
    topic_momentum,
)


def test_slope_to_score_bands():
    # rising from a high base -> high score; falling -> penalised
    assert slope_to_score(10, 80, 80) >= 80
    assert slope_to_score(-10, 30, 100) < 30


def test_predict_trajectory_labels():
    assert "building" in predict_trajectory(3.0, 40, 100)
    assert "fading" in predict_trajectory(-3.0, 40, 100)
    assert "steady" in predict_trajectory(0.0, 50, 100)


def test_topic_momentum_ranks_convergence():
    recent = [["RBI", "Inflation"], ["RBI", "Repo"], ["RBI"], ["Cricket"]]  # RBI x3
    prior = [["RBI"], ["Cricket"], ["Cricket"]]  # RBI x1, Cricket x2
    topics = topic_momentum(recent, prior)
    top = topics[0]
    assert top.topic == "RBI"          # most-converged this window
    assert top.momentum >= 80
    cricket = next(t for t in topics if t.topic == "Cricket")
    assert cricket.recent == 1 and cricket.prior == 2  # cooling
