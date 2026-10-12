"use server";

import { getTranslations } from "next-intl/server";
import { ActionError, runAction, touch } from "@/lib/action";
import { createId } from "@/lib/demo/store";
import { siteUrl, supabaseEnabled } from "@/lib/env";
import { canAdmin, canEditOwned, canManage, canWrite } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Store } from "@/types/crm";
import type { Session } from "@/lib/session";

function audit(store: Store, session: Session, entity: string, entityId: string, action: string, diff: Store["audit_logs"][number]["diff"] = {}) {
  store.audit_logs.unshift({
    id: createId(),
    organization_id: session.organizationId,
    entity,
    entity_id: entityId,
    action,
    diff,
    user_id: session.userId,
    created_at: new Date().toISOString(),
  });
  store.audit_logs = store.audit_logs.slice(0, 200);
}

async function sendInviteEmail(input: { email: string; fullName: string; invitationId: string; invitedBy: string; organization: string; role: string }) {
  if (!supabaseEnabled) return;
  const admin = createAdminClient();
  await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/id/accept-invite`,
    data: {
      full_name: input.fullName,
      invitation_id: input.invitationId,
      invited_by: input.invitedBy,
      organization: input.organization,
      role: input.role,
    },
  });
}

export async function resendInvitationAction(id: string) {
  const t = await getTranslations("common");
  const result = await runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    const invitation = store.invitations.find((item) => item.id === id && item.organization_id === session.organizationId);
    if (!invitation || invitation.accepted_at || invitation.cancelled_at) throw new ActionError(t("error"));
    invitation.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      email: invitation.email,
      fullName: invitation.full_name ?? "",
      invitationId: invitation.id,
      invitedBy: session.profile.full_name,
      organization: session.organization.name,
      role: invitation.role,
    };
  });
  if (!result.ok) return result;
  try {
    await sendInviteEmail(result.data);
  } catch (error) {
    console.error(error);
    return { ok: false as const, error: t("error") };
  }
  return { ok: true as const, data: null };
}

export async function cancelInvitationAction(id: string) {
  const t = await getTranslations("common");
  const result = await runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    const invitation = store.invitations.find((item) => item.id === id && item.organization_id === session.organizationId);
    if (!invitation || invitation.accepted_at || invitation.cancelled_at) throw new ActionError(t("error"));
    invitation.cancelled_at = new Date().toISOString();
    const profile = store.profiles.find((item) => item.email.toLowerCase() === invitation.email.toLowerCase());
    const active = profile ? store.memberships.some((item) => item.user_id === profile.id && !item.disabled_at) : false;
    return { email: invitation.email, deleteAuth: !active };
  });
  if (!result.ok) return result;
  if (result.data.deleteAuth && supabaseEnabled) {
    try {
      const admin = createAdminClient();
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const user = listed.data.users.find((item) => item.email?.toLowerCase() === result.data.email.toLowerCase());
      if (user && !user.last_sign_in_at) await admin.auth.admin.deleteUser(user.id);
    } catch (error) {
      console.error(error);
    }
  }
  return { ok: true as const, data: null };
}

export async function setMemberActiveAction(userId: string, active: boolean) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    if (userId === session.userId) throw new ActionError(t("forbidden"));
    const membership = store.memberships.find((item) => item.user_id === userId && item.organization_id === session.organizationId);
    if (!membership) throw new ActionError(t("error"));
    if (membership.role === "owner" && session.role !== "owner") throw new ActionError(t("forbidden"));
    membership.disabled_at = active ? null : new Date().toISOString();
    touch(membership);
    return null;
  });
}

export async function reassignDealsAction(input: { dealIds: string[]; ownerId: string }) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const owner = store.memberships.find((item) => item.user_id === input.ownerId && item.organization_id === session.organizationId && !item.disabled_at);
    if (!owner) throw new ActionError(t("error"));
    let count = 0;
    for (const dealId of input.dealIds) {
      const deal = store.deals.find((item) => item.id === dealId && item.organization_id === session.organizationId);
      if (!deal || deal.owner_id === input.ownerId) continue;
      const previous = deal.owner_id;
      deal.owner_id = input.ownerId;
      touch(deal);
      audit(store, session, "deal", deal.id, "reassign", { from: previous, to: input.ownerId });
      count += 1;
    }
    if (count > 0) {
      store.notifications.unshift({
        id: createId(),
        organization_id: session.organizationId,
        user_id: input.ownerId,
        type: "deal_assigned",
        payload: { title: String(count), href: "/deals" },
        read_at: null,
        created_at: new Date().toISOString(),
      });
    }
    return count;
  });
}

export async function setOwnerAction(input: { kind: "contact" | "company"; id: string; ownerId: string }) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const row = input.kind === "contact"
      ? store.contacts.find((item) => item.id === input.id && item.organization_id === session.organizationId)
      : store.companies.find((item) => item.id === input.id && item.organization_id === session.organizationId);
    if (!row) throw new ActionError(t("error"));
    row.owner_id = input.ownerId;
    touch(row);
    audit(store, session, input.kind, row.id, "reassign", { to: input.ownerId });
    store.notifications.unshift({
      id: createId(),
      organization_id: session.organizationId,
      user_id: input.ownerId,
      type: "deal_assigned",
      payload: { title: input.kind === "contact" ? "contact" : "company", href: `/${input.kind === "contact" ? "contacts" : "companies"}/${row.id}` },
      read_at: null,
      created_at: new Date().toISOString(),
    });
    return null;
  });
}

export async function saveCustomFieldAction(input: { id?: string | null; entity: "deal" | "contact" | "company"; label: string; fieldType: "text" | "number" | "date" | "select"; options?: string | null }) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    const label = input.label.trim();
    if (!label) throw new ActionError(t("required"));
    const existing = input.id ? store.custom_fields.find((item) => item.id === input.id && item.organization_id === session.organizationId) : undefined;
    if (existing) {
      existing.label = label;
      existing.entity = input.entity;
      existing.field_type = input.fieldType;
      existing.options = input.options?.trim() || null;
      touch(existing);
      return existing.id;
    }
    const id = createId();
    const now = new Date().toISOString();
    store.custom_fields.push({
      id,
      organization_id: session.organizationId,
      entity: input.entity,
      label,
      field_type: input.fieldType,
      options: input.options?.trim() || null,
      created_at: now,
      updated_at: now,
      created_by: session.userId,
    });
    return id;
  });
}

export async function deleteCustomFieldAction(id: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    store.custom_fields = store.custom_fields.filter((item) => !(item.id === id && item.organization_id === session.organizationId));
    store.custom_field_values = store.custom_field_values.filter((item) => item.field_id !== id);
    return null;
  });
}

export async function saveCustomValueAction(input: { fieldId: string; entityId: string; value: string }) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const field = store.custom_fields.find((item) => item.id === input.fieldId && item.organization_id === session.organizationId);
    if (!field) throw new ActionError(t("error"));
    const existing = store.custom_field_values.find((item) => item.field_id === input.fieldId && item.entity_id === input.entityId);
    if (existing) {
      existing.value = input.value;
      return existing.id;
    }
    const id = createId();
    store.custom_field_values.push({
      id,
      organization_id: session.organizationId,
      field_id: input.fieldId,
      entity_id: input.entityId,
      value: input.value,
      created_at: new Date().toISOString(),
    });
    return id;
  });
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export async function signAttachmentUploadAction(input: { fileName: string; dealId?: string | null; contactId?: string | null; companyId?: string | null }) {
  const t = await getTranslations("common");
  const result = await runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    if (input.dealId) {
      const deal = store.deals.find((item) => item.id === input.dealId && item.organization_id === session.organizationId);
      if (!deal || !canEditOwned(session.role, session.userId, deal.owner_id)) throw new ActionError(t("forbidden"));
    }
    const id = createId();
    const path = `${session.organizationId}/${id}/${safeName(input.fileName)}`;
    return { id, path };
  });
  if (!result.ok) return result;
  if (!supabaseEnabled) return { ok: true as const, data: { ...result.data, token: null as string | null } };
  try {
    const admin = createAdminClient();
    const signed = await admin.storage.from("attachments").createSignedUploadUrl(result.data.path);
    if (signed.error || !signed.data) return { ok: false as const, error: t("error") };
    return { ok: true as const, data: { ...result.data, token: signed.data.token } };
  } catch (error) {
    console.error(error);
    return { ok: false as const, error: t("error") };
  }
}

export async function addAttachmentAction(input: { id: string; path: string; fileName: string; size: number; mime: string; dealId?: string | null; contactId?: string | null; companyId?: string | null }) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    if (!input.path.startsWith(`${session.organizationId}/`)) throw new ActionError(t("forbidden"));
    store.attachments.unshift({
      id: input.id,
      organization_id: session.organizationId,
      storage_path: input.path,
      file_name: input.fileName,
      size: input.size,
      mime: input.mime,
      deal_id: input.dealId ?? null,
      contact_id: input.contactId ?? null,
      company_id: input.companyId ?? null,
      created_at: new Date().toISOString(),
      created_by: session.userId,
    });
    return input.id;
  });
}

export async function deleteAttachmentAction(id: string) {
  const t = await getTranslations("common");
  const result = await runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const file = store.attachments.find((item) => item.id === id && item.organization_id === session.organizationId);
    if (!file) throw new ActionError(t("error"));
    store.attachments = store.attachments.filter((item) => item.id !== id);
    return file.storage_path;
  });
  if (!result.ok || !supabaseEnabled) return result.ok ? { ok: true as const, data: null } : result;
  try {
    const admin = createAdminClient();
    await admin.storage.from("attachments").remove([result.data]);
  } catch (error) {
    console.error(error);
  }
  return { ok: true as const, data: null };
}

export async function attachmentUrlAction(id: string) {
  const t = await getTranslations("common");
  const result = await runAction(({ session, store }) => {
    const file = store.attachments.find((item) => item.id === id && item.organization_id === session.organizationId);
    if (!file) throw new ActionError(t("error"));
    return file.storage_path;
  });
  if (!result.ok) return result;
  if (!supabaseEnabled) return { ok: false as const, error: t("error") };
  try {
    const admin = createAdminClient();
    const signed = await admin.storage.from("attachments").createSignedUrl(result.data, 60);
    if (signed.error || !signed.data) return { ok: false as const, error: t("error") };
    return { ok: true as const, data: signed.data.signedUrl };
  } catch (error) {
    console.error(error);
    return { ok: false as const, error: t("error") };
  }
}
