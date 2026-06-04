# Uptime Monitoring

Locked Thu Jun 4, 2026. Implements the FOSS-first uptime stack chosen in ADR 0028.

## Stack

- **Cron substrate:** GitHub Actions cron schedule at `.github/workflows/uptime.yml`.
- **Notification transport:** [ntfy](https://ntfy.sh) — FOSS, optionally self-hostable, no account required.
- **Target endpoint:** `https://app.onlinejourno.com/api/health`.
- **Cadence:** every 15 minutes (GitHub Actions cron minimum is 5 min; we use 15 to avoid free-tier jitter penalty).

No third-party commercial uptime SaaS (Better Stack, Pingdom, UptimeRobot, Datadog Synthetic, etc.) is used.

## Why ntfy over commercial uptime SaaS

- **FOSS, self-hostable.** Source at <https://github.com/binwiederhier/ntfy>. If `ntfy.sh` (the public free instance) ever becomes problematic, the same workflow runs against a private `ntfy.example.com`.
- **No account, no tracking.** Subscribing to a topic does not require sign-up. Topic names are unguessable random strings.
- **No commercial vendor in the alert path.** GitHub Actions runs the cron; ntfy delivers the push. Neither sees more than the alert payload.
- **Aligned with ADR 0028 values.**

## Setup (founder, one-time, when uptime alerts are wanted — Wk 8+)

### 1. Generate a topic name

```bash
openssl rand -hex 8
# example: 7c4b9a2e6d1f8e0a
```

The topic name is functionally a secret. Anyone with it can read your alerts; anyone with your subscription can spam your topic. Treat as a credential.

### 2. Add the secret to GitHub

GitHub → repo `onlinejourno/platform` → Settings → Secrets and variables → Actions → **New repository secret**:

- Name: `NTFY_TOPIC`
- Value: the hex string from step 1

(Optional) If self-hosting ntfy later, add a repository **variable** (not secret) `NTFY_BASE_URL` with value `https://ntfy.example.com` (your server). Default is `https://ntfy.sh`.

### 3. Install ntfy on phone + desktop

- iOS: ntfy in the App Store.
- Android: ntfy on Google Play or F-Droid (F-Droid preferred — values-aligned).
- Desktop: web dashboard at `https://ntfy.sh/<your-topic>?web`.

Subscribe to the topic from step 1. Test by posting a manual notification:

```bash
curl -d "Hello from OnlineJourno" \
  -H "Title: Test alert" \
  -H "Priority: high" \
  https://ntfy.sh/7c4b9a2e6d1f8e0a
```

Notification should arrive on phone within seconds.

### 4. Trigger the workflow

GitHub → repo → Actions → `uptime-check` → **Run workflow**.

Should complete in <30s with a pass result. View the logs to confirm.

From then on, the cron schedule fires every 15 minutes.

## What an alert looks like

When the health check fails (HTTP non-200 or body does not contain `"status":"ok"`), the workflow's "Alert on failure" step posts to ntfy with:

- **Title:** `OnlineJourno app DOWN`
- **Priority:** urgent (loud notification, bypasses silent mode on mobile)
- **Tags:** `rotating_light`, `warning`
- **Click action:** opens Fly.io monitoring dashboard
- **Body:** HTTP status, response time, body excerpt, target URL, UTC timestamp

## What's not monitored Y1

- Multi-region availability (single GitHub Actions runner pings from GitHub's runner network).
- SSL cert expiry (Let's Encrypt auto-renews via Fly; manual check before any custom-cert deployment).
- Domain expiry (registrar emails the renewal reminders).
- WordPress marketing site at `onlinejourno.com` (could add a second job; deferred until needed).
- Internal health beyond `/api/health` shallow check.

## Adding more monitors later

To monitor the marketing site too, add a second job to the workflow:

```yaml
  ping-marketing:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Ping marketing site
        # ... same shape as the main ping step
        env:
          TARGET_URL: https://onlinejourno.com
```

Each new monitor reuses the same `NTFY_TOPIC` secret and alerts the same phone.

## Self-hosting ntfy (Y2+ when ready)

The ntfy server is a single Go binary, runs in a few MB of RAM. Suitable for a Fly machine, a Hetzner CX11, or any small VPS.

Steps when ready (out of scope for Y1):

1. Run ntfy server on `ntfy.onlinejourno.com` (or similar).
2. Set repo variable `NTFY_BASE_URL` to `https://ntfy.onlinejourno.com`.
3. Switch phone subscription to the new server.
4. Decommission reliance on `ntfy.sh`.

Workflow code does not change.

## Review

Triggered annually with the ADR 0028 values audit. Replace the stack only if ntfy becomes unsuitable or a clearly superior FOSS alternative emerges.
