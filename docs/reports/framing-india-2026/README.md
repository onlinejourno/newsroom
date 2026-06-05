# Framing the News: India 2026

A replication of the **Project for Excellence in Journalism (PEJ) 1999** front-page content analysis, adapted for Indian digital journalism. OnlineJournalism.in flagship report by **Subhash Rai**.

- **Sample:** 170 homepage stories, 12 English-language outlets, constructed week Jan–May 2026.
- **Coding dimensions:** Frame (14), Topic (16), Trigger (13), Message (9), plus `source_type`, `placement`, Deuze typology, Rosen index, and critical/empirical ratios.
- **Outlet camps:** Digital Natives (Scroll, The Wire, The Print, Newslaundry, FirstPost) vs Legacy Digital (NDTV, India Today, HT, Indian Express, TOI, News18, The Hindu).

## Why it's in this repo

This is the live evidence behind two things the platform already commits to:

1. **The PEJ-framing reference** cited in `CONTEXT.md` (Project for Excellence in Journalism, *Framing the News*, 1999) — the metrics anchor for editorial output.
2. **The `m-framing-pej` module** (defined in `docs/MVP-SCOPE.md`, disabled by default, scheduled Wk 9+).

Incorporated here as a **research asset + future-module goldset**, not as live scoring code. The `m-framing-pej` scorer itself is **not built in this directory** — that remains deferred per MVP-SCOPE. What lands here is everything that module will consume when it is built.

## How the platform uses each file

| File | Role in the platform |
|------|----------------------|
| `dataset.json` | 170 hand-coded stories. The **eval goldset** for `m-framing-pej`: each record maps a headline to its expected frame / topic / trigger / message. When the module ships, this becomes `packages/modules/m-framing-pej/eval/goldset/india-2026.json` (replay-tested per CLAUDE.md eval-first rule). |
| `CODEBOOK.md` | The **classification schema** `m-framing-pej` implements — the canonical 14 frames / 16 topics / 13 triggers / 9 messages, with the India-2026 baseline distribution. |
| `extended_metadata.json` | Deuze typology + Rosen index + critical/empirical ratios. Validates the `sources.deuze_type` enum already in the schema. |
| `report.pdf`, `post.md`, `dashboard.html`, `charts/` | The published artifact — credibility material for OnlineJournalism.in (sister property + first design partner) and a worked example of framing analysis for design-partner conversations. |
| `scripts/build_dataset.py`, `scripts/add_layers.py` | Reproduction pipeline. Re-buildable each constructed week. |

## Key findings (headline numbers)

- **27.6%** of homepage stories are straight news — nearly **double** PEJ's 16% for 1999 American newspapers.
- **Two Indias.** Legacy outlets default to straight news 37.1% of the time; digital natives 12.3% — a ~3:1 split. Same country, two species of journalism.
- **Combative framing 25.2%** (conflict 10.0% + horse race 7.6% + wrongdoing 7.6%), concentrated in election coverage.
- **Consensus framing: 1.2%** — two stories out of 170 (PEJ's already-low US figure was 6%).

Full narrative in `post.md` / `report.pdf`; interactive in `dashboard.html`.

## Reproduction & updates

- Build the dataset: `python scripts/build_dataset.py` (see script for the coding-sheet input it expects).
- Quarterly refresh: the `framing-india-quarterly-update` skill (under `~/Documents/Claude/Scheduled/`) regenerates the constructed-week sample and re-runs the analysis.

## Attribution & licence

- **Editorial content** (`report.pdf`, `post.md`, `dashboard.html`, charts) © Subhash Rai / OnlineJournalism.in. Released for reuse under **CC BY-SA 4.0** with attribution.
- **Coded dataset + codebook** (`dataset.json`, `CODEBOOK.md`, `extended_metadata.json`) released under **CC BY-SA 4.0** — a public-data layer the newsroom community can extend (consistent with the MIT/CC public-data posture in ADR 0024 / ADR 0025).
- **Scripts** (`scripts/*.py`) under **Apache-2.0**, matching the repo.
- The PEJ *Framing the News* methodology is a public framework, used by citation only (see root `NOTICE`).

## Status

Incorporated as an asset (2026-06-05). The live `m-framing-pej` scoring module that consumes this goldset is deferred to Wk 9+ per `docs/MVP-SCOPE.md` — this directory is its foundation, not the module itself.
