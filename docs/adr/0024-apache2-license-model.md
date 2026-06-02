# ADR 0024 — License model: Apache 2.0 core, MIT public data

**Status:** Accepted (2026-06-03).

## Context

The platform needs a license that:

1. Matches the moral / transparency dimension of journalism (newsrooms trust open code more than they trust closed black boxes).
2. Allows the founder to provide commercial services on top of the same code without restricting customers' ability to inspect, audit, or self-host.
3. Permits permissive downstream use (newsrooms can patch and run modified versions) without forcing the founder into copyleft enforcement work.
4. Avoids cloud-absorption risk (a major cloud provider running a competing SaaS by adopting the codebase) at acceptable cost.
5. Survives solo-maintainer reality — no need to chase license violations, no aggressive copyleft policing.
6. Is recognised, simple, and contributor-friendly.

Prior consideration of BSL 1.1 (Business Source License) was rejected because:

- BSL adds a non-compete restriction that licensees must inspect for every use case.
- BSL's eventual conversion to a permissive license (typically 4 years) muddles long-term openness messaging.
- The founder's path is indie-sustainable, not venture-defended; BSL's anti-competitor stance addresses a problem the founder is not actually facing in the Indian newsroom-tech space.
- Apache 2.0 is more familiar to contributors and customers.

GPL / AGPL / LGPL were rejected because:

- Copyleft requirements complicate customer adoption (customers must reason about whether their integrations trigger source disclosure).
- AGPL specifically requires source code disclosure for SaaS deployments, which contradicts the platform's customer-confidentiality promise on editorial DNA, briefs, and beat configurations.
- Strong copyleft demands enforcement work the solo founder cannot sustain.

## Decision

Apply the following license stack from Day 1:

| Layer | License |
|-------|---------|
| `apps/web`, `packages/spine`, `packages/modules/*` | **Apache License 2.0** |
| `packages/spine/catalogues/*` (public data: states, RERA, IPTC, sources) | **MIT** when published as community repos (Y2+) |
| `packages/spine/templates/*` (section IA templates) | **MIT** when published as community repos (Y2+) |
| Plugin SDK (`packages/sdk/`, ships Y2+) | **MIT** |
| Closed enterprise add-ons (Y2+) | Proprietary, not in this repo |
| Customer tenant data (briefs, signals, editorial DNA, journalist preferences) | Customer-owned; never aggregated or shared by platform operator |

Source repository becomes public when the schema, ADRs, and module contracts are stable enough not to embarrass. Earliest Wk 10–12, possibly later. Until that day, the repo is private on GitHub but the license is already Apache 2.0; nothing in the repo carries proprietary terms.

## Consequences

**Permissions (granted to anyone):**

- Inspect, copy, modify, redistribute, and use the code for any purpose including commercial.
- Run the platform privately, self-host, fork, contribute back.
- Build derivative products on top of the platform.
- Use the platform name "OnlineJourno" only for unmodified or clearly-attributed redistributions; the trademark is owned by Subhash Rai (see ADR 0024-trademark, future).

**Obligations:**

- Retain copyright + license notices in redistributions.
- State significant modifications.
- Carry the `NOTICE` file forward in derivative works.

**Prohibitions:**

- Use of the OnlineJourno trademark or visual identity outside attribution.
- Patent litigation against contributors (triggers automatic license termination).

**Dependency rules:**

- Apache 2.0 is compatible only with permissive upstream licenses (MIT, BSD-2-Clause, BSD-3-Clause, Apache 2.0 itself, ISC).
- GPL / AGPL / LGPL dependencies cannot be included in `apps/web`, `packages/spine`, or `packages/modules/*`. If a future module genuinely requires a GPL dependency, that module ships under GPL and is loaded as an out-of-process plugin; the spine remains Apache 2.0.
- Each new external dependency added to the repo must have its license recorded in `docs/IP-PROVENANCE.md` and the licence verified as permissive.

**Customer-confidentiality promise:**

- Editorial DNA, beat configurations, briefs, signals, rejected items, journalist preferences, and any customer-uploaded content belong to the customer and never leave their tenant boundary.
- Apache 2.0 governs only the platform code, not customer-supplied data.

## Operational rules at first public-source moment

When the repo flips from private to public:

1. Add Apache 2.0 SPDX header (`# SPDX-License-Identifier: Apache-2.0`) to every source file in `apps/`, `packages/`, and `infra/`.
2. Add `SECURITY.md` (vulnerability disclosure process).
3. Add `CONTRIBUTING.md` (PR + review process — see ADR 0025).
4. Add `CODE_OF_CONDUCT.md` (Contributor Covenant recommended).
5. Add `single-maintainer.md` badge / disclaimer in README (per ADR 0026).

## Revisit

- If a cloud provider runs a competing managed service that materially affects revenue, reconsider BSL or other source-available license for new versions. Existing Apache 2.0 releases remain Apache 2.0 forever.
- If contributor activity warrants, consider establishing a non-profit foundation (Ghost / Sourcefabric pattern) to hold trademark + assets.
