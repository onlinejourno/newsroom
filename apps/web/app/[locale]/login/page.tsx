import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  roomForRole,
  startSession,
  userByEmail,
  verifyPassword,
} from "@/lib/auth";
import { listJournalists } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

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
  const tenantId = await currentTenantId();
  const demoAccounts =
    DEMO && tenantId ? await listJournalists(tenantId) : [];

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const pw = String(formData.get("password") ?? "");
    const acct = await userByEmail(email);
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
    const email = String(formData.get("who") ?? "");
    const acct = await userByEmail(email);
    if (!acct) return;
    await startSession(acct.id);
    redirect(`/${locale}/${roomForRole(acct.role, acct.profile_slug)}` as Route);
  }

  const field =
    "w-full border px-3 py-2 text-base mb-3";
  const fieldStyle = {
    borderColor: "var(--color-rule)",
    background: "var(--color-bg)",
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="ds-frame max-w-md w-full p-8" style={{ fontFamily: "var(--font-ui)" }}>
        <p className="ds-label mb-2">OnlineJourno</p>
        <h1
          className="ds-lead mb-1"
          style={{ fontSize: "2rem" }}
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
            className="text-sm mb-3 px-3 py-2"
            style={{ background: "var(--color-urgent-bg)", color: "var(--color-urgent)" }}
          >
            Wrong email or password.
          </p>
        ) : null}

        <form action={login}>
          <input
            name="email"
            type="email"
            required
            placeholder="you@onlinejourno.com"
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
            className="w-full px-4 py-2.5 text-base font-semibold"
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
          className="w-full mt-3 px-4 py-2.5 text-sm font-semibold border opacity-50 cursor-not-allowed"
          style={{ borderColor: "var(--color-rule)" }}
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
            style={{ borderColor: "var(--color-rule)" }}
          >
            <p className="ds-label mb-2">Demo sign-in (no password)</p>
            <form action={demoLogin} className="flex gap-2 flex-wrap">
              <select
                name="who"
                required
                className="flex-1 min-w-48 border px-3 py-2 text-sm"
                style={fieldStyle}
              >
                <option value="">— pick a person —</option>
                {demoAccounts.map((j) => (
                  <option key={j.slug} value={`${j.slug}@onlinejourno.com`}>
                    {j.name} · {j.role ?? "reporter"}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold border"
                style={{ borderColor: "var(--color-rule)" }}
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
