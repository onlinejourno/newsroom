import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  accountIdByEmail,
  createPendingAccount,
  tenantEmailDomain,
} from "@/lib/auth";
import { currentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";
const ROLES = ["reporter", "desk", "editor", "viewer"];

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const tenantId = await currentTenantId();
  const domain = tenantId ? await tenantEmailDomain(tenantId) : null;

  async function register(formData: FormData) {
    "use server";
    const tenantId = await currentTenantId();
    if (!tenantId) return;
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const name = String(formData.get("name") ?? "").trim();
    const pw = String(formData.get("password") ?? "");
    // Whitelist against ROLES (which excludes "admin") — server actions accept
    // arbitrary POST data, so never trust the client-supplied role.
    const roleRaw = String(formData.get("role") ?? "reporter");
    const role = ROLES.includes(roleRaw) ? roleRaw : "reporter";
    const bureau = String(formData.get("bureau") ?? "").trim() || null;
    const domain = await tenantEmailDomain(tenantId);

    if (!email || !name || pw.length < 8)
      redirect(`/${locale}/register?error=fields` as Route);
    if (domain && !email.endsWith(`@${domain}`))
      redirect(`/${locale}/register?error=domain` as Route);
    if (await accountIdByEmail(tenantId, email))
      redirect(`/${locale}/register?error=exists` as Route);

    await createPendingAccount({
      tenantId,
      email,
      displayName: name,
      password: pw,
      role,
      bureau,
    });
    redirect(`/${locale}/pending` as Route);
  }

  const field = "w-full border px-3 py-2 text-base mb-3";
  const fieldStyle = {
    borderColor: "var(--color-rule)",
    background: "var(--color-bg)",
  };
  const messages: Record<string, string> = {
    fields: "Fill every field; password ≥ 8 characters.",
    domain: `Use your newsroom email${domain ? ` (@${domain})` : ""}.`,
    exists: "An account with that email already exists — sign in instead.",
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="ds-frame max-w-md w-full p-8" style={{ fontFamily: "var(--font-ui)" }}>
        <p className="ds-label mb-2">OnlineJourno</p>
        <h1
          className="ds-lead mb-1"
          style={{ fontSize: "2rem" }}
        >
          Request access
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-fg-secondary)" }}
        >
          Register with your newsroom email
          {domain ? ` (@${domain})` : ""}. An editor approves new accounts
          before first sign-in.
        </p>

        {error ? (
          <p
            className="text-sm mb-3 px-3 py-2"
            style={{ background: "var(--color-urgent-bg)", color: "var(--color-urgent)" }}
          >
            {messages[error] ?? "Please check the form."}
          </p>
        ) : null}

        <form action={register}>
          <input name="name" required placeholder="Full name" className={field} style={fieldStyle} />
          <input
            name="email"
            type="email"
            required
            placeholder={domain ? `you@${domain}` : "you@newsroom.com"}
            className={field}
            style={fieldStyle}
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (≥ 8 chars)"
            className={field}
            style={fieldStyle}
          />
          <div className="flex gap-3 mb-3">
            <select name="role" className="flex-1 border px-3 py-2" style={fieldStyle}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input name="bureau" placeholder="Bureau / desk (optional)" className="flex-1 border px-3 py-2" style={fieldStyle} />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-base font-semibold"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            Request access
          </button>
        </form>

        <p className="text-sm mt-6" style={{ color: "var(--color-fg-secondary)" }}>
          Already approved?{" "}
          <a className="underline" href={`/${locale}/login`}>
            Sign in
          </a>
          .
        </p>
      </div>
    </main>
  );
}
