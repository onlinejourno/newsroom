"""Recomposing a brief must reset ai_disclosure — a recompose is fresh AI output
and must not inherit a prior human-review claim (disclosure integrity, ADR 0029).

DB-backed, so marked `integration` (needs DATABASE_URL). Uses a far-future edition
date so it never collides with real editions, and cleans up after itself.
Tenant-portable: prefers the 'self' tenant, falls back to any tenant row.
"""

from __future__ import annotations

import datetime

import pytest

from onlinejourno_agents import db

_ED = datetime.date(2099, 1, 2)  # sentinel edition — never a real brief

_REVIEWED = {
    "human_edited": True,
    "human_editor_id": "op",
    "human_reviewed_at": "2099-01-02T00:00:00+00:00",
    "disclosure_text": "Composed by AI and reviewed by an editor on 2099-01-02.",
}
_AUTO = {
    "human_edited": False,
    "human_editor_id": None,
    "human_reviewed_at": None,
    "disclosure_text": (
        "Composed by AI (test-model) from 20 shortlisted sources. "
        "Not yet reviewed by an editor."
    ),
}


def _tenant_id(conn):
    """Prefer the 'self' tenant (single-tenant seeds); else any tenant."""
    with conn.cursor() as cur:
        cur.execute("select id from tenants order by (slug = 'self') desc limit 1")
        row = cur.fetchone()
    if row is None:
        pytest.skip("no tenants seeded")
    return row["id"]


@pytest.fixture()
def _clean():
    yield
    with db.connect() as conn, conn.cursor() as cur:
        cur.execute("delete from briefs where edition_date = %s", (_ED,))
        conn.commit()


def _compose(conn, tid, uid, content, disclosure):
    db.insert_brief(
        conn,
        tenant_id=tid,
        for_user=uid,
        beat_id=None,
        edition_date=_ED,
        content=content,
        ai_disclosure=disclosure,
    )
    conn.commit()


@pytest.mark.integration
def test_recompose_resets_reviewed_disclosure(_clean):
    with db.connect() as conn:
        tid = _tenant_id(conn)
        uid = db.default_brief_user(conn, tid)
        # 1) compose, then a curate/publish marks it editor-reviewed
        _compose(conn, tid, uid, {"sections": [{"heading": "old"}]}, _REVIEWED)
        # 2) recompose the same edition with fresh auto output
        _compose(conn, tid, uid, {"sections": [{"heading": "new"}]}, _AUTO)
        with conn.cursor() as cur:
            cur.execute(
                "select content, ai_disclosure from briefs "
                "where tenant_id = %s and for_user = %s and edition_date = %s",
                (tid, uid, _ED),
            )
            row = cur.fetchone()

    assert row["content"]["sections"][0]["heading"] == "new", "content should update"
    disc = row["ai_disclosure"]
    assert disc["human_edited"] is False, "recompose must clear human_edited"
    assert disc["human_editor_id"] is None, "recompose must clear the editor id"
    assert disc["human_reviewed_at"] is None, "recompose must clear the review timestamp"
    # the fresh auto text, not the prior "reviewed by an editor on <date>" claim
    assert "Not yet reviewed" in disc["disclosure_text"], "must carry the auto disclosure"
    assert "reviewed by an editor on" not in disc["disclosure_text"], "no stale review claim"
