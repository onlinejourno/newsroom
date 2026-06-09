# ADR 0048 — NLP connector (the Analyse NLP-first layer); spaCy as the OSS default

**Status:** Accepted (2026-06-09).

## Context

The EIP deck's Analyse stage is a **three-system pipeline**: NLP (Geneea) → LLM (Claude) → archive (Sarvajna). The cost insight: run cheap, fast **NLP first** for what it does well (named-entity recognition, geo tagging), so the LLM never wastes inference on extraction and only does the editorial inference (beat, topic, summary).

The platform has the LLM (provider-agnostic, ADR 0040) and the archive (`m-archive`), but the **NLP layer was a fresh LLM call** (`enrich.py`) — entities + geo + beat + summary all from one Sonnet call (~$0.27 / 6 signals). No Geneea here, and the founder wants an OSS alternative.

## Decision

1. **`nlp` is a connector category** (ADR 0044) — `NlpClient.analyse(text) -> {entities, geo}`. Providers: **spaCy** (OSS default), Stanza (OSS, broader multilingual), GLiNER (OSS, zero-shot entity types), HF transformers, and commercial (Geneea, AWS Comprehend, Google NL) behind the same contract.

2. **spaCy is the OSS default.** Mature, fast, Python-native, per-language models. Its NER covers Geneea's core — entities (PERSON/ORG/…) + geo (GPE/LOC). Local + free; no API key.

3. **NLP runs before the LLM** (the deck's layering). spaCy extracts entities + geo locally; the LLM then does only beat + topic + summary. This cuts enrichment cost ~10× and runs most of it offline. (Wiring spaCy into `enrich` is the follow-on slice; this ADR + the connector land first.)

4. **spaCy is an optional dependency** (`agents-py[nlp]` extra), lazily imported. Installs that don't enable the NLP layer stay lean; the adapter raises a clear "run `python -m spacy download <model>`" message if the model is absent.

## Consequences

- **Cost + offline.** Entity/geo extraction moves off the LLM to a local, free pass — the deck's economics, with OSS instead of Geneea.
- **Pluggable + multilingual.** Any newsroom swaps spaCy → Stanza (more languages) → a commercial NLP, behind one contract; per-language models serve the non-Anglo-Saxon reach.
- **Lean core preserved.** spaCy is an extra, not forced on every install; lazy load + graceful error.
- **The LLM keeps the hard part** — beat, topic, summary, vernacular — what NER can't do.

## Anti-patterns refused

- Burning LLM inference on entity extraction NER does faster + free.
- A hard spaCy dependency on every agents install.
- Hardcoding one NLP vendor (Geneea) instead of a pluggable contract.

## References

- ADR 0044 (connector framework — categories/contracts)
- ADR 0040 (provider-agnostic LLM)
- `enrich.py` (the LLM enrichment the NLP-first pass will slim)
- EIP deck (Geneea → Claude → Sarvajna layering)
