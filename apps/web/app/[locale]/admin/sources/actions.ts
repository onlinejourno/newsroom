"use server";

import { revalidatePath } from "next/cache";
import {
  createSource,
  deleteSource,
  setSourceEnabled,
  tenantIdForSlug,
  type SourceInput,
} from "@/lib/db";

// Single-tenant in dev; per-tenant resolution lands with auth later.
const TENANT_SLUG = "self";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function addSourceAction(formData: FormData): Promise<void> {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return;

  // Per-ingest_type params arrive as param_<name>; collapse to one object.
  const params: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("param_") && typeof v === "string" && v.trim()) {
      params[k.slice("param_".length)] = v.trim();
    }
  }

  const authMethod = str(formData, "auth_method");
  const secretRef = str(formData, "auth_secret_ref");
  const sections = str(formData, "sections_fed")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tierRaw = str(formData, "tier");

  const input: SourceInput = {
    name: str(formData, "name"),
    kind: str(formData, "kind") || "rss",
    family: str(formData, "family") || null,
    tier: tierRaw ? Number(tierRaw) : null,
    sections_fed: sections,
    url: str(formData, "url"),
    rss_url: str(formData, "rss_url") || null,
    geo: str(formData, "geo") || null,
    frequency: str(formData, "frequency") || null,
    auth:
      authMethod && authMethod !== "none"
        ? { method: authMethod, secret_ref: secretRef }
        : null,
    params: Object.keys(params).length ? params : null,
  };

  if (!input.name || !input.url) return;
  await createSource(tenantId, input);
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/sources`);
}

export async function toggleSourceAction(formData: FormData): Promise<void> {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return;
  await setSourceEnabled(
    tenantId,
    str(formData, "id"),
    str(formData, "enabled") === "true",
  );
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/sources`);
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return;
  await deleteSource(tenantId, str(formData, "id"));
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/sources`);
}
