"use server";

import { revalidatePath } from "next/cache";
import {
  createSurface,
  deleteSurface,
  setSurfaceEnabled,
  tenantIdForSlug,
} from "@/lib/db";

const TENANT_SLUG = "self";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function addSurfaceAction(formData: FormData): Promise<void> {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return;
  const name = str(formData, "name");
  if (!name) return;

  const signalsRaw = str(formData, "signals");
  let signals: Record<string, unknown> | null = null;
  if (signalsRaw) {
    try {
      signals = JSON.parse(signalsRaw);
    } catch {
      signals = { notes: signalsRaw };
    }
  }

  await createSurface(tenantId, {
    key: slugify(name),
    name,
    category: str(formData, "category") || "custom",
    signals,
  });
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/surfaces`);
}

export async function toggleSurfaceAction(formData: FormData): Promise<void> {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return;
  await setSurfaceEnabled(
    tenantId,
    str(formData, "id"),
    str(formData, "enabled") === "true",
  );
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/surfaces`);
}

export async function deleteSurfaceAction(formData: FormData): Promise<void> {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return;
  await deleteSurface(tenantId, str(formData, "id"));
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/surfaces`);
}
