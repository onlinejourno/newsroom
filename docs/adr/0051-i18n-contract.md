# ADR 0051 — The i18n contract: an OSS product for the non-Anglo-Saxon world

**Status:** Accepted (2026-06-10). Implements ADR 0042 §3 concretely.

## Context

The product ships as OSS (Apache-2.0, ADR 0024) to newsrooms anywhere. ADR 0042
decided: built and operated in English, **output configurable per newsroom** —
no hardcoded vernacular, no English-only assumptions. Much of the plumbing
already exists; this ADR states the contract, what is real today, and the gaps,
so language support is a checkable surface rather than a vibe.

## The contract — four independent language axes

1. **UI locale** (what the journalist reads in the product)
   — `apps/web/lib/locale.ts`: 21 locales today (en, hi, bn, ta, te, kn, ml,
   mr, bho, ur, ar, am, ha, sw, fr, es, pt, de, vi, id) with RTL handling
   (ar/ur) and per-script fonts. Schema: `users.locale`,
   `tenants.supported_locales`.

2. **Content language** (what a source publishes)
   — `sources.expected_languages` (ISO 639-1). The Collect script gate
   (`latin_share`, PR #69) applies **only when a source expects English** — a
   Hindi/Arabic/Tamil source ingests untouched. Mis-served vernacular on an
   English endpoint is skipped; a vernacular *source* is first-class.

3. **Output locale** (what the platform writes: summaries, briefs, alerts)
   — Schema: `tenants.primary_locale`, `briefs.locale`, `beats.locale`
   (per-beat output language, ADR 0019 heritage). **Gap closed by this ADR:**
   the enrich prompt now takes `output_language` from the tenant's
   `primary_locale`, so Analyse summaries come back in the newsroom's
   language. The brief composer follows the same parameter.

4. **NLP capability per language**
   — the NLP connector seam (ADR 0048) is per-language by config:
   `{"model": "xx_ent_wiki_sm"}` or any spaCy language model; Stanza/GLiNER
   adapters are catalogued alternatives with broader language coverage. The
   LLM layer (ADR 0040) is language-capable by nature; NLP-first cost cuts
   apply wherever a model exists, and degrade to LLM-only where none does.

## What stays English

The codebase, ADRs, commit history, and the default locale. English is the
lingua franca of the OSS project; the **product output** is the newsroom's
language.

## Named gaps (staged, honest)

- **UI string catalogue**: pages render English copy regardless of UI locale.
  Work: extract strings to per-locale dictionaries; machine-draft + human pass
  (locale.ts metadata already follows this pattern). Not faked by this ADR.
- **Frame display labels** (PR #71) are English; they join the string
  catalogue when it lands.
- **Language detection at Collect** is a script-share heuristic; a proper
  detector (e.g. lingua/fasttext) becomes a connector when multilingual
  tenants are real.
- **Translation is not summarisation**: per the EIP rule, vernacular output is
  a *summary written in the language*, not a translation pass.

## Anti-patterns refused

- Hardcoding any vernacular into the product (ADR 0042).
- English-only gates on non-English sources.
- Pretending UI translation exists before the catalogue does.

## References

- ADR 0042 §3 (English-first, localizable); ADR 0048 (NLP connector);
  ADR 0040 (provider-agnostic LLM); PR #69 (script gate);
  `infra/migrations/0001_init.sql` (locale fields); `apps/web/lib/locale.ts`.
