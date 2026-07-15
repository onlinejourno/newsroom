import { listConnectors } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import { deleteConnectorAction, toggleConnectorAction } from "./actions";
import ConnectorForm from "./ConnectorForm";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

export const dynamic = "force-dynamic";

export default async function ConnectorsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await currentTenantId();
  const connectors = tenantId ? await listConnectors(tenantId) : [];

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Admin</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Connectors
        </h1>
        <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
          {connectors.length} connector{connectors.length === 1 ? "" : "s"} ·
          bring your own data tools (analytics, keywords, search console, trends,
          subscription, social) via API or MCP — or use the open-source fallbacks.
          Secrets are stored as an env reference, never the raw key.
        </p>
      </header>

      <section className="ds-frame mb-10 overflow-x-auto">
        <ResponsiveTable><table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-fg-tertiary)" }}>
              {["Category", "Provider", "Mode", "Secret", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {connectors.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  No connectors yet. Add one below.
                </td>
              </tr>
            )}
            {connectors.map((c) => (
              <tr
                key={c.id}
                className="border-t"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <td className="px-3 py-2 font-medium">{c.category}</td>
                <td className="px-3 py-2" style={{ color: "var(--color-fg-secondary)" }}>
                  {c.provider}
                </td>
                <td className="px-3 py-2">
                  <code className="text-xs">{c.mode}</code>
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "var(--color-fg-secondary)" }}>
                  {c.auth?.secret_ref ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: c.enabled
                        ? "var(--color-ioj-green-600)"
                        : "var(--color-fg-tertiary)",
                    }}
                  >
                    {c.enabled ? "enabled" : "disabled"}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <form action={toggleConnectorAction} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="enabled" value={(!c.enabled).toString()} />
                    <button
                      type="submit"
                      className="text-xs underline mr-3"
                      style={{ color: "var(--color-link)" }}
                    >
                      {c.enabled ? "disable" : "enable"}
                    </button>
                  </form>
                  <form action={deleteConnectorAction} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="text-xs underline"
                      style={{ color: "var(--color-brand)" }}
                    >
                      delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table></ResponsiveTable>
      </section>

      <section className="ds-frame p-5">
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Add a connector
        </h2>
        <ConnectorForm locale={locale} />
      </section>
    </main>
  );
}
