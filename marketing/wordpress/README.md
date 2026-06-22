# OnlineJourno — WordPress site assets

Brand theme + standard pages for **onlinejourno.com** (self-hosted WordPress). Install these in
wp-admin — nothing here touches the live site automatically.

## 1. Install the theme

1. Zip the theme folder:
   ```bash
   cd marketing/wordpress/theme && zip -r onlinejourno.zip onlinejourno
   ```
2. wp-admin → **Appearance ▸ Themes ▸ Add New ▸ Upload Theme** → choose `onlinejourno.zip` →
   **Install** → **Activate**.
3. The theme bundles the Karnata F Kittel font and the prism mark. Source Serif 4 + IBM Plex load
   from Google Fonts; self-host them too if your policy blocks font CDNs.

## 2. Create the standard pages

For each file in `pages/`, create a **Page** (Pages ▸ Add New), set the title + **slug**, paste the
content (the block editor converts the Markdown), then **Publish**:

| File | Title | Slug |
|------|-------|------|
| `about.md` | About | `about` |
| `privacy.md` | Privacy Policy | `privacy-policy` |
| `contact.md` | Contact | `contact` |
| `license-attribution.md` | License & Attribution | `license-attribution` |

The theme footer already links to these slugs.

## 3. Menus, logo, homepage

- **Logo** — Appearance ▸ Customize ▸ Site Identity: upload the prism mark (or it falls back to the
  bundled `assets/img/mark.png`). The logo links to the homepage.
- **Primary menu** — Appearance ▸ Menus: add About + your post categories as desired.
- **Homepage** — Settings ▸ Reading: set your front page.

## Confirm before publishing

- **Contact email** — the pages use `hello@onlinejourno.com`. Change it if you use a different address.
- **GitHub link** — the License page points at `github.com/onlinejourno`; update it to the public repo
  URL once the project is public (the repo is currently private).

## Mobile

The theme is responsive: the nav wraps and then horizontally scrolls on phones (never hidden), the
footer collapses to one column, and display type scales down. Verify on a phone after install.
