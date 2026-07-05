"""Unit tests for affinity_log — entity_type_of mappings (pure, no DB/NLP)."""
from __future__ import annotations

import pytest

from onlinejourno_agents.affinity_log import entity_type_of


@pytest.mark.parametrize("label,expected", [
    # Geo labels -> Location
    ("GPE",     "Location"),
    ("LOC",     "Location"),
    # Person
    ("PERSON",  "Person"),
    # Organisation
    ("ORG",     "Organisation"),
    # Named Entity bucket
    ("NORP",    "Named Entity"),
    ("EVENT",   "Named Entity"),
    ("FAC",     "Named Entity"),
    ("LAW",     "Named Entity"),
    ("PRODUCT", "Named Entity"),
    # Unknown / topic tokens -> Topic
    ("CARDINAL", "Topic"),
    ("DATE",     "Topic"),
    ("TIME",     "Topic"),
    ("WORK_OF_ART", "Topic"),
    ("MONEY",    "Topic"),
    ("",         "Topic"),
    ("UNKNOWN",  "Topic"),
])
def test_entity_type_of_mappings(label: str, expected: str) -> None:
    assert entity_type_of(label) == expected


def test_entity_type_of_case_insensitive() -> None:
    """Labels are normalised to uppercase so callers need not pre-uppercase."""
    assert entity_type_of("gpe")    == "Location"
    assert entity_type_of("person") == "Person"
    assert entity_type_of("org")    == "Organisation"
    assert entity_type_of("norp")   == "Named Entity"
