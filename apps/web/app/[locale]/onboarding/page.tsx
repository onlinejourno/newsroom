import { redirect } from "next/navigation";

import {
  createJournalist,
  distinctSignalRegions,
  tenantIdForSlug,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

// Mirrors ENRICH_BEATS (packages/agents-py prompts.py) — the routing
// vocabulary; keep in sync.
const BEATS = [
  "National", "Politics", "Governance", "Courts", "Crime", "Business",
  "Economy", "Markets", "Agriculture", "World", "Defence", "Science & Tech",
  "Climate", "Health", "Education", "Sport", "Culture", "Investigations",
];

// EIP's six newsroom roles.
const ROLES = [
  "Reporter", "Digital Desk", "Data Journalist", "News Editor",
  "Bureau Chief", "Editor",
];

const LANGUAGES = ["en", "hi", "ta", "te", "kn", "ml", "bn", "mr", "ur"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const regions = tenantId ? await distinctSignalRegions(tenantId) : [];

  async function join(formData: FormData) {
    "use server";
    const tenantId = await tenantIdForSlug(TENANT_SLUG);
    if (!tenantId) return;
    const name = String(formData.get("name") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim();
    const role = String(formData.get("role") ?? "Reporter");
    const language = String(formData.get("language") ?? "en");
    const beats = formData.getAll("beats").map(String).slice(0, 6);
    if (!name || beats.length === 0) return;
    const slug = slugify(name);
    await createJournalist(tenantId, {
      slug,
      name,
      region,
      beats,
      role,
      language,
    });
    redirect(`/${locale}/feed/${slug}`);
  }

  const chip =
    "inline-flex items-center gap-1 border rounded-full px-3 py-1.5 text-sm cursor-pointer";

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Join</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Three questions.
          <br />
          Under two minutes.
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Your district, your beats, your role — signals start routing to your
          feed from the next collection run, and alerts follow.
        </p>
      </header>

      <form action={join} className="space-y-8" style={{ fontFamily: "var(--font-ui)" }}>
        <div>
          <p className="ds-label mb-1">Step 1 of 3 — who you are</p>
          <input
            name="name"
            required
            placeholder="Your name"
            className="w-full border rounded-sm px-3 py-2 text-base mb-3"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg)",
            }}
          />
          <input
            name="region"
            list="regions"
            placeholder="Your district / region (e.g. Andhra Pradesh)"
            className="w-full border rounded-sm px-3 py-2 text-base"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg)",
            }}
          />
          <datalist id="regions">
            {regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <p className="text-xs mt-1" style={{ color: "var(--color-fg-tertiary)" }}>
            Signals are filtered to your area first.
          </p>
        </div>

        <div>
          <p className="ds-label mb-2">Step 2 of 3 — your beats</p>
          <div className="flex flex-wrap gap-2">
            {BEATS.map((b) => (
              <label key={b} className={chip} style={{ borderColor: "var(--color-border)" }}>
                <input type="checkbox" name="beats" value={b} className="accent-current" />
                {b}
              </label>
            ))}
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--color-fg-tertiary)" }}>
            Pick 2–4. You can change these later.
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="ds-label">Step 3 of 3 — your role</span>
            <select
              name="role"
              className="border rounded-sm px-3 py-2"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg)",
              }}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="ds-label">Working language</span>
            <select
              name="language"
              className="border rounded-sm px-3 py-2"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg)",
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-sm text-base font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          Start my feed →
        </button>
      </form>
    </main>
  );
}
