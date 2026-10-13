"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ActionError, runAction, touch } from "@/lib/action";
import { isClientType, setParty, slotPrimaryCompany, type ClientType } from "@/lib/client-type";
import { companyNamesSimilar, phonesMatch } from "@/lib/duplicates";
import { cookieOptions, ORG_COOKIE } from "@/lib/constants";
import { rememberLocale } from "@/lib/session-flags";
import { subtotal } from "@/lib/domain";
import { addMembership, duplicatePipeline } from "@/lib/demo/onboarding";
import { resetStore, createId } from "@/lib/demo/store";
import { siteUrl, supabaseEnabled } from "@/lib/env";
import { createAdminClient, createStatelessClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canAdmin, canEditOwned, canManage, canWrite } from "@/lib/permissions";
import { getSession, getUserId } from "@/lib/session";
import type { Deal, DealStatus, Stage, Store } from "@/types/crm";
import type { Session } from "@/lib/session";
import {
  activitySchema,
  companySchema,
  contactSchema,
  dealPatchSchema,
  dealContactRoleSchema,
  dealSchema,
  importContactSchema,
  inviteSchema,
  lineSchema,
  moveDealSchema,
  noteSchema,
  organizationSchema,
  passwordSchema,
  pipelineSchema,
  productSchema,
  profileSchema,
  quickDealSchema,
  reasonSchema,
  salesTargetSchema,
  savedViewSchema,
  stageSchema,
  tagSchema,
} from "@/lib/validations";

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
  // Demo mode keeps a short window in its JSON file; in Supabase the log is append-only.
  if (!supabaseEnabled) store.audit_logs = store.audit_logs.slice(0, 200);
}

function assertDeal(store: Store, session: Session, dealId: string) {
  const deal = store.deals.find((item) => item.id === dealId && item.organization_id === session.organizationId);
  if (!deal) throw new ActionError("Deal tidak ditemukan.");
  if (!canEditOwned(session.role, session.userId, deal.owner_id)) throw new ActionError("forbidden");
  return deal;
}

function applyStage(deal: Deal, stage: Stage, lostReasonId: string | null) {
  const previous = deal.stage_id;
  deal.stage_id = stage.id;
  deal.pipeline_id = stage.pipeline_id;
  if (stage.type === "won") {
    deal.status = "won";
    deal.won_at = deal.won_at ?? new Date().toISOString();
    deal.lost_at = null;
    deal.lost_reason_id = null;
  } else if (stage.type === "lost") {
    deal.status = "lost";
    deal.lost_at = deal.lost_at ?? new Date().toISOString();
    deal.won_at = null;
    deal.lost_reason_id = lostReasonId;
  } else {
    deal.status = "open";
    deal.won_at = null;
    deal.lost_at = null;
    deal.lost_reason_id = null;
  }
  touch(deal);
  return previous;
}

function placeDeal(store: Store, deal: Deal, stageId: string) {
  const siblings = store.deals
    .filter((item) => item.stage_id === stageId && item.id !== deal.id)
    .sort((a, b) => a.position - b.position);
  siblings.forEach((item, index) => {
    item.position = index + 1;
  });
  deal.position = 0;
  deal.stage_id = stageId;
}

export async function switchOrgAction(organizationId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthorized" };
  if (!session.memberships.some((item) => item.organization_id === organizationId)) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const jar = await cookies();
  jar.set(ORG_COOKIE, organizationId, cookieOptions);
  revalidatePath("/", "layout");
  return { ok: true as const, data: null };
}

export async function moveDealAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const parsed = moveDealSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const deal = assertDeal(store, session, parsed.data.dealId);
    const stage = store.stages.find((item) => item.id === parsed.data.toStageId && item.pipeline_id === parsed.data.pipelineId);
    if (!stage) throw new ActionError(t("error"));
    if (stage.type === "lost" && !parsed.data.lostReasonId) throw new ActionError(t("required"));

    const known = new Set(store.deals.filter((item) => item.pipeline_id === parsed.data.pipelineId).map((item) => item.id));
    const incoming = parsed.data.columns.flatMap((column) => column.dealIds);
    if (incoming.length !== known.size || incoming.some((item) => !known.has(item))) {
      throw new ActionError(t("error"));
    }

    const previous = deal.stage_id;
    for (const column of parsed.data.columns) {
      column.dealIds.forEach((dealId, index) => {
        const row = store.deals.find((item) => item.id === dealId);
        if (!row) return;
        row.stage_id = column.stageId;
        row.position = index;
        if (dealId === deal.id) applyStage(row, stage, parsed.data.lostReasonId);
        touch(row);
      });
    }
    if (previous !== deal.stage_id) {
      store.stage_history.push({
        id: createId(),
        deal_id: deal.id,
        from_stage_id: previous,
        to_stage_id: deal.stage_id,
        changed_by: session.userId,
        changed_at: new Date().toISOString(),
      });
      audit(store, session, "deal", deal.id, "move", { to: stage.name });
    }
    return null;
  }, ["deals", "stages"]);
}

export async function saveDealAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = dealSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("invalid") === "invalid" ? t("error") : t("error"));
    const stage = store.stages.find((item) => item.id === parsed.data.stageId && item.organization_id === session.organizationId);
    if (!stage) throw new ActionError(t("error"));
    const ownerId = canManage(session.role) ? parsed.data.ownerId : session.userId;

    if (parsed.data.id) {
      const deal = assertDeal(store, session, parsed.data.id);
      const previousStage = deal.stage_id;
      deal.title = parsed.data.title;
      deal.value = parsed.data.value;
      const picked = parsed.data.companyId
        ? store.companies.find((item) => item.id === parsed.data.companyId && item.organization_id === session.organizationId)
        : null;
      if (parsed.data.companyId && !picked) throw new ActionError(t("error"));
      slotPrimaryCompany(deal, picked ?? null);
      deal.primary_contact_id = parsed.data.contactId;
      deal.owner_id = ownerId;
      deal.priority = parsed.data.priority;
      deal.expected_close_date = parsed.data.expectedCloseDate;
      deal.probability_override = parsed.data.probabilityOverride;
      if (previousStage !== stage.id) {
        applyStage(deal, stage, null);
        store.stage_history.push({
          id: createId(),
          deal_id: deal.id,
          from_stage_id: previousStage,
          to_stage_id: stage.id,
          changed_by: session.userId,
          changed_at: new Date().toISOString(),
        });
      }
      touch(deal);
      store.deal_tags = store.deal_tags.filter((item) => item.deal_id !== deal.id);
      parsed.data.tagIds.forEach((tagId) => store.deal_tags.push({ deal_id: deal.id, tag_id: tagId }));
      audit(store, session, "deal", deal.id, "update", { title: deal.title });
      return deal.id;
    }

    const dealId = createId();
    const timestamp = new Date().toISOString();
    const deal: Deal = {
      id: dealId,
      organization_id: session.organizationId,
      title: parsed.data.title,
      pipeline_id: stage.pipeline_id,
      stage_id: stage.id,
      value: parsed.data.value,
      currency: "IDR",
      probability_override: parsed.data.probabilityOverride,
      expected_close_date: parsed.data.expectedCloseDate,
      priority: parsed.data.priority,
      company_id: null,
      owner_company_id: null,
      consultant_company_id: null,
      contractor_company_id: null,
      primary_contact_id: parsed.data.contactId,
      owner_id: ownerId,
      status: stage.type === "open" ? "open" : (stage.type as DealStatus),
      lost_reason_id: null,
      won_at: stage.type === "won" ? timestamp : null,
      lost_at: stage.type === "lost" ? timestamp : null,
      position: 0,
      last_activity_at: null,
      description: parsed.data.description ?? null,
      project_city: null,
      project_province: null,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    };
    const picked = parsed.data.companyId
      ? store.companies.find((item) => item.id === parsed.data.companyId && item.organization_id === session.organizationId)
      : null;
    if (parsed.data.companyId && !picked) throw new ActionError(t("error"));
    slotPrimaryCompany(deal, picked ?? null);
    placeDeal(store, deal, stage.id);
    store.deals.push(deal);
    parsed.data.tagIds.forEach((tagId) => store.deal_tags.push({ deal_id: dealId, tag_id: tagId }));
    if (parsed.data.contactId) {
      store.deal_contacts.push({ id: createId(), deal_id: dealId, contact_id: parsed.data.contactId, role: null });
    }
    if (ownerId !== session.userId) {
      store.notifications.unshift({
        id: createId(),
        organization_id: session.organizationId,
        user_id: ownerId,
        type: "deal_assigned",
        payload: { title: deal.title, href: `/deals/${dealId}` },
        read_at: null,
        created_at: timestamp,
      });
    }
    audit(store, session, "deal", dealId, "create", { title: deal.title });
    return dealId;
  }, ["deals", "stages", "companies", "deal_tags", "deal_contacts"]);
}

export async function quickDealAction(input: unknown) {
  const parsed = quickDealSchema.safeParse(input);
  if (!parsed.success) return saveDealAction(input);
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Unauthorized" };
  return saveDealAction({
    id: null,
    title: parsed.data.title,
    pipelineId: parsed.data.pipelineId,
    stageId: parsed.data.stageId,
    value: parsed.data.value,
    companyId: parsed.data.companyId,
    contactId: null,
    ownerId: session.userId,
    priority: 0,
    expectedCloseDate: null,
    tagIds: [],
    probabilityOverride: null,
  });
}

/** Inline edit from the deal page. Each changed field is written to the audit log for the timeline. */
export async function updateDealAction(dealId: string, input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const parsed = dealPatchSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const deal = assertDeal(store, session, dealId);
    const patch = parsed.data;
    const orgId = session.organizationId;
    const changes: { field: string; from: string | null; to: string | null }[] = [];
    const track = (field: string, from: string | null, to: string | null) => {
      if (from !== to) changes.push({ field, from, to });
    };
    const companyName = (id: string | null) => (id ? store.companies.find((item) => item.id === id)?.name ?? null : null);
    const contactLabel = (id: string | null) => {
      const contact = id ? store.contacts.find((item) => item.id === id) : undefined;
      return contact ? `${contact.first_name} ${contact.last_name}`.trim() : null;
    };
    const personLabel = (id: string | null) => (id ? store.profiles.find((item) => item.id === id)?.full_name ?? null : null);

    if (patch.title !== undefined) {
      track("title", deal.title, patch.title);
      deal.title = patch.title;
    }
    if (patch.value !== undefined) {
      track("value", String(deal.value), String(patch.value));
      deal.value = patch.value;
    }
    if (patch.probabilityOverride !== undefined) {
      const label = (value: number | null) => (value === null ? null : String(value));
      track("probability", label(deal.probability_override), label(patch.probabilityOverride));
      deal.probability_override = patch.probabilityOverride;
    }
    if (patch.expectedCloseDate !== undefined) {
      track("expectedClose", deal.expected_close_date?.slice(0, 10) ?? null, patch.expectedCloseDate?.slice(0, 10) ?? null);
      deal.expected_close_date = patch.expectedCloseDate;
    }
    if (patch.priority !== undefined) {
      track("priority", String(deal.priority), String(patch.priority));
      deal.priority = patch.priority;
    }
    if (patch.companyId !== undefined) {
      const picked = patch.companyId
        ? store.companies.find((item) => item.id === patch.companyId && item.organization_id === orgId)
        : null;
      if (patch.companyId && !picked) throw new ActionError(t("error"));
      track("company", companyName(deal.company_id), companyName(patch.companyId));
      slotPrimaryCompany(deal, picked ?? null);
    }
    const applyParty = (type: ClientType, companyId: string | null | undefined) => {
      if (companyId === undefined) return;
      if (companyId) {
        const company = store.companies.find((item) => item.id === companyId && item.organization_id === orgId);
        if (!company || company.client_type !== type) throw new ActionError(t("error"));
      }
      const current = type === "owner" ? deal.owner_company_id : type === "konsultan" ? deal.consultant_company_id : deal.contractor_company_id;
      track(type, companyName(current), companyName(companyId));
      setParty(deal, type, companyId);
    };
    applyParty("owner", patch.ownerCompanyId);
    applyParty("konsultan", patch.consultantCompanyId);
    applyParty("kontraktor", patch.contractorCompanyId);
    if (patch.projectCity !== undefined) {
      track("projectCity", deal.project_city, patch.projectCity);
      deal.project_city = patch.projectCity;
    }
    if (patch.projectProvince !== undefined) {
      track("projectProvince", deal.project_province, patch.projectProvince);
      deal.project_province = patch.projectProvince;
    }
    if (patch.contactId !== undefined) {
      if (patch.contactId && !store.contacts.some((item) => item.id === patch.contactId && item.organization_id === orgId)) {
        throw new ActionError(t("error"));
      }
      track("contact", contactLabel(deal.primary_contact_id), contactLabel(patch.contactId));
      deal.primary_contact_id = patch.contactId;
      if (patch.contactId && !store.deal_contacts.some((item) => item.deal_id === deal.id && item.contact_id === patch.contactId)) {
        store.deal_contacts.push({ id: createId(), deal_id: deal.id, contact_id: patch.contactId, role: null });
      }
    }
    if (patch.ownerId !== undefined && patch.ownerId !== deal.owner_id) {
      if (!canManage(session.role)) throw new ActionError(t("forbidden"));
      if (!store.memberships.some((item) => item.user_id === patch.ownerId && item.organization_id === orgId)) {
        throw new ActionError(t("error"));
      }
      track("owner", personLabel(deal.owner_id), personLabel(patch.ownerId));
      deal.owner_id = patch.ownerId;
      if (patch.ownerId !== session.userId) {
        store.notifications.unshift({
          id: createId(),
          organization_id: orgId,
          user_id: patch.ownerId,
          type: "deal_assigned",
          payload: { title: deal.title, href: `/deals/${deal.id}` },
          read_at: null,
          created_at: new Date().toISOString(),
        });
      }
    }
    if (patch.tagIds !== undefined) {
      const valid = patch.tagIds.filter((tagId) => store.tags.some((tag) => tag.id === tagId && tag.organization_id === orgId));
      const names = (ids: string[]) =>
        ids.map((id) => store.tags.find((tag) => tag.id === id)?.name).filter(Boolean).sort().join(", ") || null;
      const current = store.deal_tags.filter((item) => item.deal_id === deal.id).map((item) => item.tag_id);
      track("tags", names(current), names(valid));
      store.deal_tags = store.deal_tags.filter((item) => item.deal_id !== deal.id);
      valid.forEach((tagId) => store.deal_tags.push({ deal_id: deal.id, tag_id: tagId }));
    }
    if (patch.description !== undefined) {
      if ((deal.description ?? "") !== (patch.description ?? "")) track("description", null, null);
      deal.description = patch.description || null;
    }
    if (patch.stageId !== undefined && patch.stageId !== deal.stage_id) {
      const stage = store.stages.find((item) => item.id === patch.stageId && item.pipeline_id === deal.pipeline_id);
      // Won and lost go through their own actions (lost needs a reason).
      if (!stage || stage.type !== "open") throw new ActionError(t("error"));
      const previous = deal.stage_id;
      applyStage(deal, stage, null);
      placeDeal(store, deal, stage.id);
      store.stage_history.push({
        id: createId(),
        deal_id: deal.id,
        from_stage_id: previous,
        to_stage_id: stage.id,
        changed_by: session.userId,
        changed_at: new Date().toISOString(),
      });
      audit(store, session, "deal", deal.id, "move", { to: stage.name });
    }

    touch(deal);
    changes.forEach((change) => audit(store, session, "deal", deal.id, "field", change));
    return null;
  }, ["deals", "stages", "companies", "contacts", "deal_tags", "deal_contacts", "tags"]);
}

export async function deleteDealAction(dealId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    assertDeal(store, session, dealId);
    store.deals = store.deals.filter((item) => item.id !== dealId);
    store.deal_tags = store.deal_tags.filter((item) => item.deal_id !== dealId);
    store.deal_contacts = store.deal_contacts.filter((item) => item.deal_id !== dealId);
    store.deal_products = store.deal_products.filter((item) => item.deal_id !== dealId);
    store.notes = store.notes.filter((item) => item.deal_id !== dealId);
    audit(store, session, "deal", dealId, "delete");
    return null;
  }, ["deals", "deal_tags", "deal_contacts", "deal_products", "notes"]).catch(() => ({ ok: false as const, error: t("error") }));
}

export async function markLostAction(dealId: string, lostReasonId: string) {
  return runAction(({ session, store }) => {
    const deal = assertDeal(store, session, dealId);
    const stage = store.stages.find((item) => item.pipeline_id === deal.pipeline_id && item.type === "lost");
    if (!stage) throw new ActionError("Lost stage missing");
    const previous = deal.stage_id;
    applyStage(deal, stage, lostReasonId);
    store.stage_history.push({
      id: createId(),
      deal_id: deal.id,
      from_stage_id: previous,
      to_stage_id: stage.id,
      changed_by: session.userId,
      changed_at: new Date().toISOString(),
    });
    audit(store, session, "deal", deal.id, "lost", { reason: lostReasonId });
    return null;
  }, ["deals", "stages"]);
}

export async function markWonAction(dealId: string) {
  return runAction(({ session, store }) => {
    const deal = assertDeal(store, session, dealId);
    const stage = store.stages.find((item) => item.pipeline_id === deal.pipeline_id && item.type === "won");
    if (!stage) throw new ActionError("Won stage missing");
    const previous = deal.stage_id;
    applyStage(deal, stage, null);
    store.stage_history.push({
      id: createId(),
      deal_id: deal.id,
      from_stage_id: previous,
      to_stage_id: stage.id,
      changed_by: session.userId,
      changed_at: new Date().toISOString(),
    });
    audit(store, session, "deal", deal.id, "won");
    return null;
  }, ["deals", "stages"]);
}

export async function restoreDealAction(dealId: string) {
  return runAction(({ session, store }) => {
    const deal = assertDeal(store, session, dealId);
    const stage = store.stages
      .filter((item) => item.pipeline_id === deal.pipeline_id && item.type === "open")
      .sort((a, b) => a.position - b.position)[0];
    if (!stage) throw new ActionError("Stage missing");
    const previous = deal.stage_id;
    applyStage(deal, stage, null);
    store.stage_history.push({
      id: createId(),
      deal_id: deal.id,
      from_stage_id: previous,
      to_stage_id: stage.id,
      changed_by: session.userId,
      changed_at: new Date().toISOString(),
    });
    return null;
  }, ["deals", "stages"]);
}

export async function saveContactAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    if (!parsed.data.force) {
      const email = parsed.data.email?.toLowerCase() ?? "";
      const match = store.contacts.find((item) => item.organization_id === session.organizationId && item.id !== parsed.data.id && (
        (email && item.email?.toLowerCase() === email) || phonesMatch(item.phone, parsed.data.phone) || phonesMatch(item.whatsapp, parsed.data.whatsapp)
      ));
      if (match) throw new ActionError(`${match.first_name} ${match.last_name}`.trim(), "duplicate");
    }
    const ownerId = canManage(session.role) ? parsed.data.ownerId : session.userId;
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const contact = store.contacts.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!contact || !canEditOwned(session.role, session.userId, contact.owner_id)) throw new ActionError(t("forbidden"));
      Object.assign(contact, {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        company_id: parsed.data.companyId,
        job_title: parsed.data.jobTitle,
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        source: parsed.data.source,
        owner_id: ownerId,
      });
      touch(contact);
      audit(store, session, "contact", contact.id, "update");
      return contact.id;
    }
    const contactId = createId();
    store.contacts.push({
      id: contactId,
      organization_id: session.organizationId,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      company_id: parsed.data.companyId,
      job_title: parsed.data.jobTitle,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
      address: null,
      owner_id: ownerId,
      source: parsed.data.source,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    audit(store, session, "contact", contactId, "create");
    return contactId;
  }, ["contacts", "companies"]);
}

export async function deleteContactAction(contactId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const contact = store.contacts.find((item) => item.id === contactId && item.organization_id === session.organizationId);
    if (!contact || !canEditOwned(session.role, session.userId, contact.owner_id)) throw new ActionError(t("forbidden"));
    store.contacts = store.contacts.filter((item) => item.id !== contactId);
    audit(store, session, "contact", contactId, "delete");
    return null;
  });
}

export async function importContactsAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = importContactSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    let created = 0;
    for (const row of parsed.data.rows) {
      const email = row.email.toLowerCase();
      if (email && store.contacts.some((item) => item.organization_id === session.organizationId && item.email?.toLowerCase() === email)) {
        continue;
      }
      let companyId: string | null = null;
      if (row.company.trim()) {
        const existing = store.companies.find(
          (item) => item.organization_id === session.organizationId && item.name.toLowerCase() === row.company.trim().toLowerCase(),
        );
        if (existing) companyId = existing.id;
        else {
          companyId = createId();
          const timestamp = new Date().toISOString();
          store.companies.push({
            id: companyId,
            organization_id: session.organizationId,
            name: row.company.trim(),
            client_type: "owner",
            npwp: null,
            address: null,
            city: null,
            province: null,
            phone: null,
            email: null,
            website: null,
            owner_id: session.userId,
            created_at: timestamp,
            updated_at: timestamp,
            created_by: session.userId,
          });
        }
      }
      const timestamp = new Date().toISOString();
      store.contacts.push({
        id: createId(),
        organization_id: session.organizationId,
        first_name: row.firstName,
        last_name: row.lastName,
        company_id: companyId,
        job_title: row.jobTitle || null,
        email: email || null,
        phone: row.phone || null,
        whatsapp: null,
        address: null,
        owner_id: session.userId,
        source: "CSV",
        created_at: timestamp,
        updated_at: timestamp,
        created_by: session.userId,
      });
      created += 1;
    }
    return created;
  });
}

export async function saveCompanyAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    if (!parsed.data.force) {
      const similar = store.companies.find((item) => item.organization_id === session.organizationId && item.id !== parsed.data.id && companyNamesSimilar(item.name, parsed.data.name));
      if (similar) throw new ActionError(similar.name, "duplicate");
    }
    const ownerId = canManage(session.role) ? parsed.data.ownerId : session.userId;
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const company = store.companies.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!company || !canEditOwned(session.role, session.userId, company.owner_id)) throw new ActionError(t("forbidden"));
      const previousType = company.client_type;
      Object.assign(company, {
        name: parsed.data.name,
        client_type: parsed.data.clientType,
        city: parsed.data.city,
        province: parsed.data.province,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        website: parsed.data.website,
        npwp: parsed.data.npwp,
        address: parsed.data.address,
        owner_id: ownerId,
      });
      if (previousType !== company.client_type) {
        for (const deal of store.deals) {
          if (deal.organization_id !== session.organizationId) continue;
          const linked = deal.owner_company_id === company.id || deal.consultant_company_id === company.id || deal.contractor_company_id === company.id;
          if (!linked) continue;
          if (deal.owner_company_id === company.id) deal.owner_company_id = null;
          if (deal.consultant_company_id === company.id) deal.consultant_company_id = null;
          if (deal.contractor_company_id === company.id) deal.contractor_company_id = null;
          setParty(deal, company.client_type, company.id);
        }
      }
      touch(company);
      return company.id;
    }
    const companyId = createId();
    store.companies.push({
      id: companyId,
      organization_id: session.organizationId,
      name: parsed.data.name,
      client_type: parsed.data.clientType,
      city: parsed.data.city,
      province: parsed.data.province,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      website: parsed.data.website,
      npwp: parsed.data.npwp,
      address: parsed.data.address,
      owner_id: ownerId,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    return companyId;
  }, ["companies"]);
}

export async function saveSalesTargetAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (session.role !== "owner" && session.role !== "admin") throw new ActionError(t("forbidden"));
    const parsed = salesTargetSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    if (!store.memberships.some((item) => item.organization_id === session.organizationId && item.user_id === parsed.data.userId && !item.disabled_at)) {
      throw new ActionError(t("error"));
    }
    const month = `${parsed.data.month}-01`;
    const existing = store.sales_targets.find((item) => item.organization_id === session.organizationId && item.user_id === parsed.data.userId && item.month.slice(0, 7) === parsed.data.month);
    const timestamp = new Date().toISOString();
    if (existing) {
      existing.amount = parsed.data.amount;
      existing.updated_at = timestamp;
      return existing.id;
    }
    const id = createId();
    store.sales_targets.push({
      id,
      organization_id: session.organizationId,
      user_id: parsed.data.userId,
      month,
      amount: parsed.data.amount,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    return id;
  });
}

export async function setDealContactRoleAction(linkId: string, role: string | null) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const parsed = dealContactRoleSchema.safeParse({ linkId, role });
    if (!parsed.success || (parsed.data.role && !isClientType(parsed.data.role))) throw new ActionError(t("error"));
    const link = store.deal_contacts.find((item) => item.id === linkId);
    if (!link) throw new ActionError(t("error"));
    assertDeal(store, session, link.deal_id);
    link.role = parsed.data.role;
    return null;
  });
}

export async function deleteCompanyAction(companyId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const company = store.companies.find((item) => item.id === companyId && item.organization_id === session.organizationId);
    if (!company || !canEditOwned(session.role, session.userId, company.owner_id)) throw new ActionError(t("forbidden"));
    store.companies = store.companies.filter((item) => item.id !== companyId);
    return null;
  });
}

export async function saveActivityAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    const activityId = parsed.data.id ?? createId();
    if (parsed.data.id) {
      const activity = store.activities.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!activity) throw new ActionError(t("error"));
      if (!canManage(session.role) && activity.assigned_to !== session.userId && activity.created_by !== session.userId) {
        throw new ActionError(t("forbidden"));
      }
      Object.assign(activity, {
        type: parsed.data.type,
        subject: parsed.data.subject,
        note: parsed.data.note,
        due_at: parsed.data.dueAt,
        assigned_to: parsed.data.assignedTo,
        deal_id: parsed.data.dealId,
        contact_id: parsed.data.contactId,
        company_id: parsed.data.companyId,
      });
      touch(activity);
    } else {
      store.activities.push({
        id: activityId,
        organization_id: session.organizationId,
        type: parsed.data.type,
        subject: parsed.data.subject,
        note: parsed.data.note,
        due_at: parsed.data.dueAt,
        done_at: null,
        result_note: null,
        assigned_to: parsed.data.assignedTo,
        deal_id: parsed.data.dealId,
        contact_id: parsed.data.contactId,
        company_id: parsed.data.companyId,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: session.userId,
      });
    }
    if (parsed.data.dealId) {
      const deal = store.deals.find((item) => item.id === parsed.data.dealId);
      if (deal) deal.last_activity_at = timestamp;
    }
    return activityId;
  }, ["activities", "deals"]);
}

export async function completeActivityAction(activityId: string, resultNote: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const activity = store.activities.find((item) => item.id === activityId && item.organization_id === session.organizationId);
    if (!activity) throw new ActionError(t("error"));
    if (!canManage(session.role) && activity.assigned_to !== session.userId) throw new ActionError(t("forbidden"));
    const timestamp = new Date().toISOString();
    activity.done_at = timestamp;
    activity.result_note = resultNote || null;
    touch(activity);
    if (activity.deal_id) {
      const deal = store.deals.find((item) => item.id === activity.deal_id);
      if (deal) deal.last_activity_at = timestamp;
    }
    return null;
  }, ["activities", "deals"]);
}

export async function addNoteAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = noteSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    const noteId = createId();
    store.notes.unshift({
      id: noteId,
      organization_id: session.organizationId,
      body: parsed.data.body,
      deal_id: parsed.data.dealId,
      contact_id: parsed.data.contactId,
      company_id: parsed.data.companyId,
      pinned: false,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    if (parsed.data.dealId) {
      const deal = store.deals.find((item) => item.id === parsed.data.dealId);
      if (deal) deal.last_activity_at = timestamp;
    }
    return noteId;
  }, ["deals"]);
}

export async function saveLineAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const parsed = lineSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    assertDeal(store, session, parsed.data.dealId);
    store.deal_products.push({
      id: createId(),
      deal_id: parsed.data.dealId,
      product_id: parsed.data.productId,
      qty: parsed.data.qty,
      unit_price: parsed.data.unitPrice,
      discount_pct: parsed.data.discountPct,
      subtotal: subtotal(parsed.data.qty, parsed.data.unitPrice, parsed.data.discountPct),
    });
    const product = store.products.find((item) => item.id === parsed.data.productId);
    if (product?.tag_id && !store.deal_tags.some((item) => item.deal_id === parsed.data.dealId && item.tag_id === product.tag_id)) {
      store.deal_tags.push({ deal_id: parsed.data.dealId, tag_id: product.tag_id });
    }
    return null;
  }, ["deals", "deal_products", "products", "deal_tags"]);
}

export async function deleteLineAction(lineId: string) {
  return runAction(({ session, store }) => {
    const line = store.deal_products.find((item) => item.id === lineId);
    if (!line) throw new ActionError("Missing");
    assertDeal(store, session, line.deal_id);
    store.deal_products = store.deal_products.filter((item) => item.id !== lineId);
    return null;
  });
}

export async function applyLineTotalAction(dealId: string) {
  return runAction(({ session, store }) => {
    const deal = assertDeal(store, session, dealId);
    const total = store.deal_products.filter((item) => item.deal_id === dealId).reduce((sum, item) => sum + item.subtotal, 0);
    deal.value = total;
    touch(deal);
    return null;
  });
}

export async function saveProductAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const product = store.products.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!product) throw new ActionError(t("error"));
      Object.assign(product, {
        name: parsed.data.name,
        sku: parsed.data.sku,
        unit: parsed.data.unit,
        unit_price: parsed.data.unitPrice,
        tag_id: parsed.data.tagId,
      });
      touch(product);
      return product.id;
    }
    const productId = createId();
    store.products.push({
      id: productId,
      organization_id: session.organizationId,
      name: parsed.data.name,
      sku: parsed.data.sku,
      unit: parsed.data.unit,
      unit_price: parsed.data.unitPrice,
      tag_id: parsed.data.tagId,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    return productId;
  });
}

export async function deleteProductAction(productId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canWrite(session.role)) throw new ActionError(t("forbidden"));
    if (store.deal_products.some((item) => item.product_id === productId)) throw new ActionError(t("forbidden"));
    store.products = store.products.filter((item) => !(item.id === productId && item.organization_id === session.organizationId));
    return null;
  });
}

export async function updateProfileAction(input: unknown) {
  const t = await getTranslations("settings");
  const result = await runAction(({ session, store }) => {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("invalidProfile"));
    const profile = store.profiles.find((item) => item.id === session.userId);
    if (!profile) throw new ActionError("Missing");
    profile.full_name = parsed.data.fullName;
    profile.phone = parsed.data.phone;
    if (parsed.data.locale) profile.locale = parsed.data.locale;
    if (parsed.data.theme) profile.theme = parsed.data.theme;
    profile.updated_at = new Date().toISOString();
    return parsed.data.locale ?? null;
  });
  if (result.ok && typeof result.data === "string") await rememberLocale(result.data);
  return result;
}

/**
 * Theme and language are one-column changes to the caller's own profile, so they are written
 * with a single targeted update instead of the full snapshot diff.
 */
async function updateOwnPreference(fields: { theme?: "light" | "dark" | "system"; locale?: "en" | "id" }) {
  const t = await getTranslations("common");
  if (!supabaseEnabled) {
    return runAction(({ session, store }) => {
      const profile = store.profiles.find((item) => item.id === session.userId);
      if (!profile) throw new ActionError("Missing");
      Object.assign(profile, fields, { updated_at: new Date().toISOString() });
      return null;
    });
  }
  const userId = await getUserId();
  if (!userId) return { ok: false as const, error: t("forbidden") };
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("update preference", error);
    return { ok: false as const, error: t("error") };
  }
  revalidatePath("/", "layout");
  return { ok: true as const, data: null };
}

/** Language only, separate from the profile form: saves the profile and the cookie. */
export async function updateLocaleAction(locale: unknown) {
  if (locale !== "en" && locale !== "id") return { ok: false as const, error: "Invalid" };
  const result = await updateOwnPreference({ locale });
  if (result.ok) await rememberLocale(locale);
  return result;
}

export async function updateThemeAction(theme: unknown) {
  if (theme !== "light" && theme !== "dark" && theme !== "system") return { ok: false as const, error: "Invalid" };
  return updateOwnPreference({ theme });
}

export async function changePasswordAction(input: unknown) {
  const t = await getTranslations("settings");
  if (supabaseEnabled) {
    const session = await getSession();
    const parsed = passwordSchema.safeParse(input);
    if (!session || !parsed.success) return { ok: false as const, error: t("wrongPassword") };
    const check = await createStatelessClient().auth.signInWithPassword({
      email: session.profile.email,
      password: parsed.data.currentPassword,
    });
    if (check.error) return { ok: false as const, error: t("wrongPassword") };
    const supabase = await createClient();
    const { error } = (await supabase?.auth.updateUser({ password: parsed.data.newPassword })) ?? { error: true };
    if (error) return { ok: false as const, error: t("wrongPassword") };
    return { ok: true as const, data: null };
  }
  return runAction(({ session, store }) => {
    const parsed = passwordSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("wrongPassword"));
    const profile = store.profiles.find((item) => item.id === session.userId);
    if (!profile || profile.password !== parsed.data.currentPassword) throw new ActionError(t("wrongPassword"));
    profile.password = parsed.data.newPassword;
    profile.updated_at = new Date().toISOString();
    return null;
  });
}

export async function updateOrganizationAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    const parsed = organizationSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const org = store.organizations.find((item) => item.id === session.organizationId);
    if (!org) throw new ActionError(t("error"));
    org.name = parsed.data.name;
    touch(org);
    return null;
  });
}

export async function inviteMemberAction(input: unknown) {
  const t = await getTranslations("common");
  const result = await runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const token = createId();
    const existing = store.profiles.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (existing && store.memberships.some((item) => item.user_id === existing.id && item.organization_id === session.organizationId && !item.disabled_at)) {
      throw new ActionError(t("error"));
    }
    const invitationId = createId();
    const timestamp = new Date().toISOString();
    if (existing) {
      addMembership(store, session.organizationId, existing.id, parsed.data.role, session.userId, parsed.data.teamId);
      store.notifications.unshift({
        id: createId(),
        organization_id: session.organizationId,
        user_id: existing.id,
        type: "deal_assigned",
        payload: { title: session.organization.name, href: "/dashboard" },
        read_at: null,
        created_at: timestamp,
      });
      store.invitations.unshift({
        id: invitationId,
        organization_id: session.organizationId,
        email: parsed.data.email.toLowerCase(),
        full_name: parsed.data.fullName,
        role: parsed.data.role,
        team_id: parsed.data.teamId,
        token,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        accepted_at: timestamp,
        cancelled_at: null,
        created_at: timestamp,
        created_by: session.userId,
      });
      return { token, emailSent: false };
    }
    store.invitations.unshift({
      id: invitationId,
      organization_id: session.organizationId,
      email: parsed.data.email.toLowerCase(),
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      team_id: parsed.data.teamId,
      token,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      accepted_at: null,
      cancelled_at: null,
      created_at: timestamp,
      created_by: session.userId,
    });
    return {
      token,
      emailSent: true,
      invitationId,
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      invitedBy: session.profile.full_name,
      organization: session.organization.name,
      role: parsed.data.role,
    };
  });
  if (!result.ok) return { ok: false as const, error: result.error };
  if (result.data.emailSent && result.data.email && result.data.invitationId && supabaseEnabled) {
    try {
      const admin = createAdminClient();
      await admin.auth.admin.inviteUserByEmail(result.data.email, {
        redirectTo: `${siteUrl()}/auth/callback?next=/accept-invite`,
        // Available to the Supabase invite email template as {{ .Data.<key> }} (AGENTS.md §12).
        data: {
          full_name: result.data.fullName ?? "",
          invitation_id: result.data.invitationId,
          invited_by: result.data.invitedBy ?? "",
          organization: result.data.organization ?? "",
          role: result.data.role ?? "",
        },
      });
    } catch (error) {
      console.error(error);
    }
  }
  return { ok: true as const, data: result.data.token };
}

export async function setMemberRoleAction(userId: string, role: "owner" | "admin" | "manager" | "sales" | "presales" | "viewer") {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    const membership = store.memberships.find((item) => item.user_id === userId && item.organization_id === session.organizationId);
    if (!membership) throw new ActionError(t("error"));
    if ((membership.role === "owner" || role === "owner") && session.role !== "owner") throw new ActionError(t("forbidden"));
    const owners = store.memberships.filter((item) => item.organization_id === session.organizationId && item.role === "owner");
    if (membership.role === "owner" && owners.length === 1 && role !== "owner") throw new ActionError(t("forbidden"));
    membership.role = role;
    touch(membership);
    return null;
  });
}

export async function removeMemberAction(userId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canAdmin(session.role)) throw new ActionError(t("forbidden"));
    if (userId === session.userId) throw new ActionError(t("forbidden"));
    const membership = store.memberships.find((item) => item.user_id === userId && item.organization_id === session.organizationId);
    if (!membership) throw new ActionError(t("error"));
    if (membership.role === "owner" && session.role !== "owner") throw new ActionError(t("forbidden"));
    if (membership.role === "owner") {
      const owners = store.memberships.filter((item) => item.organization_id === session.organizationId && item.role === "owner" && !item.disabled_at);
      if (owners.length === 1) throw new ActionError(t("forbidden"));
    }
    membership.disabled_at = new Date().toISOString();
    touch(membership);
    return null;
  });
}

export async function savePipelineAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const parsed = pipelineSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const pipeline = store.pipelines.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!pipeline) throw new ActionError(t("error"));
      pipeline.name = parsed.data.name;
      pipeline.description = parsed.data.description;
      pipeline.color = parsed.data.color;
      touch(pipeline);
      return pipeline.id;
    }
    const pipelineId = createId();
    const position = store.pipelines.filter((item) => item.organization_id === session.organizationId).length;
    store.pipelines.push({
      id: pipelineId,
      organization_id: session.organizationId,
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
      position,
      is_default: position === 0,
      archived: false,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    store.stages.push(
      { id: createId(), organization_id: session.organizationId, pipeline_id: pipelineId, name: "Won", position: 1, probability: 100, rotting_days: null, type: "won", created_at: timestamp, updated_at: timestamp, created_by: session.userId },
      { id: createId(), organization_id: session.organizationId, pipeline_id: pipelineId, name: "Lost", position: 2, probability: 0, rotting_days: null, type: "lost", created_at: timestamp, updated_at: timestamp, created_by: session.userId },
      { id: createId(), organization_id: session.organizationId, pipeline_id: pipelineId, name: "Kualifikasi", position: 0, probability: 10, rotting_days: 14, type: "open", created_at: timestamp, updated_at: timestamp, created_by: session.userId },
    );
    return pipelineId;
  });
}

export async function archivePipelineAction(pipelineId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const active = store.pipelines.filter((item) => item.organization_id === session.organizationId && !item.archived);
    const pipeline = active.find((item) => item.id === pipelineId);
    if (!pipeline || active.length === 1) throw new ActionError(t("forbidden"));
    pipeline.archived = true;
    if (pipeline.is_default) {
      pipeline.is_default = false;
      const next = active.find((item) => item.id !== pipelineId);
      if (next) next.is_default = true;
    }
    return null;
  });
}

export async function duplicatePipelineAction(pipelineId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const copyId = duplicatePipeline(store, pipelineId, session.userId);
    if (!copyId) throw new ActionError(t("error"));
    return copyId;
  });
}

export async function sendToSalesAction(dealId: string, ownerId: string | null) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const deal = assertDeal(store, session, dealId);
    const sales = store.pipelines.find((item) => item.organization_id === session.organizationId && item.name === "Sales" && !item.archived);
    const stage = store.stages
      .filter((item) => item.pipeline_id === sales?.id && item.type === "open")
      .sort((a, b) => a.position - b.position)[0];
    if (!sales || !stage) throw new ActionError(t("error"));
    const previous = deal.stage_id;
    deal.pipeline_id = sales.id;
    deal.stage_id = stage.id;
    deal.status = "open";
    if (ownerId && canManage(session.role)) deal.owner_id = ownerId;
    touch(deal);
    store.stage_history.push({
      id: createId(),
      deal_id: deal.id,
      from_stage_id: previous,
      to_stage_id: stage.id,
      changed_by: session.userId,
      changed_at: new Date().toISOString(),
    });
    return sales.id;
  });
}

export async function saveStageAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const parsed = stageSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const stage = store.stages.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!stage) throw new ActionError(t("error"));
      stage.name = parsed.data.name;
      stage.probability = parsed.data.probability;
      stage.rotting_days = parsed.data.type === "open" ? parsed.data.rottingDays : null;
      stage.type = parsed.data.type;
      touch(stage);
      return stage.id;
    }
    const stages = store.stages.filter((item) => item.pipeline_id === parsed.data.pipelineId);
    const stageId = createId();
    store.stages.push({
      id: stageId,
      organization_id: session.organizationId,
      pipeline_id: parsed.data.pipelineId,
      name: parsed.data.name,
      position: stages.length,
      probability: parsed.data.probability,
      rotting_days: parsed.data.type === "open" ? parsed.data.rottingDays : null,
      type: parsed.data.type,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    return stageId;
  });
}

export async function moveStageAction(stageId: string, direction: "up" | "down") {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const stage = store.stages.find((item) => item.id === stageId && item.organization_id === session.organizationId);
    if (!stage) throw new ActionError(t("error"));
    const siblings = store.stages.filter((item) => item.pipeline_id === stage.pipeline_id).sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((item) => item.id === stageId);
    const swap = direction === "up" ? index - 1 : index + 1;
    const other = siblings[swap];
    if (!other) return null;
    const current = stage.position;
    stage.position = other.position;
    other.position = current;
    return null;
  });
}

export async function deleteStageAction(stageId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const stage = store.stages.find((item) => item.id === stageId && item.organization_id === session.organizationId);
    if (!stage) throw new ActionError(t("error"));
    if (store.deals.some((item) => item.stage_id === stageId)) throw new ActionError(t("forbidden"));
    const sameType = store.stages.filter((item) => item.pipeline_id === stage.pipeline_id && item.type === stage.type);
    if (sameType.length <= 1 && stage.type !== "open") throw new ActionError(t("forbidden"));
    store.stages = store.stages.filter((item) => item.id !== stageId);
    return null;
  });
}

export async function saveTagAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const parsed = tagSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const tag = store.tags.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!tag) throw new ActionError(t("error"));
      tag.name = parsed.data.name;
      tag.color = parsed.data.color;
      touch(tag);
      return tag.id;
    }
    const tagId = createId();
    store.tags.push({
      id: tagId,
      organization_id: session.organizationId,
      name: parsed.data.name,
      color: parsed.data.color,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    return tagId;
  });
}

export async function deleteTagAction(tagId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    if (store.products.some((item) => item.tag_id === tagId && item.organization_id === session.organizationId)) {
      throw new ActionError(t("forbidden"));
    }
    if (store.deal_tags.some((item) => item.tag_id === tagId)) throw new ActionError(t("forbidden"));
    store.tags = store.tags.filter((item) => !(item.id === tagId && item.organization_id === session.organizationId));
    return null;
  });
}

export async function saveReasonAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    const parsed = reasonSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    const timestamp = new Date().toISOString();
    if (parsed.data.id) {
      const reason = store.lost_reasons.find((item) => item.id === parsed.data.id && item.organization_id === session.organizationId);
      if (!reason) throw new ActionError(t("error"));
      reason.name = parsed.data.name;
      touch(reason);
      return reason.id;
    }
    const reasonId = createId();
    store.lost_reasons.push({
      id: reasonId,
      organization_id: session.organizationId,
      name: parsed.data.name,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: session.userId,
    });
    return reasonId;
  });
}

export async function deleteReasonAction(reasonId: string) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    if (!canManage(session.role)) throw new ActionError(t("forbidden"));
    if (store.deals.some((item) => item.lost_reason_id === reasonId)) throw new ActionError(t("forbidden"));
    store.lost_reasons = store.lost_reasons.filter((item) => item.id !== reasonId);
    return null;
  });
}

export async function saveViewAction(input: unknown) {
  const t = await getTranslations("common");
  return runAction(({ session, store }) => {
    const parsed = savedViewSchema.safeParse(input);
    if (!parsed.success) throw new ActionError(t("error"));
    store.saved_views.unshift({
      id: createId(),
      organization_id: session.organizationId,
      user_id: session.userId,
      pipeline_id: parsed.data.pipelineId,
      name: parsed.data.name,
      filters: parsed.data.filters,
      is_shared: false,
      created_at: new Date().toISOString(),
    });
    return null;
  });
}

export async function markNotificationsReadAction() {
  if (supabaseEnabled) {
    // One update for every unread row, not just the window the store loads.
    const t = await getTranslations("common");
    const session = await getSession();
    if (!session) return { ok: false as const, error: t("forbidden") };
    const { error } = await createAdminClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.userId)
      .eq("organization_id", session.organizationId)
      .is("read_at", null);
    if (error) {
      console.error("mark notifications read", error);
      return { ok: false as const, error: t("error") };
    }
    revalidatePath("/", "layout");
    return { ok: true as const, data: null };
  }
  return runAction(({ session, store }) => {
    const timestamp = new Date().toISOString();
    store.notifications.forEach((item) => {
      if (item.user_id === session.userId && item.organization_id === session.organizationId && !item.read_at) {
        item.read_at = timestamp;
      }
    });
    return null;
  }, ["notifications"]);
}

export async function resetDemoAction() {
  const t = await getTranslations("common");
  const session = await getSession();
  if (supabaseEnabled || !session || !canAdmin(session.role)) return { ok: false as const, error: t("forbidden") };
  resetStore();
  const jar = await cookies();
  jar.delete("airtek_session");
  jar.delete(ORG_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true as const, data: null };
}
