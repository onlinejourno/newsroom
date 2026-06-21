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

## Fonts & design assets

| Asset | Source | License | Used in |
|-------|--------|---------|---------|
| Karnata F Kittel (display serif) | github.com/sanchaya/karnata-f-kittel-font | SIL OFL 1.1 | Vendored `apps/web/app/fonts/KarnataFKittel.otf` (+ `.LICENSE.txt`); wordmark + display headlines (ADR 0063) |
| Source Serif 4 (body) | Google Fonts (Adobe) | SIL OFL 1.1 | `next/font/google`, self-hosted at build; body/reading |
| IBM Plex Sans (UI) | Google Fonts (IBM) | SIL OFL 1.1 | `next/font/google`; kickers, nav, UI chrome |
| IBM Plex Mono (data) | Google Fonts (IBM) | SIL OFL 1.1 | `next/font/google`; clocks, timestamps, data |
| OnlineJourno Design System bundle | Founder-supplied (Subhash Rai) | Proprietary (own IP) | ADR 0063; tokens applied in `apps/web/app/globals.css` |

## Editorial / framework attribution

These are public methodologies; their use is non-exclusive and citation-only.

| Framework | Reference | Used in |
|-----------|-----------|---------|
| PEJ Framing the News codebook (1999) | Project for Excellence in Journalism | `m-framing-pej` |
| Deuze typology (2001) | Deuze, *First Monday* 6(10) | `m-craft-deuze`, source typing |
| Reuters Digital News Report | Reuters Institute | Annual business-baseline benchmarks |

## Audit log

- 2026-06-01: File initialized; Subhash Rai confirmed sole authorship of all reused code; no THGP IP claim.
- 2026-06-21: OJDS adopted (ADR 0063). Vendored Karnata F Kittel (OFL 1.1, + LICENSE); Source Serif 4 + IBM Plex Sans/Mono via next/font (OFL 1.1, self-hosted at build).
