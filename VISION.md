# Vision

OnlineJourno Xtnd is the converged-newsroom orchestration layer that gives every story a fair chance across every surface it could reach.

## The reporter we are building for

A reporter on the markets beat. Phone in pocket. Day has begun.

A notification: SEBI has issued a circular touching a listed company she has been following for two years. She opens it. The brief shows the raw filing URL, two press releases from the same company in the last 90 days, her own three prior stories on this company, and an LLM priming summary that lays out the regulatory background in three lines. The trend panel shows "compliance" and "promoter pledge" rising in queries this week. She has the angle in 90 seconds.

She files the story. Before publish, the distribution-fit cue says: *"Strong on Search — your H2 lines up with rising query 'pledge ratio.' Strong on Direct — your audience clicks regulatory-orders stories. Subscription fit weak — your opening 200 words don't promise reader value; consider a kicker. Discover fit weak — no image attached; aspect ratio guide below."*

She fixes the kicker, picks an image, hits publish.

The digital desk sees her story in their queue, alongside fifteen others. Each has signals attached: predicted CTR for homepage slot 2 vs 8, predicted social momentum on X vs LinkedIn, dwell-time forecast based on similar pieces, fit scores for each section page. The desk editor sees her story is **section-page worthy with a strong shot at Search** but **homepage slot 8 is a weak fit**. She is placed accordingly. The social team sees a queued post with a recommended quote, three image options, and a Sunday-evening repromote scheduled because regulatory analyses age better than breaking news.

A commission auto-triggers: *"This story would benefit from a chart on pledge-ratio history. Data-viz team notified."* Editor confirms. Slack ping fires.

Twelve hours later, the post-publish diagnostic shows: *"Discover impressions 7,400 — image performed. Search rank 11 for 'SEBI pledge promoter' — H2 is winning. Subscription conversions 3 — kicker helped. Direct CTR 6.1% — your byline pulls."* The reporter sees this on her own dashboard. She learns. The newsroom hierarchy sees the same data; no asymmetry. Across the desk shift, the fair-chance audit shows that three women-bylined stories were under-placed on homepage relative to predicted CTR. The dashboard surfaces the pattern. Next week, the desk corrects.

That is the product.

## What this changes about newsroom work

| Today | With Xtnd |
|-------|-----------|
| Reporter files; desk decides placement opaquely; reporter never knows why a story died. | Reporter files with pre-publish fit cues; desk places with signal transparency; reporter sees post-publish diagnostic on every story. |
| SEO knowledge gatekept by digital desk; reporter depends on intermediary to know why a story underperformed. | SEO + Discover + social diagnostics surfaced per-story to the reporter directly. |
| Cross-team commissioning (data viz, video, audio) happens through ad-hoc Slack pings; commissions get lost. | Auto-suggested commissions routed to teams with brief + source linkage; status visible to reporter and desk. |
| Newsroom hierarchy sees aggregate analytics; individual stories disappear into the funnel. | Fair-chance audit makes systemic bias and surface gaps visible at story level. |
| Multi-modal expectations (reporter doing text + audio + video) without time-cost transparency. | Multi-modal workflow guide shows time cost per medium; commissioning replaces solo polymath assumption. |

## What this is not

- Not a CMS replacement. Newsrooms keep Méthode / Cue / WordPress / Ghost / custom CMS. Xtnd reads draft state and informs alongside.
- Not an autopilot. Editor decides placement, scheduling, commissioning. System surfaces signals.
- Not an algorithmic-editorial tool. The fair-chance audit is for humans to act on, not for an algorithm to override editorial judgement.
- Not a moat against reporters knowing things. The opposite: information symmetry is the design principle.

## Positioning

| Incumbent | What they do | Where Xtnd differs |
|-----------|--------------|---------------------|
| Chartbeat | Real-time traffic dashboard | Xtnd is pre-publish + post-publish + cross-role, not real-time traffic |
| Parse.ly | Audience analytics + content scoring | Xtnd is workflow-coupled, not measurement-only |
| NewsWhip | Social monitoring | Xtnd is converged across all surfaces, not social-only |
| Hearken / Pico | Audience engagement | Different layer; Xtnd is editorial-side, not reader-side |
| Trint / Descript | Transcription / audio production | Xtnd commissions to these; doesn't replace them |
| NewsCred / Contently | Content-marketing workflow for brands | Wrong industry; both died from cross-category drift (CONTEXT.md identity coherence note) |

No incumbent occupies the converged-newsroom orchestration position with fair-chance ethos. This is the white space.

## Five-year arc

| Year | Posture | Product state |
|------|---------|----------------|
| Y1 | Platform-only. Xtnd = docs. | Single-beat brief MVP at one newsroom. |
| Y2 | Xtnd modules 1: distribution-fit, CMS read adapter (WordPress), desk surface, mobile PWA. | Reporter + desk surface live at 1-2 design partners. |
| Y3 | Xtnd modules 2: post-publish diagnostic, placement support, commission router UI, social scheduler. | Converged-newsroom product at 3-5 newsrooms. |
| Y4 | Optional head mode. CMS write adapter (gated on customer pull). | Newsrooms can publish through Xtnd to distribution surfaces if they choose. |
| Y5 | Cross-newsroom learning (consent-gated). Federated fair-chance benchmarks. | Industry-level distribution-equity analytics, opt-in. |

Year 5 is speculative. Year 2-3 is concrete. Year 1 is locked at platform-level and untouched by Xtnd.

## Why this matters

Because *journalism is a public good that depends on stories reaching readers,* and because the surfaces that distribute stories are increasingly opaque to the journalists who write them. Reporters file into a fog. Desks place into a fog. Newsrooms learn from quarterly analytics decks too late to change anything. Xtnd makes the fog navigable — not by removing the editor's judgement, but by giving the editor and the reporter the same information at the same time, on the same canonical story object, before and after publish.

Every story deserves a fair chance. The newsroom owes the story that much. Xtnd is the tool that makes the chance visible.
