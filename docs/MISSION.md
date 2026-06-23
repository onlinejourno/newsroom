# Mission — merit should travel

> The one paragraph every product and ADR points back to.

## The contradiction

Good journalism exists. Whether it gets **seen** is decided by technical,
algorithmic, timing and placement sophistication that has nothing to do with how
good the work is — and that the largest publishers engineer for themselves while
small, regional and under-resourced newsrooms cannot. **Merit and reach are
decoupled.**

## The mission

**Re-couple them.** Give the newsrooms that have the journalism — but not the
machine — the same surfacing sophistication the giants hoard. By a journalist,
for journalists; vendor-neutral; open-source and self-hostable; a companion to
the newsroom's existing CMS, never a replacement. **Merit should travel.**

## The through-line

The suite is not a grab-bag of tools. **Every product is an answer to one reason
deserving work fails to reach its readers:**

| Why deserving work doesn't surface | What answers it |
|---|---|
| Built for the page, not the surface (no schema/meta/headline variants) | Story Scores · **Compositor** (the audit, shifted left to compose-time) |
| Wrong headline / framing for the channel | surface-tuned headlines · Compositor |
| Wrong timing, or the trend window missed | **Daybook** (predictive calendar) · Potential trajectory |
| Buried by the newsroom's *own* homepage | Hidden Gems · **Frontmatter** |
| No topic authority the algorithms trust | the EEAT lens |
| Drowned by commodity, wire-matched sameness | differentiation · primary-sources-first |
| Facts taken zero-click by AI answer engines | AEO composing + expose/gate |
| No distribution muscle against the giants | the OSS + self-host bet itself |
| The reporter doesn't know the medium | **ground-up** — the tool teaches as it works |

## Two principles hold it together

- **Ground-up** — surfaces educate the reporter (the *why*, the implications);
  they don't just route an editor's orders.
- **Connect, don't replace** — the platform sits beside the newsroom's existing
  CMS and tools; intent → agent → CMS, never owning the store.

## See also
README (the one-liner) · ADR 0041 (one-product north-star) · ADR 0042 (the EIP
design) · `docs/PRODUCT.md` · and each product's own record (Daybook, Galley,
Compositor, Frontmatter).
