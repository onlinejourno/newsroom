// Site masthead — the OnlineJourno pyramid mark + wordmark, on every page.
export default function Masthead() {
  return (
    <header
      className="flex items-center gap-2 px-6 py-3 border-b sticky top-0 z-10"
      style={{ background: "var(--color-bg-nav)", borderColor: "var(--color-border)" }}
    >
      <a href="/" className="flex items-center gap-2 no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/pyramid.svg" alt="" width={26} height={26} />
        <span
          className="text-lg font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-1)" }}
        >
          OnlineJourno
        </span>
      </a>
    </header>
  );
}
