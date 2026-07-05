"""m-alerts — the Alert stage: push high-trend signals to the newsroom.

ntfy first (free, OSS, no account: POST to https://ntfy.sh/<topic> or a
self-hosted ntfy). The topic comes from --topic or NTFY_TOPIC; treat it like
a capability URL — anyone who knows it can read the channel. WhatsApp/SMS
join later behind the same seam.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import requests

from onlinejourno_agents import db

NTFY_BASE = os.environ.get("NTFY_BASE", "https://ntfy.sh")


@dataclass(slots=True)
class AlertResult:
    sent: int
    skipped: int
    status: str


def build_message(signal: dict[str, Any], detail_base: str | None) -> dict[str, str]:
    """Title/body/click for one signal alert. Pure."""
    beat = signal.get("beat") or "Signal"
    place = signal.get("region")
    # ntfy reads the title from an HTTP header — keep it ASCII.
    title = f"{beat} - trend {signal.get('trend_score')}"
    if place:
        title += f" - {place}"
    body = (signal.get("headline") or signal.get("url") or "")[:200]
    click = (
        f"{detail_base}/signal/{signal['id']}"
        if detail_base
        else (signal.get("url") or "")
    )
    return {"title": title, "body": body, "click": click}


def run_alerts(
    *,
    tenant_slug: str,
    topic: str | None = None,
    threshold: int = 70,
    since_hours: int = 24,
    limit: int = 10,
    detail_base: str | None = None,
    dry_run: bool = False,
) -> AlertResult:
    topic = topic or os.environ.get("NTFY_TOPIC")
    if not topic and not dry_run:
        return AlertResult(0, 0, "no topic — set NTFY_TOPIC or pass --topic")

    sent = skipped = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        rows = db.signals_for_alert(
            conn, tenant_id, threshold=threshold, since_hours=since_hours, limit=limit
        )
        if not rows:
            return AlertResult(0, 0, "empty")
        for sig in rows:
            msg = build_message(sig, detail_base)
            if dry_run:
                print(f"[dry-run] {msg['title']} — {msg['body'][:80]}")
                skipped += 1
                continue
            try:
                resp = requests.post(
                    f"{NTFY_BASE}/{topic}",
                    data=msg["body"].encode(),
                    headers={
                        "Title": msg["title"],
                        "Click": msg["click"],
                        "Tags": "newspaper",
                    },
                    timeout=10,
                )
                resp.raise_for_status()
            except requests.RequestException as exc:
                print(f"  send failed: {exc}")
                skipped += 1
                continue
            db.mark_alerted(
                conn, tenant_id=tenant_id, signal_id=sig["id"], channel="ntfy"
            )
            sent += 1
        conn.commit()
    return AlertResult(sent, skipped, "success")
