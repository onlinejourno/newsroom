# Contributing to OnlineJourno Masthead

**Single-maintainer project.** PRs and issues are reviewed, not on a same-day
basis. For guaranteed response, contact licensing@onlinejourno.com.

## License

Masthead is source-available under FSL-1.1-ALv2 (see `LICENSE.md`), converting
to Apache 2.0 on 2028-06-24. By contributing, you agree to license your
contribution under the same terms.

## Developer Certificate of Origin (DCO)

All contributions must be signed off with the DCO. Add this to every commit:

```bash
git commit --signoff
```

This adds `Signed-off-by: Your Name <your@email.com>` to your commit message,
certifying that:

> By making a contribution to this project, I certify that:
>
> (a) The contribution was created in whole or in part by me and I have the
>     right to submit it under the license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of my
>     knowledge, is covered under an appropriate license and I have the right
>     under that license to submit that work with modifications, whether created
>     in whole or in part by me, under the same license, as indicated in the
>     file; or
>
> (c) The contribution was provided directly to me by some other person who
>     certified (a), (b), or (c) and I have not modified it.
>
> (d) I understand and agree that this project and the contribution are public
>     and that a record of the contribution (including all personal information
>     I submit with it, including my sign-off) is maintained indefinitely and
>     may be redistributed consistent with this project or the license(s)
>     involved.
>
> — Developer Certificate of Origin, Version 1.1 (developercertificate.org)

PRs without a DCO sign-off on every commit will not be merged.

## What to contribute

See open issues tagged `good-first-issue`. Each issue has explicit acceptance
criteria. Focus areas:

- CMS read adapters
- Distribution-fit surface scorers
- Post-publish data source adapters
- Localisation (UI translations)
- Documentation

## What not to contribute

- Autopilot / autonomous publishing features — every capability is
  decision-support (not autopilot)
- CMS write adapters
- New top-level dependencies without a prior issue/ADR

## Local development

```bash
git clone https://github.com/onlinejourno/arena.git
cd arena
pnpm install
pnpm dev
```

Python packages (scoring, agents):

```bash
cd packages/scoring-py
uv sync
uv run pytest
```

## Security disclosure

Do not open a public issue for security vulnerabilities. Email
security@onlinejourno.com with details. PGP key on request.

## Recognition

Contributors are listed in `CONTRIBUTORS.md` on merge.
