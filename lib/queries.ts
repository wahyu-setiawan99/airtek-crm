import { activitySignal, dealProbability, isRotting, weightedValue } from "@/lib/domain";
import { addMonthsKey, inPeriod, jakartaMonthKey, jakartaStart } from "@/lib/format";
import { canEditOwned, canManage, canWrite } from "@/lib/permissions";
import type { Session } from "@/lib/session";
import { contactName } from "@/lib/utils";
import type { Store } from "@/types/crm";
import type {
  ActivityRow,
  BoardDeal,
  CompanyRow,
  ContactRow,
  DashboardData,
  DealDetailData,
  PipelineData,
  ReportData,
  ShellData,
} from "@/types/view";

function orgPeople(store: Store, organizationId: string) {
  const ids = new Set(
    store.memberships.filter((item) => item.organization_id === organizationId).map((item) => item.user_id),
  );
  return store.profiles.filter((item) => ids.has(item.id));
}

function personName(store: Store, userId: string | null) {
  if (!userId) return "—";
  return store.profiles.find((item) => item.id === userId)?.full_name ?? "—";
}

function toBoardDeal(store: Store, session: Session, dealId: string): BoardDeal | null {
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) return null;
  const stage = store.stages.find((item) => item.id === deal.stage_id);
  if (!stage) return null;
  const company = store.companies.find((item) => item.id === deal.company_id);
  const contact = store.contacts.find((item) => item.id === deal.primary_contact_id);
  const tags = store.deal_tags
    .filter((item) => item.deal_id === deal.id)
    .map((item) => store.tags.find((tag) => tag.id === item.tag_id))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    .map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));
  const probability = dealProbability(deal, stage);
  return {
    id: deal.id,
    title: deal.title,
    value: deal.value,
    probability,
    weighted: weightedValue(deal, stage),
    priority: deal.priority,
    status: deal.status,
    companyId: deal.company_id,
    companyName: company?.name ?? null,
    contactId: deal.primary_contact_id,
    contactName: contact ? contactName(contact) : null,
    ownerId: deal.owner_id,
    ownerName: personName(store, deal.owner_id),
    tags,
    expectedCloseDate: deal.expected_close_date,
    lastActivityAt: deal.last_activity_at,
    activityStatus: activitySignal(store.activities, deal.id),
    rotting: isRotting(deal, stage),
    canEdit: canEditOwned(session.role, session.userId, deal.owner_id),
    stageId: deal.stage_id,
  };
}

export function buildShell(store: Store, session: Session): ShellData {
  const orgId = session.organizationId;
  const pipelines = store.pipelines
    .filter((item) => item.organization_id === orgId && !item.archived)
    .sort((a, b) => a.position - b.position);
  const defaultPipeline = pipelines.find((item) => item.is_default) ?? pipelines[0];
  const homePipeline = session.role === "presales"
    ? pipelines.find((item) => item.name === "Presales") ?? defaultPipeline
    : defaultPipeline;
  return {
    user: {
      id: session.userId,
      name: session.profile.full_name,
      email: session.profile.email,
      role: session.role,
      theme: session.profile.theme ?? "system",
    },
    organization: { id: session.organization.id, name: session.organization.name, demo: session.organization.demo },
    organizations: session.memberships
      .map((item) => store.organizations.find((org) => org.id === item.organization_id))
      .filter((org): org is NonNullable<typeof org> => Boolean(org))
      .map((org) => ({ id: org.id, name: org.name })),
    pipelineId: homePipeline?.id ?? null,
    notifications: store.notifications
      .filter((item) => item.user_id === session.userId && item.organization_id === orgId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.payload.title,
        href: item.payload.href,
        read: Boolean(item.read_at),
        createdAt: item.created_at,
      })),
    search: {
      deals: store.deals
        .filter((item) => item.organization_id === orgId)
        .slice(0, 40)
        .map((item) => ({ id: item.id, title: item.title, subtitle: formatMoneyHint(item.value) })),
      contacts: store.contacts
        .filter((item) => item.organization_id === orgId)
        .slice(0, 40)
        .map((item) => ({ id: item.id, title: contactName(item), subtitle: item.email ?? item.phone ?? "" })),
      companies: store.companies
        .filter((item) => item.organization_id === orgId)
        .slice(0, 40)
        .map((item) => ({ id: item.id, title: item.name, subtitle: item.city ?? "" })),
    },
  };
}

function formatMoneyHint(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function buildPipeline(store: Store, session: Session, pipelineId: string): PipelineData | null {
  const pipeline = store.pipelines.find((item) => item.id === pipelineId && item.organization_id === session.organizationId && !item.archived);
  if (!pipeline) return null;
  const stages = store.stages
    .filter((item) => item.pipeline_id === pipelineId)
    .sort((a, b) => a.position - b.position)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      probability: stage.probability,
      rottingDays: stage.rotting_days,
      type: stage.type,
      deals: store.deals
        .filter((deal) => deal.stage_id === stage.id)
        .sort((a, b) => a.position - b.position)
        .map((deal) => toBoardDeal(store, session, deal.id))
        .filter((deal): deal is BoardDeal => Boolean(deal)),
    }));
  const people = orgPeople(store, session.organizationId);
  return {
    pipeline: { id: pipeline.id, name: pipeline.name, color: pipeline.color },
    pipelines: store.pipelines
      .filter((item) => item.organization_id === session.organizationId && !item.archived)
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ id: item.id, name: item.name })),
    stages,
    companies: store.companies
      .filter((item) => item.organization_id === session.organizationId)
      .map((item) => ({ id: item.id, name: item.name })),
    contacts: store.contacts
      .filter((item) => item.organization_id === session.organizationId)
      .map((item) => ({ id: item.id, name: contactName(item), companyId: item.company_id })),
    owners: people.map((item) => ({ id: item.id, name: item.full_name })),
    tags: store.tags
      .filter((item) => item.organization_id === session.organizationId)
      .map((item) => ({ id: item.id, name: item.name, color: item.color })),
    lostReasons: store.lost_reasons
      .filter((item) => item.organization_id === session.organizationId)
      .map((item) => ({ id: item.id, name: item.name })),
    savedViews: store.saved_views
      .filter((item) => item.organization_id === session.organizationId && (item.user_id === session.userId || item.is_shared) && item.pipeline_id === pipelineId)
      .map((item) => ({ id: item.id, name: item.name, filters: item.filters })),
    me: {
      id: session.userId,
      name: session.profile.full_name,
      role: session.role,
      canCreate: canWrite(session.role),
      canManage: canManage(session.role),
    },
  };
}

export function defaultPipelineId(store: Store, organizationId: string) {
  const pipelines = store.pipelines.filter((item) => item.organization_id === organizationId && !item.archived);
  return (pipelines.find((item) => item.is_default) ?? pipelines[0])?.id ?? null;
}

export function buildDashboard(
  store: Store,
  session: Session,
  pipelineId: string,
  period: DashboardData["period"],
): DashboardData {
  const orgId = session.organizationId;
  const pipelines = store.pipelines.filter((item) => item.organization_id === orgId && !item.archived);
  const selected = pipelineId === "all" ? null : pipelines.find((item) => item.id === pipelineId) ?? pipelines.find((item) => item.is_default);
  const deals = store.deals.filter((deal) => deal.organization_id === orgId && (!selected || deal.pipeline_id === selected.id));
  const open = deals.filter((deal) => deal.status === "open");
  const pipelineValue = open.reduce((sum, deal) => sum + deal.value, 0);
  const weighted = open.reduce((sum, deal) => {
    const stage = store.stages.find((item) => item.id === deal.stage_id);
    return sum + (stage ? weightedValue(deal, stage) : 0);
  }, 0);
  const wonDeals = deals.filter((deal) => deal.status === "won" && inPeriod(deal.won_at, period));
  const lostDeals = deals.filter((deal) => deal.status === "lost" && inPeriod(deal.lost_at, period));
  const closed = wonDeals.length + lostDeals.length;
  const cycleSamples = wonDeals
    .map((deal) => (deal.won_at ? (new Date(deal.won_at).getTime() - new Date(deal.created_at).getTime()) / 86400000 : 0))
    .filter((days) => days > 0);
  const stages = selected
    ? store.stages.filter((item) => item.pipeline_id === selected.id && item.type === "open").sort((a, b) => a.position - b.position)
    : [];
  const funnel = (selected ? stages : uniqueStageNames(store, pipelines.map((item) => item.id))).map((stage) => {
    const rows = open.filter((deal) => {
      const current = store.stages.find((item) => item.id === deal.stage_id);
      return selected ? deal.stage_id === stage.id : current?.name === stage.name;
    });
    return {
      name: stage.name,
      total: rows.reduce((sum, deal) => sum + deal.value, 0),
      weighted: rows.reduce((sum, deal) => {
        const current = store.stages.find((item) => item.id === deal.stage_id);
        return sum + (current ? weightedValue(deal, current) : 0);
      }, 0),
    };
  });
  const forecast = Array.from({ length: 6 }, (_, index) => {
    const key = addMonthsKey(index);
    const rows = open.filter((deal) => deal.expected_close_date && jakartaMonthKey(deal.expected_close_date) === key);
    return {
      key,
      total: rows.reduce((sum, deal) => sum + deal.value, 0),
      weighted: rows.reduce((sum, deal) => {
        const stage = store.stages.find((item) => item.id === deal.stage_id);
        return sum + (stage ? weightedValue(deal, stage) : 0);
      }, 0),
    };
  });
  const salesMap = new Map<string, number>();
  wonDeals.forEach((deal) => salesMap.set(deal.owner_id, (salesMap.get(deal.owner_id) ?? 0) + deal.value));
  const overdueCutoff = canManage(session.role) || session.role === "viewer" ? null : session.userId;
  const overdue = store.activities
    .filter((activity) => activity.organization_id === orgId && !activity.done_at && new Date(activity.due_at).getTime() < jakartaStart(0))
    .filter((activity) => !overdueCutoff || activity.assigned_to === overdueCutoff)
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, 6)
    .map((activity) => ({
      id: activity.id,
      subject: activity.subject,
      dueAt: activity.due_at,
      href: activity.deal_id ? `/deals/${activity.deal_id}` : "/activities",
    }));

  return {
    name: session.profile.full_name.split(" ")[0] ?? session.profile.full_name,
    pipelines: pipelines.map((item) => ({ id: item.id, name: item.name })),
    pipelineId: selected?.id ?? "all",
    period,
    openCount: open.length,
    pipelineValue,
    weighted,
    wonValue: wonDeals.reduce((sum, deal) => sum + deal.value, 0),
    winRate: closed === 0 ? 0 : Math.round((wonDeals.length / closed) * 100),
    avgCycle: cycleSamples.length ? Math.round(cycleSamples.reduce((sum, days) => sum + days, 0) / cycleSamples.length) : 0,
    funnel,
    forecast,
    sales: [...salesMap.entries()]
      .map(([userId, won]) => ({ name: personName(store, userId), won }))
      .sort((a, b) => b.won - a.won)
      .slice(0, 5),
    overdue,
  };
}

function uniqueStageNames(store: Store, pipelineIds: string[]) {
  const seen = new Set<string>();
  return store.stages
    .filter((item) => pipelineIds.includes(item.pipeline_id) && item.type === "open")
    .sort((a, b) => a.position - b.position)
    .filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
}

export function buildDeals(store: Store, session: Session): BoardDeal[] {
  return store.deals
    .filter((deal) => deal.organization_id === session.organizationId)
    .map((deal) => toBoardDeal(store, session, deal.id))
    .filter((deal): deal is BoardDeal => Boolean(deal))
    .sort((a, b) => b.value - a.value);
}

function stageTimes(store: Store, deal: Store["deals"][number], now = Date.now()) {
  const history = store.stage_history
    .filter((item) => item.deal_id === deal.id)
    .sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  const times: Record<string, { ms: number; enteredAt: string }> = {};
  let stageId = history[0]?.from_stage_id ?? deal.stage_id;
  let since = deal.created_at;
  const close = (until: string | number) => {
    const ms = Math.max(0, new Date(until).getTime() - new Date(since).getTime());
    const entry = times[stageId] ?? { ms: 0, enteredAt: since };
    times[stageId] = { ms: entry.ms + ms, enteredAt: since };
  };
  for (const item of history) {
    close(item.changed_at);
    stageId = item.to_stage_id;
    since = item.changed_at;
  }
  close(now);
  return times;
}

export function buildDeal(
  store: Store,
  session: Session,
  dealId: string,
  auditRows: Store["audit_logs"] = store.audit_logs,
): DealDetailData | null {
  const card = toBoardDeal(store, session, dealId);
  const deal = store.deals.find((item) => item.id === dealId && item.organization_id === session.organizationId);
  if (!card || !deal) return null;
  const stages = store.stages
    .filter((item) => item.pipeline_id === deal.pipeline_id)
    .sort((a, b) => a.position - b.position);
  const stageOrder = new Map(stages.map((item, index) => [item.id, index]));
  const siblings = store.deals
    .filter((item) => item.pipeline_id === deal.pipeline_id)
    .sort((a, b) => (stageOrder.get(a.stage_id) ?? 0) - (stageOrder.get(b.stage_id) ?? 0) || a.position - b.position);
  const index = siblings.findIndex((item) => item.id === deal.id);
  const contact = store.contacts.find((item) => item.id === deal.primary_contact_id);
  const company = store.companies.find((item) => item.id === deal.company_id);
  const relatedCount = store.deals.filter(
    (item) =>
      item.id !== deal.id &&
      item.organization_id === session.organizationId &&
      ((deal.company_id && item.company_id === deal.company_id) ||
        (deal.primary_contact_id && item.primary_contact_id === deal.primary_contact_id)),
  ).length;
  const extra = {
    description: deal.description ?? null,
    pipelineName: store.pipelines.find((item) => item.id === deal.pipeline_id)?.name ?? "",
    nav: {
      index: index + 1,
      total: siblings.length,
      prevId: siblings[index - 1]?.id ?? null,
      nextId: siblings[index + 1]?.id ?? null,
    },
    stageTimes: stageTimes(store, deal),
    relatedCount,
    primaryContact: contact
      ? { id: contact.id, name: contactName(contact), jobTitle: contact.job_title, email: contact.email, phone: contact.phone, whatsapp: contact.whatsapp }
      : null,
    company: company ? { id: company.id, name: company.name, city: company.city, phone: company.phone, email: company.email } : null,
    createdByName: personName(store, deal.created_by),
    source: contact?.source ?? null,
    canManage: canManage(session.role),
    events: auditRows
      .filter((item) => item.entity === "deal" && item.entity_id === deal.id)
      .map((item) => ({
        id: item.id,
        action: item.action,
        field: typeof item.diff.field === "string" ? item.diff.field : null,
        from: item.diff.from === undefined || item.diff.from === null ? null : String(item.diff.from),
        to: item.diff.to === undefined || item.diff.to === null ? null : String(item.diff.to),
        at: item.created_at,
        by: personName(store, item.user_id),
      })),
  };
  const lines = store.deal_products
    .filter((item) => item.deal_id === deal.id)
    .map((item) => ({
      id: item.id,
      name: store.products.find((product) => product.id === item.product_id)?.name ?? "Produk",
      qty: item.qty,
      unitPrice: item.unit_price,
      discount: item.discount_pct,
      subtotal: item.subtotal,
    }));
  return {
    ...card,
    probabilityOverride: deal.probability_override,
    createdAt: deal.created_at,
    wonAt: deal.won_at,
    lostAt: deal.lost_at,
    lostReason: store.lost_reasons.find((item) => item.id === deal.lost_reason_id)?.name ?? null,
    pipelineId: deal.pipeline_id,
    stages: stages.map((item) => ({ id: item.id, name: item.name, type: item.type, probability: item.probability })),
    allTags: store.tags.filter((item) => item.organization_id === session.organizationId).map((item) => ({ id: item.id, name: item.name, color: item.color })),
    owners: orgPeople(store, session.organizationId).map((item) => ({ id: item.id, name: item.full_name })),
    companies: store.companies.filter((item) => item.organization_id === session.organizationId).map((item) => ({ id: item.id, name: item.name })),
    contacts: store.contacts.filter((item) => item.organization_id === session.organizationId).map((item) => ({ id: item.id, name: contactName(item), companyId: item.company_id })),
    related: store.deal_contacts
      .filter((item) => item.deal_id === deal.id)
      .map((link) => {
        const contact = store.contacts.find((item) => item.id === link.contact_id);
        if (!contact) return null;
        return { id: contact.id, name: contactName(contact), role: link.role, phone: contact.phone, email: contact.email, whatsapp: contact.whatsapp };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    lines,
    catalog: store.products
      .filter((item) => item.organization_id === session.organizationId)
      .map((item) => ({ id: item.id, name: item.name, unitPrice: item.unit_price, unit: item.unit })),
    lineTotal: lines.reduce((sum, item) => sum + item.subtotal, 0),
    activities: store.activities
      .filter((item) => item.deal_id === deal.id)
      .sort((a, b) => a.due_at.localeCompare(b.due_at))
      .map((item) => ({ id: item.id, type: item.type, subject: item.subject, dueAt: item.due_at, doneAt: item.done_at, note: item.result_note ?? item.note })),
    notes: store.notes
      .filter((item) => item.deal_id === deal.id)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
      .map((item) => ({ id: item.id, body: item.body, author: personName(store, item.created_by), createdAt: item.created_at, pinned: item.pinned })),
    history: store.stage_history
      .filter((item) => item.deal_id === deal.id)
      .sort((a, b) => b.changed_at.localeCompare(a.changed_at))
      .map((item) => ({
        id: item.id,
        from: store.stages.find((stage) => stage.id === item.from_stage_id)?.name ?? null,
        to: store.stages.find((stage) => stage.id === item.to_stage_id)?.name ?? "—",
        at: item.changed_at,
        by: personName(store, item.changed_by),
      })),
    lostReasons: store.lost_reasons.filter((item) => item.organization_id === session.organizationId).map((item) => ({ id: item.id, name: item.name })),
    ...extra,
  };
}

export function buildContacts(store: Store, session: Session): ContactRow[] {
  return store.contacts
    .filter((item) => item.organization_id === session.organizationId)
    .map((item) => ({
      id: item.id,
      name: contactName(item),
      email: item.email,
      phone: item.phone,
      whatsapp: item.whatsapp,
      jobTitle: item.job_title,
      companyId: item.company_id,
      companyName: store.companies.find((company) => company.id === item.company_id)?.name ?? null,
      ownerId: item.owner_id ?? session.userId,
      ownerName: personName(store, item.owner_id),
      source: item.source,
      canEdit: canEditOwned(session.role, session.userId, item.owner_id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export function buildCompanies(store: Store, session: Session): CompanyRow[] {
  return store.companies
    .filter((item) => item.organization_id === session.organizationId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      industry: item.industry,
      city: item.city,
      province: item.province,
      phone: item.phone,
      email: item.email,
      website: item.website,
      npwp: item.npwp,
      address: item.address,
      ownerId: item.owner_id ?? session.userId,
      ownerName: personName(store, item.owner_id),
      canEdit: canEditOwned(session.role, session.userId, item.owner_id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export function buildActivities(store: Store, session: Session, scope: "mine" | "all"): ActivityRow[] {
  const start = jakartaStart(0);
  const end = jakartaStart(1);
  return store.activities
    .filter((item) => item.organization_id === session.organizationId)
    .filter((item) => (scope === "all" ? canManage(session.role) || session.role === "viewer" : item.assigned_to === session.userId))
    .map((item) => {
      const due = new Date(item.due_at).getTime();
      const bucket: ActivityRow["bucket"] = item.done_at ? "done" : due < start ? "overdue" : due < end ? "today" : "upcoming";
      return {
        id: item.id,
        type: item.type,
        subject: item.subject,
        note: item.note,
        dueAt: item.due_at,
        doneAt: item.done_at,
        assigneeId: item.assigned_to,
        assigneeName: personName(store, item.assigned_to),
        dealId: item.deal_id,
        dealTitle: store.deals.find((deal) => deal.id === item.deal_id)?.title ?? null,
        contactId: item.contact_id,
        companyId: item.company_id,
        bucket,
      };
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function buildReports(
  store: Store,
  session: Session,
  pipelineId: string,
  ownerId: string,
  period: DashboardData["period"],
): ReportData {
  const pipelines = store.pipelines.filter((item) => item.organization_id === session.organizationId && !item.archived);
  const deals = store.deals.filter((deal) => {
    if (deal.organization_id !== session.organizationId) return false;
    if (pipelineId !== "all" && deal.pipeline_id !== pipelineId) return false;
    if (ownerId !== "all" && deal.owner_id !== ownerId) return false;
    return true;
  });
  const won = deals.filter((deal) => deal.status === "won" && inPeriod(deal.won_at, period));
  const lost = deals.filter((deal) => deal.status === "lost" && inPeriod(deal.lost_at, period));
  const reasonMap = new Map<string, number>();
  lost.forEach((deal) => {
    const name = store.lost_reasons.find((item) => item.id === deal.lost_reason_id)?.name ?? "Lainnya";
    reasonMap.set(name, (reasonMap.get(name) ?? 0) + 1);
  });
  const durationMap = new Map<string, number[]>();
  const relevant = new Set([...won, ...lost].map((deal) => deal.id));
  store.stage_history
    .filter((item) => relevant.has(item.deal_id))
    .forEach((item) => {
      const name = store.stages.find((stage) => stage.id === item.from_stage_id)?.name;
      if (!name) return;
      const deal = store.deals.find((row) => row.id === item.deal_id);
      if (!deal) return;
      const entered = new Date(deal.created_at).getTime();
      const left = new Date(item.changed_at).getTime();
      const days = Math.max(1, Math.round((left - entered) / 86400000));
      const list = durationMap.get(name) ?? [];
      list.push(days);
      durationMap.set(name, list);
    });
  const sales = new Map<string, { won: number; lost: number; value: number }>();
  [...won, ...lost].forEach((deal) => {
    const current = sales.get(deal.owner_id) ?? { won: 0, lost: 0, value: 0 };
    if (deal.status === "won") {
      current.won += 1;
      current.value += deal.value;
    } else current.lost += 1;
    sales.set(deal.owner_id, current);
  });
  return {
    pipelines: pipelines.map((item) => ({ id: item.id, name: item.name })),
    owners: orgPeople(store, session.organizationId).map((item) => ({ id: item.id, name: item.full_name })),
    won: won.length,
    lost: lost.length,
    wonValue: won.reduce((sum, deal) => sum + deal.value, 0),
    lostValue: lost.reduce((sum, deal) => sum + deal.value, 0),
    reasons: [...reasonMap.entries()].map(([name, count]) => ({ name, count })),
    durations: [...durationMap.entries()].map(([name, days]) => ({
      name,
      days: Math.round(days.reduce((sum, value) => sum + value, 0) / days.length),
    })),
    sales: [...sales.entries()].map(([userId, stats]) => ({ name: personName(store, userId), ...stats })),
    rows: [...won, ...lost].map((deal) => ({
      title: deal.title,
      status: deal.status,
      value: String(deal.value),
      owner: personName(store, deal.owner_id),
      closed: deal.won_at ?? deal.lost_at ?? "",
      reason: store.lost_reasons.find((item) => item.id === deal.lost_reason_id)?.name ?? "",
    })),
  };
}

export function buildSettings(store: Store, session: Session) {
  const orgId = session.organizationId;
  return {
    profile: {
      fullName: session.profile.full_name,
      email: session.profile.email,
      phone: session.profile.phone ?? "",
      locale: session.profile.locale,
      theme: session.profile.theme ?? "system",
    },
    organization: session.organization,
    canAdmin: session.role === "owner" || session.role === "admin",
    canManage: canManage(session.role),
    members: store.memberships
      .filter((item) => item.organization_id === orgId)
      .map((item) => ({
        userId: item.user_id,
        name: personName(store, item.user_id),
        email: store.profiles.find((profile) => profile.id === item.user_id)?.email ?? "",
        role: item.role,
      })),
    invitations: store.invitations
      .filter((item) => item.organization_id === orgId && !item.accepted_at)
      .map((item) => ({ id: item.id, email: item.email, role: item.role, token: item.token, expiresAt: item.expires_at })),
    pipelines: store.pipelines
      .filter((item) => item.organization_id === orgId && !item.archived)
      .sort((a, b) => a.position - b.position)
      .map((pipeline) => ({
        ...pipeline,
        stages: store.stages.filter((stage) => stage.pipeline_id === pipeline.id).sort((a, b) => a.position - b.position),
      })),
    tags: store.tags.filter((item) => item.organization_id === orgId),
    reasons: store.lost_reasons.filter((item) => item.organization_id === orgId),
    audit: store.audit_logs
      .filter((item) => item.organization_id === orgId)
      .slice(0, 40)
      .map((item) => ({ ...item, actor: personName(store, item.user_id) })),
    products: store.products.filter((item) => item.organization_id === orgId),
  };
}

export function relatedDeals(store: Store, session: Session, kind: "contact" | "company", id: string) {
  return store.deals
    .filter((deal) => deal.organization_id === session.organizationId && (kind === "contact" ? deal.primary_contact_id === id : deal.company_id === id))
    .map((deal) => toBoardDeal(store, session, deal.id))
    .filter((deal): deal is BoardDeal => Boolean(deal));
}

export function entityNotes(store: Store, kind: "contact" | "company", id: string) {
  return store.notes
    .filter((note) => (kind === "contact" ? note.contact_id === id : note.company_id === id))
    .map((note) => ({ id: note.id, body: note.body, author: personName(store, note.created_by), createdAt: note.created_at }));
}
