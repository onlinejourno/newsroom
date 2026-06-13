import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  accountByEmail,
  roomForRole,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { listJournalists, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const DEMO = process.env.DEMO_SIGNIN === "1";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const demoAccounts =
    DEMO && tenantId ? await listJournalists(tenantId) : [];

  async function login(formData: FormData) {
    "use server";
    const tenantId = await tenantIdForSlug(TENANT_SLUG);
    if (!tenantId) return;
    const email = String(formData.get("email") ?? "").trim();
    const pw = String(formData.get("password") ?? "");
    const acct = await accountByEmail(tenantId, email);
    if (!acct || !verifyPassword(pw, acct.password_hash)) {
      redirect(`/${locale}/login?error=bad` as Route);
    }
    if (acct.status !== "approved") redirect(`/${locale}/pending` as Route);
    await startSession(acct.id);
    redirect(`/${locale}/${roomForRole(acct.role, acct.profile_slug)}` as Route);
  }

  async function demoLogin(formData: FormData) {
    "use server";
    if (!DEMO) return;
    const tenantId = await tenantIdForSlug(TENANT_SLUG);
    if (!tenantId) return;
    const email = String(formData.get("who") ?? "");
    const acct = await accountByEmail(tenantId, email);
    if (!acct) return;
    await startSession(acct.id);
    redirect(`/${locale}/${roomForRole(acct.role, acct.profile_slug)}` as Route);
  }

  const field =
    "w-full border rounded-sm px-3 py-2 text-base mb-3";
  const fieldStyle = {
    borderColor: "var(--color-border)",
    background: "var(--color-bg)",
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full" style={{ fontFamily: "var(--font-ui)" }}>
        <p className="ds-label mb-2">OnlineJourno</p>
        <h1
          className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sign in
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-fg-secondary)" }}
        >
          The editorial-intelligence platform for your newsroom.
        </p>

        {error ? (
          <p
            className="text-sm mb-3 px-3 py-2 rounded-sm"
            style={{ background: "#dc262615", color: "#b91c1c" }}
          >
            Wrong email or password.
          </p>
        ) : null}

        <form action={login}>
          <input
            name="email"
            type="email"
            required
            placeholder="you@thehindu.co.in"
            className={field}
            style={fieldStyle}
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className={field}
            style={fieldStyle}
          />
          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-sm text-base font-semibold"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            Sign in
          </button>
        </form>

        {/* SSO provisioned, lights up when the deploy has provider creds. */}
        <button
          type="button"
          disabled
          title="Single sign-on activates when the deployment is configured with an identity provider"
          className="w-full mt-3 px-4 py-2.5 rounded-sm text-sm font-semibold border opacity-50 cursor-not-allowed"
          style={{ borderColor: "var(--color-border)" }}
        >
          Sign in with corporate SSO (coming with deployment)
        </button>

        <p
          className="text-sm mt-6"
          style={{ color: "var(--color-fg-secondary)" }}
        >
          New here?{" "}
          <a className="underline" href={`/${locale}/register`}>
            Request access
          </a>{" "}
          with your newsroom email.
        </p>

        {DEMO && demoAccounts.length ? (
          <section
            className="mt-8 pt-6 border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="ds-label mb-2">Demo sign-in (no password)</p>
            <form action={demoLogin} className="flex gap-2 flex-wrap">
              <select
                name="who"
                required
                className="flex-1 min-w-48 border rounded-sm px-3 py-2 text-sm"
                style={fieldStyle}
              >
                <option value="">— pick a person —</option>
                {demoAccounts.map((j) => (
                  <option key={j.slug} value={`${j.slug}@thehindu.co.in`}>
                    {j.name} · {j.role ?? "reporter"}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-sm text-sm font-semibold border"
                style={{ borderColor: "var(--color-border)" }}
              >
                Enter →
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
