import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAccount, listAccounts, setAccountStatus } from "@/lib/auth";
import { tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

const STATUS_COLOR: Record<string, string> = {
  pending: "#d97706",
  approved: "#16a34a",
  rejected: "#dc2626",
  suspended: "#6b7280",
  invited: "#2563eb",
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getAccount();
  if (!me || me.role !== "admin") {
    // Defence in depth: the gate lets any signed-in user through; the admin
    // tab itself enforces the tier (ADR 0055 §7).
    redirect(`/${locale}/signals` as Route);
  }
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const accounts = tenantId ? await listAccounts(tenantId) : [];
  const pending = accounts.filter((a) => a.status === "pending").length;

  async function setStatus(formData: FormData) {
    "use server";
    const me = await getAccount();
    if (!me || me.role !== "admin") return;
    const tenantId = await tenantIdForSlug(TENANT_SLUG);
    if (!tenantId) return;
    await setAccountStatus(
      tenantId,
      String(formData.get("id")),
      String(formData.get("status")),
    );
    redirect(`/${locale}/admin/users` as Route);
  }

  const btn = (label: string, status: string, id: string, color: string) => (
    <form action={setStatus} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="text-xs px-2 py-1 rounded-sm border font-semibold mr-1"
        style={{ borderColor: color, color }}
      >
        {label}
      </button>
    </form>
  );

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Admin · Accounts</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Accounts &amp; approvals
        </h1>
        <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
          {accounts.length} accounts ·{" "}
          {pending > 0 ? (
            <strong style={{ color: "#d97706" }}>{pending} awaiting approval</strong>
          ) : (
            "none awaiting approval"
          )}
          . Approve self-registrations; suspend or restore access.
        </p>
      </header>

      <table className="w-full text-sm" style={{ fontFamily: "var(--font-ui)" }}>
        <thead>
          <tr
            className="text-xs uppercase tracking-wide text-left"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            <th className="py-2 pr-3">Name / email</th>
            <th className="py-2 pr-3">Role</th>
            <th className="py-2 pr-3">Bureau</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr
              key={a.id}
              className="border-t align-top"
              style={{ borderColor: "var(--color-border)" }}
            >
              <td className="py-2 pr-3">
                <div className="font-semibold">{a.display_name}</div>
                <div className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                  {a.email}
                </div>
              </td>
              <td className="py-2 pr-3">{a.role}</td>
              <td className="py-2 pr-3">{a.bureau ?? "—"}</td>
              <td className="py-2 pr-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-sm font-bold"
                  style={{
                    background: `${STATUS_COLOR[a.status] ?? "#6b7280"}22`,
                    color: STATUS_COLOR[a.status] ?? "#6b7280",
                  }}
                >
                  {a.status}
                </span>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">
                {a.status === "pending" || a.status === "rejected"
                  ? btn("Approve", "approved", a.id, "#16a34a")
                  : null}
                {a.status === "pending"
                  ? btn("Reject", "rejected", a.id, "#dc2626")
                  : null}
                {a.status === "approved"
                  ? btn("Suspend", "suspended", a.id, "#6b7280")
                  : null}
                {a.status === "suspended"
                  ? btn("Restore", "approved", a.id, "#16a34a")
                  : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
