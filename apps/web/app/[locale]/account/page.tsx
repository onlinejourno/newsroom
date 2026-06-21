import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  accountByEmail,
  assertWritable,
  getAccount,
  setPassword,
  verifyPassword,
} from "@/lib/auth";
import { currentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { locale } = await params;
  const { error, ok } = await searchParams;
  const me = await getAccount();
  if (!me) redirect(`/${locale}/login` as Route);

  async function change(formData: FormData) {
    "use server";
    const me = await getAccount();
    assertWritable(me);
    const tenantId = await currentTenantId();
    if (!tenantId) return;

    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (next.length < 8 || next !== confirm)
      redirect(`/${locale}/account?error=fields` as Route);

    const acct = await accountByEmail(tenantId, me.email);
    if (!acct || !verifyPassword(current, acct.password_hash))
      redirect(`/${locale}/account?error=current` as Route);

    await setPassword(me.id, next);
    redirect(`/${locale}/account?ok=1` as Route);
  }

  const field = "w-full border px-3 py-2 text-base mb-3";
  const fieldStyle = {
    borderColor: "var(--color-rule)",
    background: "var(--color-bg)",
  };
  const messages: Record<string, string> = {
    fields: "New password must be ≥ 8 characters and match the confirmation.",
    current: "Current password is wrong.",
  };

  return (
    <main className="min-h-screen flex items-start justify-center p-6">
      <div className="ds-frame max-w-md w-full p-8" style={{ fontFamily: "var(--font-ui)" }}>
        <p className="ds-label mb-2">OnlineJourno · Account</p>
        <h1
          className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Change password
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-fg-secondary)" }}>
          Signed in as {me.display_name ?? me.email}.
        </p>

        {ok ? (
          <p
            className="text-sm mb-3 px-3 py-2"
            style={{ background: "var(--color-bg-card)", color: "var(--color-fg-primary)" }}
          >
            Password changed.
          </p>
        ) : null}
        {error ? (
          <p
            className="text-sm mb-3 px-3 py-2"
            style={{ background: "var(--color-urgent-bg)", color: "var(--color-urgent)" }}
          >
            {messages[error] ?? "Please check the form."}
          </p>
        ) : null}

        <form action={change}>
          <input
            name="current"
            type="password"
            required
            placeholder="Current password"
            className={field}
            style={fieldStyle}
          />
          <input
            name="next"
            type="password"
            required
            minLength={8}
            placeholder="New password (≥ 8 chars)"
            className={field}
            style={fieldStyle}
          />
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            className={field}
            style={fieldStyle}
          />
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-base font-semibold"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            Change password
          </button>
        </form>
      </div>
    </main>
  );
}
