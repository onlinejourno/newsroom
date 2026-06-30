"use server";

import { revalidatePath } from "next/cache";
import {
  deleteConnector,
  setConnectorEnabled,
  upsertConnector,
  type ConnectorInput,
} from "@/lib/db";
import { assertAdmin, getAccount } from "@/lib/auth";
import { currentTenantId } from "@/lib/tenant";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function addConnectorAction(formData: FormData): Promise<void> {
  const me = await getAccount();
  assertAdmin(me);
  const tenantId = await currentTenantId();
  if (!tenantId) return;

  const config: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("config_") && typeof v === "string" && v.trim()) {
      config[k.slice("config_".length)] = v.trim();
    }
  }
  const secretRef = str(formData, "auth_secret_ref");

  const input: ConnectorInput = {
    category: str(formData, "category"),
    provider: str(formData, "provider"),
    mode: str(formData, "mode") || "api",
    config: Object.keys(config).length ? config : null,
    auth: secretRef ? { method: "secret_ref", secret_ref: secretRef } : null,
  };
  if (!input.category || !input.provider) return;
  await upsertConnector(tenantId, input);
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/connectors`);
}

export async function toggleConnectorAction(formData: FormData): Promise<void> {
  const me = await getAccount();
  assertAdmin(me);
  const tenantId = await currentTenantId();
  if (!tenantId) return;
  await setConnectorEnabled(
    tenantId,
    str(formData, "id"),
    str(formData, "enabled") === "true",
  );
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/connectors`);
}

export async function deleteConnectorAction(formData: FormData): Promise<void> {
  const me = await getAccount();
  assertAdmin(me);
  const tenantId = await currentTenantId();
  if (!tenantId) return;
  await deleteConnector(tenantId, str(formData, "id"));
  revalidatePath(`/${str(formData, "locale") || "en"}/admin/connectors`);
}
