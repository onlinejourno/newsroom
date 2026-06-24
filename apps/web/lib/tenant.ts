// Single source of tenant resolution for surfaces (ADR 0005 multi-tenant).
// Precedence: OJ_TENANT_SLUG override → signed-in user's tenant → install default.
import { getAccount } from "@/lib/auth";
import { defaultTenantId, tenantIdForSlug } from "@/lib/db";

export async function currentTenantId(): Promise<string | null> {
  const slug = process.env.OJ_TENANT_SLUG;
  if (slug) return tenantIdForSlug(slug);
  const account = await getAccount();
  if (account?.tenant_id) return account.tenant_id;
  return defaultTenantId();
}
