<?php
/**
 * Template Name: OSOP Landing
 *
 * Landing page for the OnlineJourno Story Optimisation Platform (OSOP).
 * Drop this file into the OnlineJourno theme: wp-content/themes/onlinejourno/page-osop.php
 * Then create a Page in WP and choose Template → "OSOP Landing".
 *
 * Uses the theme's design tokens + enqueued fonts (Kittel / Source Serif 4 /
 * IBM Plex). Brand-neutral: no outlet named. Pre-release "coming soon" CTA.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<style>
.osop section{ }
.osop .wrap{ max-width: var(--container); margin:0 auto; padding-left:28px; padding-right:28px; }
.osop .h-display{ font:400 56px/1.04 var(--font-display); letter-spacing:-0.015em; margin:16px 0 0; }
.osop .h2{ font:400 33px/1.12 var(--font-display); letter-spacing:-0.01em; margin:0; }
.osop .lead{ font:400 18px/1.6 var(--font-serif); color:var(--text-secondary); }
.osop .mono{ font-family:var(--font-mono); }
.osop .badge{ display:inline-flex; align-items:center; gap:5px; font:500 11px/1.4 var(--font-sans); padding:2px 9px; border-radius:999px; }
.osop .obtn{ display:inline-flex; align-items:center; justify-content:center; gap:7px; font:600 14px/1 var(--font-sans); border-radius:2px; padding:13px 20px; border:1px solid var(--ink); text-decoration:none; cursor:pointer; }
.osop .obtn-ink{ background:var(--ink); color:#f7f4ed; }
.osop .obtn-sec{ background:transparent; color:var(--ink); border-color:var(--border-default); }
.osop .feat{ border-top:2px solid var(--ink); padding-top:16px; }
.osop .feat h3{ font:600 21px/1.2 var(--font-serif); margin:10px 0 8px; }
.osop .feat p{ font:400 15px/1.55 var(--font-serif); color:var(--text-secondary); margin:0; }
@media (max-width:880px){ .osop .grid2,.osop .grid3{ grid-template-columns:1fr !important; } .osop .h-display{ font-size:40px; } }
</style>

<div class="osop">

  <section style="background:var(--paper); border-bottom:1px solid var(--border-subtle);">
    <div class="wrap grid2" style="padding:70px 28px 60px; display:grid; grid-template-columns:1.05fr 0.95fr; gap:52px; align-items:center;">
      <div>
        <span class="kicker">OnlineJourno · Story Optimisation Platform</span>
        <h1 class="h-display">Give every story a <span style="color:var(--accent)">fair chance</span> across every surface.</h1>
        <p class="lead" style="max-width:48ch; margin-top:22px;">Audit any story for Google Discover, Search &amp; News, AI Overviews, AI assistants and YouTube — with the fixes, the schema, and the <em>why</em>. Free, open-source, self-hosted.</p>
        <div style="display:flex; gap:12px; margin-top:30px;">
          <a class="obtn obtn-ink" href="#">Get it on GitHub</a>
          <a class="obtn obtn-sec" href="#how">See how it works</a>
        </div>
        <p style="font:400 13px/1.5 var(--font-sans); color:var(--text-faint); margin-top:16px;">Free · Apache-2.0 · runs on your machine · no account · vendor-neutral</p>
      </div>
      <div style="background:var(--paper); border:1px solid var(--border-subtle); border-top:2px solid var(--accent); border-radius:3px; box-shadow:0 10px 30px rgba(24,22,16,.12); overflow:hidden;">
        <div style="padding:15px 18px; border-bottom:1px solid var(--border-subtle);">
          <div class="kicker" style="color:var(--text-muted);">Story audit · meridian.example</div>
          <div style="font:600 19px/1.25 var(--font-serif); margin-top:5px;">Monsoon arrives early, reshaping the kharif calendar</div>
        </div>
        <div style="padding:16px 18px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
            <span class="badge" style="background:#e6f0e8; color:var(--green);">Discover 84</span>
            <span class="badge" style="background:#f6efe0; color:var(--gold);">Search 61</span>
            <span class="badge" style="background:#f7e3e0; color:var(--accent);">● Schema missing</span>
          </div>
          <div style="display:grid; gap:7px;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border:1px solid var(--border-subtle); border-radius:2px; background:var(--paper-warm);">
              <span style="font:500 13px/1 var(--font-sans);">E-E-A-T · primary source</span><span class="mono" style="font-size:12px; color:var(--gold);">review</span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border:1px solid var(--border-subtle); border-radius:2px; background:var(--paper-warm);">
              <span style="font:500 13px/1 var(--font-sans);">Add NewsArticle + VideoObject</span><span class="mono" style="font-size:12px; color:var(--green);">fix ready</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid var(--border-subtle);">
            <span class="mono" style="font-size:12px; color:var(--text-muted);">6 surfaces · 3 fixes</span>
            <span style="font:600 13px/1 var(--font-sans); color:var(--accent);">Open report →</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section style="background:var(--paper-warm); border-bottom:1px solid var(--border-subtle);">
    <div class="wrap" style="padding:60px 28px;">
      <span class="kicker">What it does</span>
      <h2 class="h2" style="margin-top:10px;">Find the story, score it, fix it.</h2>
      <div class="grid3" style="display:grid; grid-template-columns:repeat(3,1fr); gap:28px 32px; margin-top:38px;">
        <div class="feat"><span class="mono" style="font-size:13px; color:var(--accent);">01</span><h3>Per-story audit</h3><p>SEO &amp; E-E-A-T graded against Google's Search Quality Rater Guidelines — every finding in plain language.</p></div>
        <div class="feat"><span class="mono" style="font-size:13px; color:var(--accent);">02</span><h3>Schema.org, fixed for you</h3><p>Detects missing or wrong structured data and hands you corrected JSON-LD — NewsArticle, VideoObject and more.</p></div>
        <div class="feat"><span class="mono" style="font-size:13px; color:var(--accent);">03</span><h3>Surface readiness</h3><p>Scores each story for Discover, Search, News, AI Overviews, ChatGPT/Perplexity/Gemini and YouTube — add your own.</p></div>
        <div class="feat"><span class="mono" style="font-size:13px; color:var(--accent);">04</span><h3>Trends &amp; signals</h3><p>Beat-scoped trending topics, enriched with Wikidata entities, with momentum and trajectory charts.</p></div>
        <div class="feat"><span class="mono" style="font-size:13px; color:var(--accent);">05</span><h3>Core Web Vitals</h3><p>Discovery dies on a slow page. LCP, CLS and INP, checked per story, with what to do about each.</p></div>
        <div class="feat"><span class="mono" style="font-size:13px; color:var(--accent);">06</span><h3>Prioritised fixes</h3><p>Ranked by impact and effort, so the desk knows what to do first — and why it matters.</p></div>
      </div>
    </div>
  </section>

  <section style="background:var(--ink-band);">
    <div class="wrap" style="max-width:920px; padding:72px 28px; text-align:center;">
      <span class="kicker" style="color:rgba(255,255,255,.55);">The ethic</span>
      <p style="font:400 35px/1.28 var(--font-serif); color:#fff; margin:22px 0 0; letter-spacing:-0.01em;">The machine surfaces. The journalist decides. It <span style="color:#e6726a;">teaches</span> as it audits — built from a journalist, for journalists.</p>
    </div>
  </section>

  <section id="how" style="background:var(--paper); border-bottom:1px solid var(--border-subtle);">
    <div class="wrap" style="padding:60px 28px;">
      <span class="kicker">How it works</span>
      <h2 class="h2" style="margin-top:10px;">Three steps. No account.</h2>
      <div class="grid3" style="display:grid; grid-template-columns:repeat(3,1fr); gap:32px; margin-top:36px;">
        <div><span class="mono" style="font-size:13px; color:var(--accent);">Step 01</span><h3 style="font:600 20px/1.2 var(--font-serif); margin:8px 0;">Download</h3><p style="font:400 15px/1.55 var(--font-serif); color:var(--text-secondary); margin:0;">Grab it from GitHub and run <span class="mono" style="font-size:13px;">docker compose up</span>.</p></div>
        <div><span class="mono" style="font-size:13px; color:var(--accent);">Step 02</span><h3 style="font:600 20px/1.2 var(--font-serif); margin:8px 0;">Configure</h3><p style="font:400 15px/1.55 var(--font-serif); color:var(--text-secondary); margin:0;">Set sources, surfaces, beats and market in one <span class="mono" style="font-size:13px;">newsroom.yaml</span>.</p></div>
        <div><span class="mono" style="font-size:13px; color:var(--accent);">Step 03</span><h3 style="font:600 20px/1.2 var(--font-serif); margin:8px 0;">Audit &amp; optimise</h3><p style="font:400 15px/1.55 var(--font-serif); color:var(--text-secondary); margin:0;">Paste a URL or pull your sitemap. Get the report and the fixes.</p></div>
      </div>
    </div>
  </section>

  <section style="background:var(--paper-warm); border-bottom:1px solid var(--border-subtle);">
    <div class="wrap" style="padding:60px 28px;">
      <span class="kicker">Two tiers — you choose</span>
      <h2 class="h2" style="margin-top:10px;">Free by default. Smarter with your own AI.</h2>
      <div class="grid2" style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:36px;">
        <div style="background:var(--paper); border:1px solid var(--border-subtle); border-radius:3px; padding:26px;">
          <span class="badge" style="background:#e6f0e8; color:var(--green);">Free &amp; keyless</span>
          <h3 style="font:600 22px/1.2 var(--font-serif); margin:14px 0 6px;">Tier 0</h3>
          <p style="font:400 15px/1.55 var(--font-serif); color:var(--text-secondary); margin:0 0 14px;">The full deterministic core — no API key, no cost.</p>
          <ul style="margin:0; padding-left:18px; font:400 15px/1.7 var(--font-serif); color:var(--text-secondary);"><li>Per-story SEO &amp; E-E-A-T audit</li><li>Surface readiness scoring</li><li>Schema detection + template fixes</li><li>Core Web Vitals · prioritised fixes</li></ul>
        </div>
        <div style="background:var(--paper); border:1px solid var(--border-subtle); border-top:2px solid var(--accent); border-radius:3px; padding:26px; box-shadow:0 10px 30px rgba(24,22,16,.12);">
          <span class="badge" style="background:#f7e3e0; color:var(--accent);">Add your own AI</span>
          <h3 style="font:600 22px/1.2 var(--font-serif); margin:14px 0 6px;">Tier 1</h3>
          <p style="font:400 15px/1.55 var(--font-serif); color:var(--text-secondary); margin:0 0 14px;">Plug in any model — Claude, GPT, Gemini, or local. Your key, your call.</p>
          <ul style="margin:0; padding-left:18px; font:400 15px/1.7 var(--font-serif); color:var(--text-secondary);"><li>8 BBC-Smartocto user needs</li><li>AI-written Schema.org suggestions</li><li>Agentic SEO/GEO assistant</li><li>Provider-agnostic — no lock-in</li></ul>
        </div>
      </div>
    </div>
  </section>

  <section style="background:var(--paper);">
    <div class="wrap grid2" style="padding:60px 28px; display:grid; grid-template-columns:1fr auto; gap:40px; align-items:center;">
      <div>
        <span class="kicker">Coming soon</span>
        <h2 class="h2" style="margin-top:10px;">Be first to run it.</h2>
        <p class="lead" style="margin-top:12px; max-width:50ch;">Open-source and self-hosted, launching from GitHub. Star the repo to follow, or leave your email and we'll tell you when it ships.</p>
      </div>
      <form style="display:flex; gap:10px; align-items:center;" onsubmit="return false;">
        <input placeholder="you@newsroom.example" style="font:400 15px/1 var(--font-sans); padding:13px 14px; border:1px solid var(--border-default); border-radius:2px; background:var(--paper); min-width:240px;">
        <button class="obtn obtn-ink" type="submit">Notify me</button>
      </form>
    </div>
  </section>

</div>

<script defer src="https://onlinejourno-umami.fly.dev/script.js" data-website-id="123f1428-af88-498b-a1fb-50a060ec7ddd"></script>

<?php get_footer(); ?>
