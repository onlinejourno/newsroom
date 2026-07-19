import { FOOTER_PAGES, PRODUCTS, PROJECT, SITE, type NavLink } from "@/lib/site-nav";

function Col({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <p className="site-footer__col-title">{title}</p>
      {links.map((l) => (
        <a key={l.href} href={l.href}>
          {l.label}
        </a>
      ))}
    </div>
  );
}

/** Shared cross-property footer: the OnlineJourno ecosystem + the standard pages
 *  (About / Privacy / Contact / License) for SEO, on every authed + public page.
 *  Ink band, responsive (columns collapse on phones). */
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="site-footer"
      style={{ background: "var(--color-frame)", color: "var(--color-text-inverse)", marginTop: 64 }}
    >
      <div className="ds-page" style={{ paddingTop: 40, paddingBottom: 28 }}>
        <div className="site-footer__grid">
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>
              OnlineJourno<span style={{ color: "var(--color-urgent)" }}>.</span>
            </span>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                lineHeight: 1.5,
                opacity: 0.72,
                marginTop: 10,
                maxWidth: "34ch",
              }}
            >
              OnlineJourno Newsroom / Platform is proprietary software. The free
              tools (Tare, Crawl-Budget Analyser) are MIT. Daybook, Frontmatter,
              and Galley are source-available under FSL-1.1.
            </p>
          </div>
          <Col title="Product" links={PRODUCTS} />
          <Col title="Project" links={PROJECT} />
          <Col title="Legal" links={FOOTER_PAGES} />
        </div>
        <div className="site-footer__base">
          <span>© {year} OnlineJourno · A platform by journalists, for journalists.</span>
          <span>
            Content licensed{" "}
            <a href={`${SITE.portal}/license-attribution`} style={{ color: "inherit", textDecoration: "underline" }}>
              CC BY 4.0
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
