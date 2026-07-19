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

**Proprietary — All Rights Reserved.**

OnlineJourno Newsroom / Platform is proprietary software. The source is made
available for reference, audit, and review only. Production use, modification,
redistribution, or competitive use requires a separate written licence from
Subhash Rai / OnlineJourno. See [`LICENSE.md`](LICENSE.md) for full terms.

For licensing enquiries: licensing@onlinejourno.com.

Other products in the OnlineJourno suite remain under their own licences:
- **Tare** and **Crawl-Budget Analyser** — MIT.
- **Daybook**, **Frontmatter**, and **Galley** — Functional Source License 1.1
  (FSL-1.1-ALv2), converting to Apache-2.0 after two years.
- **Pulse**, **Regwatch**, **LawWatch**, and **Loupe** — proprietary.

## Contributing

Contributions are welcome within the FSL scope. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). For security issues, see
[SECURITY.md](SECURITY.md) — do not open a public issue.

## About

Built and maintained by Subhash Rai — journalist, and founder of OnlineJourno.
More at [onlinejourno.com](https://onlinejourno.com).
