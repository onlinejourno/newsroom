"""Channel-affinity log writer (trends: Channel Performance & Entity Affinity).

Ports the append-only appearance-log model from
discover-dashboard/data/performance_log.py into the platform's Postgres
`channel_affinity_log` table (migration 0023).

For each recent published story:
  - Read distribution_fit_scores to determine which channels the story
    appears on (score >= APPEAR_THRESHOLD == 65, i.e. grade B+).
  - Classify each story's entities (via spaCy NLP connector, or from the
    stored enrichment.analyse.entities JSON) into display types:
      GPE/LOC  -> "Location"
      PERSON   -> "Person"
      ORG      -> "Organisation"
      NORP/EVENT/FAC/LAW/PRODUCT -> "Named Entity"
      (unknown / topic token)    -> "Topic"
  - INSERT one channel_affinity_log row per (entity_type, channel, story)
    that hasn't been logged yet in this run.
  - Dedup within a run by (story_id, channel, entity_type).
  - Append-only; one transaction. Returns {"stories": n, "rows_logged": m}.

If the NLP connector is unavailable, falls back gracefully:
  - Entities already stored in enrichment.analyse.entities are used as-is
    typed "Topic" (since we have the names but not labels).
  - If there are no stored entities either, a single "Topic" row is still
    logged so the channel still registers an appearance.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from onlinejourno_agents import db

# A story must score at or above this threshold on a surface to count as an
# "appearance" on that channel.  Matches grade B+ (>=65) from distribution_fit.
APPEAR_THRESHOLD = 65

# surface key -> channel label stored in channel_affinity_log
_SURFACE_TO_CHANNEL: dict[str, str] = {
    "discover":      "discover",
    "google_news":   "google_news",
    "google_search": "google_search",
}

# spaCy NER label -> display type (mirrors SpacyNlpClient._ENTITY_LABELS)
_LABEL_TO_TYPE: dict[str, str] = {
    "GPE":     "Location",
    "LOC":     "Location",
    "PERSON":  "Person",
    "ORG":     "Organisation",
    "NORP":    "Named Entity",
    "EVENT":   "Named Entity",
    "FAC":     "Named Entity",
    "LAW":     "Named Entity",
    "PRODUCT": "Named Entity",
}


def entity_type_of(label: str) -> str:
    """Map a spaCy entity label to a display type.

    Labels not in the NER set (e.g. raw topic tokens) -> "Topic".
    """
    return _LABEL_TO_TYPE.get(label.upper(), "Topic")


def _build_nlp_client() -> Any | None:
    """Try to build a spaCy NLP connector; return None if unavailable."""
    try:
        from onlinejourno_agents.connectors import ConnectorConfig, make_connector

        return make_connector(
            ConnectorConfig(category="nlp", provider="spacy", mode="api")
        )
    except Exception:
        return None


def _entity_types_for_story(
    story: dict[str, Any],
    nlp: Any | None,
) -> list[str]:
    """Return a deduplicated list of entity_type strings for the story.

    Priority:
    1. If the NLP connector is available, run it over headline (+ body preview).
    2. Fall back to stored enrichment.analyse.entities (typed "Topic" — we have
       names but no labels from the stored JSON).
    3. Fall back to a single "Topic" so the channel still gets a row.
    """
    seen: set[str] = set()
    types: list[str] = []

    if nlp is not None:
        text = " ".join(
            filter(None, [story.get("headline"), (story.get("body_text") or "")[:500]])
        )
        try:
            result = nlp.analyse(text)
            # The analyse() return value from SpacyNlpClient doesn't expose labels,
            # only entity names.  To get labels we call the spaCy pipeline directly
            # by reaching into the client's internals — but that couples us to the
            # adapter.  The safer path: re-run the NLP and read doc.ents, OR use
            # the stored enrichment.  Here we use the NLP client's output combined
            # with a label probe via spaCy (if available), falling back to "Topic".
            #
            # Preferred approach: call spaCy directly for label access.
            try:
                import spacy  # noqa: F401  (already loaded inside nlp client)

                pipeline = nlp._pipeline()  # SpacyNlpClient internal
                doc = pipeline(text[:20000])
                entity_labels = {
                    ent.label_
                    for ent in doc.ents
                    if ent.label_ in _LABEL_TO_TYPE
                }
                for label in entity_labels:
                    t = entity_type_of(label)
                    if t not in seen:
                        seen.add(t)
                        types.append(t)
            except Exception:
                # Can't get labels — fall back to treating NLP entity names as Topics
                entities = result.get("entities") or []
                if entities:
                    if "Topic" not in seen:
                        seen.add("Topic")
                        types.append("Topic")
        except Exception:
            pass

    if not types:
        # Try stored enrichment.analyse.entities (names, no labels -> "Topic")
        stored = story.get("entities")  # pre-joined from the SQL query
        if stored:
            if "Topic" not in seen:
                seen.add("Topic")
                types.append("Topic")

    if not types:
        types.append("Topic")

    return types


def _stories_with_fit_and_entities(
    conn: Any,
    tenant_id: UUID,
    *,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Recent stories joined with their distribution_fit scores and stored
    entity names.  Only stories with at least one fit row are returned."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select
                s.id,
                s.headline,
                s.body_text,
                s.section,
                s.enrichment->'analyse'->'entities' as entities,
                array_agg(dfs.surface)  filter (where dfs.score >= %s) as channels,
                coalesce(max(dfs.score), 0) as best_score
              from stories s
              join distribution_fit_scores dfs on dfs.story_id = s.id
                                               and dfs.tenant_id = s.tenant_id
             where s.tenant_id = %s
             group by s.id, s.headline, s.body_text, s.section,
                      s.enrichment->'analyse'->'entities'
            having count(*) > 0
             order by coalesce(s.published_at, s.created_at) desc
             limit %s
            """,
            (APPEAR_THRESHOLD, tenant_id, limit),
        )
        return list(cur.fetchall())


def _insert_affinity_rows(
    conn: Any,
    *,
    tenant_id: UUID,
    story_id: UUID,
    section: str | None,
    channel: str,
    entity_type: str,
    momentum: float,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into channel_affinity_log
                (tenant_id, entity_type, channel, section, momentum, story_id)
            values (%s, %s, %s, %s, %s, %s)
            """,
            (tenant_id, entity_type, channel, section, momentum, story_id),
        )


def run_affinity_log(tenant_slug: str) -> dict[str, int]:
    """Populate channel_affinity_log for the tenant's recent published stories.

    Returns {"stories": n_stories_processed, "rows_logged": m_rows_inserted}.
    """
    nlp = _build_nlp_client()
    nlp_available = nlp is not None

    rows_logged = 0
    stories_processed = 0

    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        stories = _stories_with_fit_and_entities(conn, tenant_id, limit=50)

        # Dedup set for (story_id, channel, entity_type) within this run
        seen_triples: set[tuple[str, str, str]] = set()

        for story in stories:
            story_id: UUID = story["id"]
            section: str | None = story.get("section")
            channels: list[str] = story.get("channels") or []

            if not channels:
                continue

            stories_processed += 1
            entity_types = _entity_types_for_story(story, nlp)

            for surface in channels:
                channel = _SURFACE_TO_CHANNEL.get(surface)
                if channel is None:
                    continue
                for etype in entity_types:
                    key = (str(story_id), channel, etype)
                    if key in seen_triples:
                        continue
                    seen_triples.add(key)
                    _insert_affinity_rows(
                        conn,
                        tenant_id=tenant_id,
                        story_id=story_id,
                        section=section,
                        channel=channel,
                        entity_type=etype,
                        momentum=0.0,
                    )
                    rows_logged += 1

        conn.commit()

    if not nlp_available:
        import sys
        print(
            "affinity-log: NLP connector unavailable — entity types coarsened to 'Topic'",
            file=sys.stderr,
        )

    return {"stories": stories_processed, "rows_logged": rows_logged}
