"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RotateCcw,
  Star,
  Tag,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  applyLineTotalAction,
  deleteDealAction,
  deleteLineAction,
  markLostAction,
  markWonAction,
  restoreDealAction,
  addNoteAction,
  saveLineAction,
  setDealContactRoleAction,
  updateDealAction,
} from "@/lib/actions/crm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/i18n/locale";
import { CLIENT_TYPES, isClientType, type ClientType } from "@/lib/client-type";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import { daysUntil, formatCompact, formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { DealDetailData } from "@/types/view";
import { DealSidebar, type ComposerTab } from "@/components/deal/deal-sidebar";
import { InlineInput, InlineSelect } from "@/components/deal/inline-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/dropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsPanel, type FileRow } from "@/components/attachments-panel";
import { CustomFieldsPanel, type ExtraField } from "@/components/custom-fields-panel";

type DealPatch = {
  title?: string;
  value?: number;
  probabilityOverride?: number | null;
  expectedCloseDate?: string | null;
  priority?: number;
  companyId?: string | null;
  ownerCompanyId?: string | null;
  consultantCompanyId?: string | null;
  contractorCompanyId?: string | null;
  projectCity?: string | null;
  projectProvince?: string | null;
  contactId?: string | null;
  ownerId?: string;
  tagIds?: string[];
  description?: string | null;
  stageId?: string;
};

const VAT = 0.11;

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

function Kpi({ label, children, hint, tone }: { label: string; children: React.ReactNode; hint?: React.ReactNode; tone?: "danger" | "muted" }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-lg font-semibold tracking-tight">{children}</div>
      {hint ? <p className={cn("mt-0.5 text-xs", tone === "danger" ? "font-medium text-destructive" : "text-muted-foreground")}>{hint}</p> : null}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3">
      <dt className="py-2 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function PartyRow({
  label,
  type,
  companyId,
  companies,
  canEdit,
  empty,
  onSave,
}: {
  label: string;
  type: ClientType;
  companyId: string | null;
  companies: { id: string; name: string; clientType: ClientType }[];
  canEdit: boolean;
  empty: string;
  onSave: (companyId: string | null) => Promise<boolean>;
}) {
  const options = companies.filter((item) => item.clientType === type);
  return (
    <InfoRow label={label}>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <InlineSelect value={companyId} options={options} canEdit={canEdit} onSave={onSave} />
        </div>
        {companyId ? (
          <IconLink href={`/companies/${companyId}`} label={label}>
            <Building2 className="h-3.5 w-3.5" />
          </IconLink>
        ) : (
          <span className="sr-only">{empty}</span>
        )}
      </div>
    </InfoRow>
  );
}

function IconLink({ href, label, children, external }: { href: string; label: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </a>
  );
}

export function DealWorkspace({
  deal,
  locale,
  files = [],
  fields = [],
}: {
  deal: DealDetailData;
  locale: AppLocale;
  files?: FileRow[];
  fields?: ExtraField[];
}) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const tk = useTranslations("companies");
  const router = useRouter();
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [lostOpen, setLostOpen] = useState(false);
  const [reason, setReason] = useState(deal.lostReasons[0]?.id ?? "");
  const [lostNote, setLostNote] = useState("");
  const [composer, setComposer] = useState<ComposerTab>("note");
  const [description, setDescription] = useState(deal.description ?? "");

  useEffect(() => setDescription(deal.description ?? ""), [deal.description]);

  async function patch(fields: DealPatch, undo?: DealPatch, message?: string) {
    setSaving("saving");
    const result = await updateDealAction(deal.id, fields);
    if (!result.ok) {
      setSaving("idle");
      toast.error(result.error);
      return false;
    }
    setSaving("saved");
    if (undo) {
      toast.success(message ?? t("saved"), { action: { label: t("undo"), onClick: () => void patch(undo) } });
    }
    router.refresh();
    return true;
  }

  async function run(action: Promise<{ ok: boolean; error?: string }>) {
    setSaving("saving");
    const result = await action;
    setSaving(result.ok ? "saved" : "idle");
    if (!result.ok) toast.error(result.error ?? tc("error"));
    else router.refresh();
    return result.ok;
  }

  // Keyboard shortcuts (ignored while typing).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "j" && deal.nav.nextId) router.push(`/deals/${deal.nav.nextId}`);
      else if (key === "k" && deal.nav.prevId) router.push(`/deals/${deal.nav.prevId}`);
      else if (key === "w" && deal.canEdit && deal.status !== "won") void run(markWonAction(deal.id));
      else if (key === "l" && deal.canEdit && deal.status !== "lost") setLostOpen(true);
      else if (key === "a" && deal.canEdit) {
        setComposer("activity");
        document.getElementById("deal-composer")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // run/patch are recreated each render; the deal fields below are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, deal.nav.nextId, deal.nav.prevId, deal.canEdit, deal.status, router]);

  const openStages = deal.stages.filter((stage) => stage.type === "open");
  const currentIndex = openStages.findIndex((stage) => stage.id === deal.stageId);
  const stageDefault = deal.stages.find((stage) => stage.id === deal.stageId)?.probability ?? 0;
  const closeIn = deal.expectedCloseDate ? daysUntil(deal.expectedCloseDate) : null;
  const closeOverdue = closeIn !== null && closeIn < 0 && deal.status === "open";
  const nextMeeting = deal.activities
    .filter((item) => !item.doneAt && item.type === "meeting" && new Date(item.dueAt).getTime() >= Date.now())
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const contactOptions = deal.contacts
    .filter((item) => !deal.companyId || item.companyId === deal.companyId || item.id === deal.contactId)
    .map((item) => ({ id: item.id, name: item.name }));
  const tax = deal.lineTotal * VAT;

  function duration(ms: number) {
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 1) return t("durNow");
    if (minutes < 60) return t("durMinutes", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("durHours", { n: hours });
    return t("durDays", { n: Math.floor(hours / 24) });
  }

  async function copy(value: string, message = t("copiedValue")) {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  }

  return (
    <div className="-mx-3 -my-4 grid h-[calc(100dvh-3.5rem)] grid-cols-1 md:-mx-6 md:-mb-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
      {/* Main column */}
      <div className="min-h-0 overflow-y-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 border-b bg-background/90 px-6 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
              <Link href={`/pipelines/${deal.pipelineId}`} className="truncate hover:text-foreground hover:underline">
                {tc("pipeline")} {deal.pipelineName}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-foreground">{deal.title}</span>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <span className="w-20 text-right text-xs text-muted-foreground" aria-live="polite">
                {saving === "saving" ? t("saving") : saving === "saved" ? t("saved") : ""}
              </span>
              <div className="flex items-center rounded-md border bg-card">
                <button
                  type="button"
                  disabled={!deal.nav.prevId}
                  title={t("prevDeal")}
                  aria-label={t("prevDeal")}
                  onClick={() => deal.nav.prevId && router.push(`/deals/${deal.nav.prevId}`)}
                  className="grid h-8 w-8 place-items-center rounded-l-md hover:bg-accent disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-14 px-1 text-center text-xs tabular-nums text-muted-foreground">
                  {t("navPosition", { index: deal.nav.index, total: deal.nav.total })}
                </span>
                <button
                  type="button"
                  disabled={!deal.nav.nextId}
                  title={t("nextDeal")}
                  aria-label={t("nextDeal")}
                  onClick={() => deal.nav.nextId && router.push(`/deals/${deal.nav.nextId}`)}
                  className="grid h-8 w-8 place-items-center rounded-r-md hover:bg-accent disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {deal.canEdit && deal.status === "open" ? (
                <>
                  <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => void run(markWonAction(deal.id))}>
                    <Trophy className="h-3.5 w-3.5" /> {tc("won")}
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setLostOpen(true)}>
                    <XCircle className="h-3.5 w-3.5" /> {tc("lost")}
                  </Button>
                </>
              ) : null}
              {deal.canEdit && deal.status !== "open" ? (
                <Button size="sm" variant="outline" onClick={() => void run(restoreDealAction(deal.id))}>
                  <RotateCcw className="h-3.5 w-3.5" /> {tc("restore")}
                </Button>
              ) : null}
              <Menu>
                <MenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("more")}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => void copy(window.location.href, tc("copied"))}>
                    <Link2 className="h-4 w-4" /> {t("copyLink")}
                  </MenuItem>
                  {deal.canEdit ? (
                    <MenuItem
                      className="text-destructive"
                      onSelect={() => {
                        if (!window.confirm(t("confirmDelete"))) return;
                        void run(deleteDealAction(deal.id)).then((ok) => ok && router.push(`/pipelines/${deal.pipelineId}`));
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> {t("deleteDeal")}
                    </MenuItem>
                  ) : null}
                </MenuContent>
              </Menu>
            </div>
          </div>
        </header>

        <div className="grid gap-5 px-6 py-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <InlineInput
                value={deal.title}
                canEdit={deal.canEdit}
                onSave={(title) => (title.trim().length >= 2 ? patch({ title: title.trim() }) : Promise.resolve(false))}
                className="text-2xl font-semibold tracking-tight"
                inputClassName="h-11 text-2xl font-semibold"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    deal.status === "won" && "bg-success/15 text-success",
                    deal.status === "lost" && "bg-destructive/15 text-destructive",
                    deal.status === "open" && "bg-primary/15 text-primary",
                  )}
                >
                  {tc(deal.status)}
                </span>
                {deal.ownedBy ? <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">{t("ownedBy", { name: deal.ownedBy })}</span> : null}
                {deal.rotting ? <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning">{t("stale")}</span> : null}
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground">
                  <Users className="h-3 w-3" /> {t("relatedDeals", { count: deal.relatedCount })}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {nextMeeting ? t("nextMeeting", { date: formatDateTime(nextMeeting.dueAt, locale) }) : t("noMeeting")}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2" title={deal.ownerName}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(deal.ownerName)}</span>
            </div>
          </div>

          {/* Stage bar */}
          {deal.status === "open" ? (
            <ol className="flex w-full overflow-hidden rounded-lg border bg-card" aria-label={t("stageBar")}>
              {openStages.map((stage, index) => {
                const active = stage.id === deal.stageId;
                const passed = index < currentIndex;
                const time = deal.stageTimes[stage.id];
                return (
                  <li key={stage.id} className="relative min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={!deal.canEdit || active}
                      title={time ? `${stage.name} · ${t("enteredAt", { date: formatDateTime(time.enteredAt, locale) })}` : stage.name}
                      onClick={() => {
                        const previous = deal.stageId;
                        void patch({ stageId: stage.id }, { stageId: previous }, t("movedTo", { stage: stage.name }));
                      }}
                      className={cn(
                        "flex h-12 w-full flex-col items-center justify-center px-4 text-center transition-colors [clip-path:polygon(0_0,calc(100%-12px)_0,100%_50%,calc(100%-12px)_100%,0_100%,12px_50%)]",
                        index === 0 && "[clip-path:polygon(0_0,calc(100%-12px)_0,100%_50%,calc(100%-12px)_100%,0_100%)]",
                        active && "bg-primary text-primary-foreground",
                        passed && "bg-primary/15 text-foreground",
                        !active && !passed && "text-muted-foreground",
                        deal.canEdit && !active && "hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="w-full truncate text-sm font-medium">{stage.name}</span>
                      {time ? (
                        <span className={cn("text-[11px] tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{duration(time.ms)}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                deal.status === "won" ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10",
              )}
            >
              {deal.status === "won" ? <Trophy className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
              <span className="font-medium">
                {tc(deal.status)} · {formatDate(deal.status === "won" ? deal.wonAt : deal.lostAt, locale)}
              </span>
              {deal.status === "lost" && deal.lostReason ? <span className="text-muted-foreground">— {deal.lostReason}</span> : null}
            </div>
          )}

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label={t("kpiValue")}>
              <InlineInput
                type="number"
                min={0}
                value={String(deal.value)}
                display={<span className="money whitespace-nowrap">{formatRupiah(deal.value)}</span>}
                canEdit={deal.canEdit}
                onSave={(next) => patch({ value: Math.max(0, Number(next) || 0) })}
              />
            </Kpi>
            <Kpi
              label={t("kpiProbability")}
              hint={
                deal.probabilityOverride === null ? (
                  t("fromStage", { value: stageDefault })
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {t("overridden")}
                    {deal.canEdit ? (
                      <button type="button" className="text-primary hover:underline" onClick={() => void patch({ probabilityOverride: null })}>
                        {t("resetProbability")}
                      </button>
                    ) : null}
                  </span>
                )
              }
            >
              <InlineInput
                type="number"
                min={0}
                max={100}
                value={String(deal.probability)}
                display={`${deal.probability}%`}
                canEdit={deal.canEdit}
                onSave={(next) => {
                  const value = Math.min(100, Math.max(0, Math.round(Number(next))));
                  return patch({ probabilityOverride: Number.isFinite(value) && next !== "" ? value : null });
                }}
              />
            </Kpi>
            <Kpi label={t("kpiWeighted")} hint={t("kpiWeightedHint")}>
              <p className="money min-h-9 py-1.5">{formatRupiah(deal.weighted)}</p>
            </Kpi>
            <Kpi
              label={t("kpiClose")}
              tone={closeOverdue ? "danger" : undefined}
              hint={
                closeIn === null || deal.status !== "open"
                  ? undefined
                  : closeIn === 0
                    ? t("dueToday")
                    : closeIn > 0
                      ? t("daysLeft", { count: closeIn })
                      : t("daysOverdue", { count: -closeIn })
              }
            >
              <InlineInput
                type="date"
                value={deal.expectedCloseDate?.slice(0, 10) ?? ""}
                display={formatDate(deal.expectedCloseDate, locale)}
                canEdit={deal.canEdit}
                onSave={(next) => patch({ expectedCloseDate: next || null })}
              />
            </Kpi>
          </div>

          {/* Priority + tags */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center" role="radiogroup" aria-label={tc("priority")}>
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={deal.priority === level}
                  disabled={!deal.canEdit}
                  aria-label={t("stars", { count: level })}
                  title={t("stars", { count: level })}
                  onClick={() => void patch({ priority: deal.priority === level ? 0 : level })}
                  className="rounded p-0.5 disabled:cursor-default"
                >
                  <Star className={cn("h-5 w-5", level <= deal.priority ? "fill-warning text-warning" : "text-muted-foreground/50")} />
                </button>
              ))}
            </div>
            <span className="h-5 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-1.5">
              {deal.tags.map((tag) => (
                <span key={tag.id} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${tag.color}26`, color: tag.color }}>
                  {tag.name}
                </span>
              ))}
              {deal.canEdit ? (
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent">
                      <Tag className="h-3 w-3" /> {t("addTag")}
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content sideOffset={6} align="start" className="z-50 w-52 rounded-md border bg-popover p-1 text-sm shadow-lg">
                      {deal.allTags.map((tag) => {
                        const selected = deal.tags.some((item) => item.id === tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const ids = deal.tags.map((item) => item.id);
                              void patch({ tagIds: selected ? ids.filter((id) => id !== tag.id) : [...ids, tag.id] });
                            }}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            <span className="flex-1 text-left">{tag.name}</span>
                            {selected ? <span className="text-primary">✓</span> : null}
                          </button>
                        );
                      })}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              ) : null}
            </div>
          </div>

          {/* Info grid */}
          <section className="grid gap-x-10 gap-y-1 rounded-lg border bg-card px-5 py-4 xl:grid-cols-2">
            <dl className="grid content-start gap-1">
              <PartyRow
                label={tk("types.owner")}
                type="owner"
                companyId={deal.ownerCompanyId}
                companies={deal.companies}
                canEdit={deal.canEdit}
                empty={t("notSet")}
                onSave={(ownerCompanyId) => patch({ ownerCompanyId })}
              />
              <PartyRow
                label={tk("types.konsultan")}
                type="konsultan"
                companyId={deal.consultantCompanyId}
                companies={deal.companies}
                canEdit={deal.canEdit}
                empty={t("notSet")}
                onSave={(consultantCompanyId) => patch({ consultantCompanyId })}
              />
              <PartyRow
                label={tk("types.kontraktor")}
                type="kontraktor"
                companyId={deal.contractorCompanyId}
                companies={deal.companies}
                canEdit={deal.canEdit}
                empty={t("notSet")}
                onSave={(contractorCompanyId) => patch({ contractorCompanyId })}
              />
              <InfoRow label={t("projectCity")}>
                <InlineInput value={deal.projectCity ?? ""} canEdit={deal.canEdit} onSave={(projectCity) => patch({ projectCity: projectCity.trim() || null })} />
              </InfoRow>
              <InfoRow label={t("projectProvince")}>
                <InlineSelect
                  value={deal.projectProvince}
                  options={INDONESIA_PROVINCES.map((name) => ({ id: name, name }))}
                  canEdit={deal.canEdit}
                  onSave={(projectProvince) => patch({ projectProvince })}
                />
              </InfoRow>
              <InfoRow label={tc("contact")}>
                <InlineSelect value={deal.contactId} options={contactOptions} canEdit={deal.canEdit} onSave={(contactId) => patch({ contactId })} />
                {deal.primaryContact?.jobTitle ? <p className="-mt-1 pb-1 text-xs text-muted-foreground">{deal.primaryContact.jobTitle}</p> : null}
              </InfoRow>
              <InfoRow label={tc("email")}>
                {deal.primaryContact?.email ? (
                  <div className="flex min-h-9 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate">{deal.primaryContact.email}</span>
                    <IconLink href={`mailto:${deal.primaryContact.email}`} label={tc("email")}><Mail className="h-3.5 w-3.5" /></IconLink>
                    <button type="button" title={t("copy")} aria-label={t("copy")} onClick={() => void copy(deal.primaryContact?.email ?? "")} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="block py-2 text-muted-foreground/80">{t("notSet")}</span>
                )}
              </InfoRow>
              <InfoRow label={tc("phone")}>
                {deal.primaryContact?.phone || deal.primaryContact?.whatsapp ? (
                  <div className="flex min-h-9 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate tabular-nums">{deal.primaryContact.phone ?? deal.primaryContact.whatsapp}</span>
                    {deal.primaryContact.phone ? (
                      <IconLink href={`tel:${deal.primaryContact.phone}`} label={t("call")}><Phone className="h-3.5 w-3.5" /></IconLink>
                    ) : null}
                    {deal.primaryContact.whatsapp || deal.primaryContact.phone ? (
                      <IconLink
                        external
                        href={`https://wa.me/${(deal.primaryContact.whatsapp ?? deal.primaryContact.phone ?? "").replace(/\D/g, "").replace(/^0/, "62")}`}
                        label="WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </IconLink>
                    ) : null}
                    <button type="button" title={t("copy")} aria-label={t("copy")} onClick={() => void copy(deal.primaryContact?.phone ?? deal.primaryContact?.whatsapp ?? "")} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="block py-2 text-muted-foreground/80">{t("notSet")}</span>
                )}
              </InfoRow>
            </dl>
            <dl className="grid content-start gap-1">
              <InfoRow label={t("salesperson")}>
                <InlineSelect
                  value={deal.ownerId}
                  options={deal.owners}
                  allowEmpty={false}
                  canEdit={deal.canEdit && deal.canManage}
                  onSave={(ownerId) => (ownerId ? patch({ ownerId }) : Promise.resolve(false))}
                  display={
                    <span className="inline-flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{initials(deal.ownerName)}</span>
                      {deal.ownerName}
                    </span>
                  }
                />
              </InfoRow>
              <InfoRow label={tc("pipeline")}>
                <span className="block py-2">{deal.pipelineName}</span>
              </InfoRow>
              <InfoRow label={t("source")}>
                <span className={cn("block py-2", !deal.source && "text-muted-foreground/80")}>{deal.source ?? t("notSet")}</span>
              </InfoRow>
              <InfoRow label={t("created")}>
                <span className="block py-2 text-muted-foreground">
                  {t("createdBy", { date: formatDate(deal.createdAt, locale), name: deal.createdByName })}
                </span>
              </InfoRow>
            </dl>
          </section>

          {/* Tabs */}
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">{t("tabDescription")}</TabsTrigger>
              <TabsTrigger value="products">
                {t("products")}
                {deal.lines.length ? <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[11px]">{deal.lines.length}</span> : null}
              </TabsTrigger>
              <TabsTrigger value="contacts">
                {t("tabContacts")}
                {deal.related.length ? <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[11px]">{deal.related.length}</span> : null}
              </TabsTrigger>
              <TabsTrigger value="files">{t("tabFiles")}</TabsTrigger>
              <TabsTrigger value="extra">{t("tabExtra")}</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-3">
              <Textarea
                value={description}
                readOnly={!deal.canEdit}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => {
                  if (description !== (deal.description ?? "")) void patch({ description: description || null });
                }}
                placeholder={t("descriptionPlaceholder")}
                className="min-h-40 resize-y leading-6"
              />
            </TabsContent>

            <TabsContent value="products" className="mt-3 overflow-hidden rounded-lg border bg-card">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t("products")}</th>
                    <th className="w-20 px-2 py-2 text-right font-medium">{t("qty")}</th>
                    <th className="w-40 px-2 py-2 text-right font-medium">{t("unitPrice")}</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">{t("discount")}</th>
                    <th className="w-40 px-4 py-2 text-right font-medium">{t("subtotal")}</th>
                    {deal.canEdit ? <th className="w-10" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {deal.lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">{t("noProducts")}</td>
                    </tr>
                  ) : null}
                  {deal.lines.map((line) => (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2.5">{line.name}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{line.qty}</td>
                      <td className="money px-2 py-2.5 text-right">{formatRupiah(line.unitPrice)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{line.discount}%</td>
                      <td className="money px-4 py-2.5 text-right font-medium">{formatRupiah(line.subtotal)}</td>
                      {deal.canEdit ? (
                        <td className="pr-2 text-right">
                          <button type="button" aria-label={tc("delete")} onClick={() => void run(deleteLineAction(line.id))} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {deal.canEdit && deal.catalog.length > 0 ? (
                <form
                  className="grid grid-cols-1 items-center gap-2 border-t bg-muted/30 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_5rem_10rem_6rem_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    void run(
                      saveLineAction({
                        dealId: deal.id,
                        productId: String(data.get("productId")),
                        qty: Number(data.get("qty") ?? 1),
                        unitPrice: Number(data.get("unitPrice") ?? 0),
                        discountPct: Number(data.get("discount") ?? 0),
                      }),
                    ).then((ok) => ok && form.reset());
                  }}
                >
                  <Select
                    name="productId"
                    required
                    defaultValue={deal.catalog[0]?.id}
                    className="h-8"
                    onChange={(event) => {
                      const product = deal.catalog.find((item) => item.id === event.target.value);
                      const price = event.currentTarget.form?.elements.namedItem("unitPrice");
                      if (product && price instanceof HTMLInputElement) price.value = String(product.unitPrice);
                    }}
                  >
                    {deal.catalog.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </Select>
                  <Input name="qty" type="number" min={1} step="any" defaultValue={1} aria-label={t("qty")} className="h-8 text-right" />
                  <Input name="unitPrice" type="number" min={0} defaultValue={deal.catalog[0]?.unitPrice ?? 0} aria-label={t("unitPrice")} className="h-8 text-right" />
                  <Input name="discount" type="number" min={0} max={100} defaultValue={0} aria-label={t("discount")} className="h-8 text-right" />
                  <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /> {t("addProduct")}</Button>
                </form>
              ) : null}
              <div className="grid gap-1 border-t px-4 py-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>{t("lineTotal")}</span><span className="money">{formatRupiah(deal.lineTotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>{t("tax")}</span><span className="money">{formatRupiah(tax)}</span></div>
                <div className="flex justify-between font-semibold"><span>{t("grandTotal")}</span><span className="money">{formatRupiah(deal.lineTotal + tax)}</span></div>
                {deal.canEdit && deal.lines.length > 0 && deal.lineTotal !== deal.value ? (
                  <Button className="mt-2 justify-self-end" size="sm" variant="outline" onClick={() => void run(applyLineTotalAction(deal.id))}>
                    {t("applyValue")} ({formatCompact(deal.lineTotal)})
                  </Button>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-3">
              {deal.related.length === 0 ? <p className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">{t("noContacts")}</p> : null}
              <ul className="grid gap-3 xl:grid-cols-2">
                {deal.related.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{initials(person.name)}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/contacts/${person.id}`} className="block truncate text-sm font-medium hover:underline">{person.name}</Link>
                      {deal.canEdit ? (
                        <Select
                          className="mt-1 h-8"
                          aria-label={tk("clientType")}
                          value={person.role ?? ""}
                          onChange={(event) => {
                            const role = event.target.value;
                            void run(setDealContactRoleAction(person.linkId, isClientType(role) ? role : null));
                          }}
                        >
                          <option value="">—</option>
                          {CLIENT_TYPES.map((type) => <option key={type} value={type}>{tk(`types.${type}`)}</option>)}
                        </Select>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">{isClientType(person.role) ? tk(`types.${person.role}`) : person.email ?? person.phone ?? "—"}</p>
                      )}
                    </div>
                    {person.phone ? <IconLink href={`tel:${person.phone}`} label={t("call")}><Phone className="h-3.5 w-3.5" /></IconLink> : null}
                    {person.whatsapp ? (
                      <IconLink external href={`https://wa.me/${person.whatsapp.replace(/\D/g, "").replace(/^0/, "62")}`} label="WhatsApp">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </IconLink>
                    ) : null}
                    {person.email ? <IconLink href={`mailto:${person.email}`} label={tc("email")}><Mail className="h-3.5 w-3.5" /></IconLink> : null}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="files" className="mt-3">
              <AttachmentsPanel files={files} dealId={deal.id} canEdit={deal.canEdit} />
            </TabsContent>
            <TabsContent value="extra" className="mt-3">
              <CustomFieldsPanel entityId={deal.id} fields={fields} canEdit={deal.canEdit} />
            </TabsContent>
          </Tabs>

          <p className="pb-2 text-xs text-muted-foreground">{t("shortcuts")}</p>
        </div>
      </div>

      {/* Activity panel */}
      <aside className="min-h-0 overflow-y-auto border-l bg-muted/20">
        <DealSidebar deal={deal} locale={locale} composer={composer} onComposerChange={setComposer} />
      </aside>

      <Dialog open={lostOpen} onOpenChange={setLostOpen} title={t("lostTitle")}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const note = lostNote.trim();
            void run(markLostAction(deal.id, reason)).then(async (ok) => {
              if (!ok) return;
              if (note) await run(addNoteAction({ body: note, dealId: deal.id, contactId: null, companyId: null }));
              setLostOpen(false);
              setLostNote("");
            });
          }}
        >
          <Field label={t("lostReason")}>
            <Select value={reason} onChange={(event) => setReason(event.target.value)} required>
              {deal.lostReasons.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("notes")}>
            <Textarea value={lostNote} onChange={(event) => setLostNote(event.target.value)} rows={3} />
          </Field>
          <Button type="submit" variant="destructive">{t("lostTitle")}</Button>
        </form>
      </Dialog>
    </div>
  );
}
