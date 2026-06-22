# OnlineJourno — WordPress theme

A self-contained, classic (PHP) WordPress theme that dresses a WordPress site in
the OnlineJourno brand: warm newsprint paper, black ink, the refracting-prism
mark, and the editorial serif system (Karnata F Kittel display · Source Serif 4
body · IBM Plex Sans labels · IBM Plex Mono data).

> "A platform by journalists, for journalists."

## Install
1. Zip the **`onlinejourno/`** folder (the folder that contains `style.css`), or
   copy it directly to `wp-content/themes/onlinejourno/` on your server.
   - Quick zip: from this directory run `cd wordpress-theme && zip -r onlinejourno.zip onlinejourno`.
2. In WP Admin → **Appearance → Themes → Add New → Upload Theme**, choose the zip,
   then **Activate** (or just activate it if you copied the folder in).
3. **Appearance → Menus**: create a menu and assign it to the *Primary Masthead*
   location (e.g. Today, Sources, Analyse, About). A sensible fallback shows if
   you skip this.
4. **Appearance → Customize → Site Identity**: upload the prism logo as the Custom
   Logo (the bundled `assets/img/mark.png` is used if you don't).

## What's included
| File | Purpose |
|------|---------|
| `style.css` | Theme header + all design tokens + full stylesheet (self-hosts Kittel). |
| `functions.php` | Enqueues fonts/styles, theme supports, menus, excerpt + byline helpers. |
| `header.php` / `footer.php` | Masthead nav (prism mark + `OnlineJourno.` wordmark) and footer. |
| `index.php` | Blog / newslist stream. |
| `template-parts/content-card.php` | One story card in the stream. |
| `single.php` | Article view — serif reading column, byline, pull-quotes. |
| `page.php` · `archive.php` · `search.php` · `404.php` | Standard views. |
| `comments.php` | Styled comment list + form. |
| `assets/fonts/KarnataFKittel.otf` | Self-hosted brand display serif (SIL OFL 1.1). |
| `assets/img/mark.png` | Prism logo mark. |
| `screenshot.png` | Theme picker thumbnail. |

## Notes
- **Fonts:** Kittel is self-hosted (no bold/italic — hierarchy is size + colour).
  Source Serif 4, IBM Plex Sans/Mono load from Google Fonts; self-host them too if
  your newsroom blocks external font CDNs (drop the files in `assets/fonts/` and
  swap the `wp_enqueue_style` URL in `functions.php`).
- **Kickers** use each post's primary **category**; the Need/Kind pills on cards
  are illustrative — wire them to real taxonomies/ACF fields if you classify posts.
- This is a classic PHP theme (not a block theme), so it's easy to read and edit.
  It mirrors the OnlineJourno design system tokens 1:1, so it stays in sync with
  the rest of the brand.
