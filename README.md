# OnlineJourno Newsroom

Editorial intelligence **by a journalist, for journalists** — a vendor-neutral
platform that helps a reporter find the story, brings the newsroom's archive
depth behind it, and gives every story a fair chance to reach its readers,
before publish and after. A companion to your existing CMS, never a replacement.

Decision-support, not autopilot: the software surfaces signal and suggests; the
journalist decides. It never writes the story or touches the publish button.

## What it does

- **Find** — monitors sources and surfaces what's worth a reporter's attention,
  with the reasoning shown.
- **Frame** — reads how a story is being framed across outlets.
- **Fair chance** — after publish, checks whether a story reached the people it
  was for, and suggests fixes.

Every claim is linked to where it came from. It is configurable per newsroom and
self-hostable.

## Who it's for

Newsrooms and the journalists in them — from the reporter at the base of the
desk to the editor planning the week. Run it yourself, or plug it in alongside
your CMS.

## Run it

See **[SELF-HOST.md](SELF-HOST.md)** for the full self-hosting guide. In brief:

```
# Web (Next.js)
pnpm install
pnpm --dir apps/web dev

# Workers (Python, uv-managed)
uv sync
```

Configuration is supplied via environment variables — copy the `.env.example`
files and fill in your own values. No credentials are committed to this repo.

## Licence

Source-available under the **Functional Source License 1.1 (FSL-1.1-ALv2)** —
use, modify, and self-host for any Permitted Purpose, including professional
services. Competing commercial use is restricted for two years per release,
after which each release converts to Apache-2.0. See
[`LICENSE.md`](LICENSE.md) and [`COMMERCIAL_LICENSE.md`](COMMERCIAL_LICENSE.md);
methodology and docs are CC BY 4.0 (see [`METHODOLOGY-LICENSE.md`](METHODOLOGY-LICENSE.md)).

The free tools in the OnlineJourno suite — **Tare** (web-bloat & tracker audit)
and the **Crawl-Budget Analyser** — are MIT.

## Contributing

Contributions are welcome within the FSL scope. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). For security issues, see
[SECURITY.md](SECURITY.md) — do not open a public issue.

## About

Built and maintained by Subhash Rai — journalist, and founder of OnlineJourno.
More at [onlinejourno.com](https://onlinejourno.com).
