# IP Provenance

Every line of code in this repository must trace to a known origin and license. This file is the running index. Update on every dependency add and every code import from another repo.

## Original code

| Module / file | Author | Date | Notes |
|---------------|--------|------|-------|
| All scaffolding in this repo (`README.md`, `LICENSE.md`, `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, `docs/*`, `infra/*`, `package.json`, `pyproject.toml`) | Subhash Rai | 2026-06-01 | Sole authorship, proprietary |

## Reused code — own origin (verified clean)

These were authored by Subhash Rai on his own time, his own Anthropic account, his own machine, and at his own expense. No third party has a claim.

| Source repo / file | Destination in platform | Verified date | Notes |
|-------------------|-------------------------|---------------|-------|
| `~/projects/news-intel/src/collect_*.py` | `packages/ingest-py/collectors/` | 2026-06-01 | All collectors (RSS, sitemap, homepage, article, robots, pagespeed) |
| `~/projects/news-intel/src/code_frames.py` | `packages/modules/framing-pej/` | 2026-06-01 | PEJ frame classifier |
| `~/projects/news-intel/src/validate.py` | `packages/spine/eval/` | 2026-06-01 | Eval harness base |
| `~/projects/news-intel/goldset.csv` | `packages/modules/framing-pej/goldset.csv` | 2026-06-01 | Hand-coded validation set |
| `~/projects/news-intel/entities.yaml` | `packages/spine/sources/default-registry.yaml` | 2026-06-01 | Default source registry |
| `~/Data Protection/discover-dashboard/analyze/*.py` | `packages/modules/discover-seo/`, `packages/modules/recirculation/` | 2026-06-01 | Confirmed by founder: self-built on own bandwidth, no WFH claim from THGP |
| `~/Data Protection/discover-dashboard/data/*.py` | `packages/modules/*-fetcher/` | 2026-06-01 | Same provenance as above |
| `~/projects/editorial-intelligence-demo/app/` | `apps/web/` | 2026-06-01 | Demo UX, ported to multi-tenant |

## External dependencies

Filled at first install. Each row must include name, version, license, and link.

### TypeScript / Node

| Dep | Version | License | Why |
|-----|---------|---------|-----|
| _filled Wk 1_ | | | |

### Python

| Dep | Version | License | Why |
|-----|---------|---------|-----|
| _filled Wk 1_ | | | |

## Third-party services (paid or free-tier)

| Service | Usage | License/ToS reviewed | Notes |
|---------|-------|----------------------|-------|
| Anthropic API (Claude) | Agent reasoning | Yes | Per-newsroom cost tagged |
| _others filled as added_ | | | |

## Editorial / framework attribution

These are public methodologies; their use is non-exclusive and citation-only.

| Framework | Reference | Used in |
|-----------|-----------|---------|
| PEJ Framing the News codebook (1999) | Project for Excellence in Journalism | `m-framing-pej` |
| Deuze typology (2001) | Deuze, *First Monday* 6(10) | `m-craft-deuze`, source typing |
| Reuters Digital News Report | Reuters Institute | Annual business-baseline benchmarks |

## Audit log

- 2026-06-01: File initialized; Subhash Rai confirmed sole authorship of all reused code; no THGP IP claim.
