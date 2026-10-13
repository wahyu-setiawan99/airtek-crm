"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, Plus, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteDealAction, markWonAction, moveDealAction, quickDealAction, saveViewAction } from "@/lib/actions/crm";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppLocale } from "@/i18n/locale";
import { formatCompact, formatDate, formatMonth, jakartaParts } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { BoardDeal, BoardStage, PipelineData } from "@/types/view";
import { DealDialog } from "@/components/deal-dialog";
import { FilterBar, matchDeal, type FilterValues } from "@/components/filters/filter-bar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";

type Filters = FilterValues & { q: string; owner: string; tag: string; mine: boolean; view: string };

export function PipelineBoard({
  data,
  locale,
  filters,
}: {
  data: PipelineData;
  locale: AppLocale;
  filters: Filters;
}) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [stages, setStages] = useState(data.stages);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(filters.view === "new" || false);
  const [editing, setEditing] = useState<BoardDeal | null>(null);
  const [lost, setLost] = useState<{ dealId: string; next: BoardStage[]; reason: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewName, setViewName] = useState("");
  const [quick, setQuick] = useState<string | null>(null);

  useEffect(() => {
    setStages(data.stages);
  }, [data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setCreating(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const visible = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      deals: stage.deals.filter((deal) => matchDeal(deal, filters, data.me.id)),
    }));
  }, [stages, filters, data.me.id]);

  function pushFilters(next: Partial<Filters> & { view?: string }) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.view && merged.view !== "kanban") params.set("view", merged.view);
    const keys = ["q", "owner", "tag", "priority", "valueMin", "valueMax", "condition", "client", "party", "project", "closeFrom", "closeTo", "createdFrom", "createdTo"] as const;
    for (const key of keys) {
      const value = merged[key];
      if (typeof value === "string" && value) params.set(key, value);
    }
    if (merged.mine) params.set("mine", "1");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const move = useMutation({
    mutationFn: moveDealAction,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        setStages(data.stages);
      } else router.refresh();
    },
  });

  function commit(next: BoardStage[], lostReasonId: string | null, dealId: string, toStageId: string) {
    const snapshot = stages;
    setStages(next);
    move.mutate(
      {
        pipelineId: data.pipeline.id,
        dealId,
        toStageId,
        columns: next.map((stage) => ({ stageId: stage.id, dealIds: stage.deals.map((deal) => deal.id) })),
        lostReasonId,
      },
      {
        onSuccess: (result) => {
          if (!result.ok) setStages(snapshot);
        },
      },
    );
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over ? String(event.over.id) : "";
    const active = String(event.active.id);
    if (!overId || overId === active) return;
    const next = relocate(stages, active, overId);
    if (!next) return;
    const dest = next.find((stage) => stage.deals.some((deal) => deal.id === active));
    const source = stages.find((stage) => stage.deals.some((deal) => deal.id === active));
    if (!dest || !source) return;
    if (dest.type === "lost" && dest.id !== source.id) {
      setLost({ dealId: active, next, reason: data.lostReasons[0]?.id ?? "" });
      return;
    }
    commit(next, null, active, dest.id);
  }

  const activeDeal = stages.flatMap((stage) => stage.deals).find((deal) => deal.id === activeId) ?? null;
  const view = filters.view || "kanban";

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{data.pipeline.name}</h1>
            <Select
              className="h-8 w-auto"
              value={data.pipeline.id}
              aria-label={tc("pipeline")}
              onChange={(event) => router.push(`/pipelines/${event.target.value}`)}
            >
              {data.pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
              ))}
            </Select>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("dealCount", { count: visible.reduce((sum, stage) => sum + stage.deals.length, 0) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["kanban", "list", "calendar", "forecast"] as const).map((item) => (
            <Button key={item} size="sm" variant={view === item ? "default" : "outline"} onClick={() => pushFilters({ view: item })}>
              {t(item)}
            </Button>
          ))}
          {data.me.canCreate ? <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{t("addDeal")}</Button> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <FilterBar
          values={filters}
          owners={data.owners}
          tags={data.tags}
          extras={["priority", "value", "condition", "close", "created", "client", "party", "project"]}
          meId={data.me.id}
          multiOwner
          onChange={(next) => pushFilters({
            q: next.q ?? "",
            owner: next.owner ?? "",
            tag: next.tag ?? "",
            mine: Boolean(next.mine),
            priority: next.priority ?? "",
            valueMin: next.valueMin ?? "",
            valueMax: next.valueMax ?? "",
            condition: next.condition ?? "",
            client: next.client ?? "",
            closeFrom: next.closeFrom ?? "",
            closeTo: next.closeTo ?? "",
            createdFrom: next.createdFrom ?? "",
            createdTo: next.createdTo ?? "",
          })}
        />
        <div className="mt-2 hidden items-center gap-3 text-xs text-muted-foreground md:flex">
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-success" />{t("legendScheduled")}</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-destructive" />{t("legendOverdue")}</span>
          <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-warning" />{t("legendRotting")}</span>
        </div>
      </div>

      {data.savedViews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.savedViews.map((viewItem) => (
            <Button key={viewItem.id} size="sm" variant="outline" onClick={() => pushFilters({
              q: viewItem.filters.q ?? "",
              owner: viewItem.filters.owner ?? "",
              tag: viewItem.filters.tag ?? "",
              mine: Boolean(viewItem.filters.mine),
              view: viewItem.filters.view ?? "kanban",
            })}>
              {viewItem.name}
            </Button>
          ))}
        </div>
      ) : null}

      {view === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))} onDragEnd={onDragEnd}>
          <div className="kanban-scroll flex flex-1 gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
            {visible.map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                locale={locale}
                canCreate={data.me.canCreate}
                companies={data.companies}
                quickOpen={quick === stage.id}
                onQuick={() => setQuick(quick === stage.id ? null : stage.id)}
                onCreate={async (title, value, companyId) => {
                  const result = await quickDealAction({ title, value, companyId, pipelineId: data.pipeline.id, stageId: stage.id });
                  if (!result.ok) toast.error(result.error);
                  else {
                    setQuick(null);
                    router.refresh();
                  }
                }}
                onEdit={setEditing}
                onWon={async (dealId) => {
                  const result = await markWonAction(dealId);
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                }}
                onLost={(dealId) => {
                  const next = relocate(stages, dealId, `stage:${stages.find((item) => item.type === "lost")?.id ?? stage.id}`);
                  if (next) setLost({ dealId, next, reason: data.lostReasons[0]?.id ?? "" });
                }}
              />
            ))}
          </div>
          <DragOverlay>{activeDeal ? <DealCard deal={activeDeal} locale={locale} overlay /> : null}</DragOverlay>
        </DndContext>
      ) : null}

      {view === "list" ? (
        <ListView
          stages={visible}
          locale={locale}
          selected={selected}
          onToggle={(id, on) => setSelected((current) => on ? [...current, id] : current.filter((item) => item !== id))}
          onDelete={async () => {
            for (const id of selected) await deleteDealAction(id);
            setSelected([]);
            router.refresh();
          }}
        />
      ) : null}
      {view === "calendar" ? <CalendarView stages={visible} locale={locale} /> : null}
      {view === "forecast" ? <ForecastView stages={visible} locale={locale} /> : null}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void saveViewAction({
            pipelineId: data.pipeline.id,
            name: viewName,
            filters: { q: filters.q, owner: filters.owner, tag: filters.tag, mine: filters.mine, view },
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              setViewName("");
              router.refresh();
            }
          });
        }}
      >
        <Input value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder={t("viewName")} className="max-w-xs" />
        <Button type="submit" variant="outline" size="sm" disabled={viewName.trim().length < 2}>{t("saveView")}</Button>
      </form>

      <DealDialog
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        data={data}
        deal={editing}
      />
      <Dialog open={Boolean(lost)} onOpenChange={(open) => { if (!open) setLost(null); }} title={t("markLost")} description={t("lostReason")}>
        <Field label={t("chooseReason")}>
          <Select value={lost?.reason ?? ""} onChange={(event) => setLost((current) => current ? { ...current, reason: event.target.value } : current)}>
            {data.lostReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
          </Select>
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLost(null)}>{tc("cancel")}</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!lost?.reason) return;
              const dest = lost.next.find((stage) => stage.deals.some((deal) => deal.id === lost.dealId));
              if (!dest) return;
              commit(lost.next, lost.reason, lost.dealId, dest.id);
              setLost(null);
            }}
          >
            {t("confirmLost")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Column({
  stage,
  locale,
  canCreate,
  companies,
  quickOpen,
  onQuick,
  onCreate,
  onEdit,
  onWon,
  onLost,
}: {
  stage: BoardStage;
  locale: AppLocale;
  canCreate: boolean;
  companies: { id: string; name: string }[];
  quickOpen: boolean;
  onQuick: () => void;
  onCreate: (title: string, value: number, companyId: string | null) => Promise<void>;
  onEdit: (deal: BoardDeal) => void;
  onWon: (id: string) => void;
  onLost: (id: string) => void;
}) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  const total = stage.deals.reduce((sum, deal) => sum + deal.value, 0);
  const weighted = stage.deals.reduce((sum, deal) => sum + (stage.type === "open" ? deal.weighted : deal.value), 0);
  return (
    <section className={cn("flex w-[280px] shrink-0 snap-start flex-col rounded-xl bg-muted/70 p-2 md:w-[300px]", isOver && "ring-2 ring-primary")}>
      <header className="px-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold">{stage.name}</h2>
          <span className="text-xs text-muted-foreground">{stage.type === "lost" ? "0%" : `${stage.probability}%`}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("dealCount", { count: stage.deals.length })}</p>
        <p className="money text-sm font-semibold">{formatCompact(total)}</p>
        <p className="money text-xs text-primary">{tc("weighted")} {formatCompact(stage.type === "lost" ? 0 : weighted)}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
          <div className={cn("h-full", stage.type === "won" ? "bg-success" : stage.type === "lost" ? "bg-destructive" : "bg-primary")} style={{ width: `${stage.type === "lost" ? 8 : stage.probability}%` }} />
        </div>
      </header>
      {canCreate && stage.type === "open" ? (
        quickOpen ? (
          <form
            className="mb-2 grid gap-2 rounded-md border bg-card p-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const title = String(form.get("title") ?? "");
              const value = Number(form.get("value") ?? 0);
              const companyId = String(form.get("companyId") ?? "") || null;
              void onCreate(title, value, companyId);
              event.currentTarget.reset();
            }}
          >
            <Input name="title" required placeholder={t("titlePlaceholder")} aria-label={t("titlePlaceholder")} className="h-8" />
            <Input name="value" type="number" min={0} required placeholder="0" aria-label={tc("value")} className="h-8" />
            <Select name="companyId" className="h-8" defaultValue="" aria-label={tc("company")}>
              <option value="">{tc("company")}</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
            <Button type="submit" size="sm">{t("quickAdd")}</Button>
          </form>
        ) : (
          <button className="mb-2 flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-card" onClick={onQuick}>
            <Plus className="h-3.5 w-3.5" /> {t("quickAdd")}
          </button>
        )
      ) : null}
      <SortableContext items={stage.deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
          {stage.deals.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("emptyColumn")}</p> : null}
          {stage.deals.map((deal) => (
            <SortableDeal key={deal.id} deal={deal} locale={locale} onEdit={() => onEdit(deal)} onWon={() => onWon(deal.id)} onLost={() => onLost(deal.id)} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableDeal({ deal, locale, onEdit, onWon, onLost }: { deal: BoardDeal; locale: AppLocale; onEdit: () => void; onWon: () => void; onLost: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <DealCard deal={deal} locale={locale} onEdit={onEdit} onWon={onWon} onLost={onLost} />;
  }
  return <DraggableDeal deal={deal} locale={locale} onEdit={onEdit} onWon={onWon} onLost={onLost} />;
}

function DraggableDeal({ deal, locale, onEdit, onWon, onLost }: { deal: BoardDeal; locale: AppLocale; onEdit: () => void; onWon: () => void; onLost: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id, disabled: !deal.canEdit });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }} {...attributes}>
      <DealCard deal={deal} locale={locale} listeners={listeners} onEdit={onEdit} onWon={onWon} onLost={onLost} />
    </div>
  );
}

function DealCard({
  deal,
  locale,
  overlay = false,
  listeners,
  onEdit,
  onWon,
  onLost,
}: {
  deal: BoardDeal;
  locale: AppLocale;
  overlay?: boolean;
  listeners?: Record<string, unknown>;
  onEdit?: () => void;
  onWon?: () => void;
  onLost?: () => void;
}) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  return (
    <article className={cn("rounded-lg border bg-card p-3 shadow-sm", deal.rotting && "border-warning bg-warning/10", overlay && "shadow-xl")}>
      <div className="flex items-start gap-2">
        {deal.canEdit && listeners ? (
          <button className="mt-0.5 text-muted-foreground" aria-label={t("drag")} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/deals/${deal.id}`} className="truncate text-sm font-medium hover:underline">{deal.title}</Link>
            {deal.ownedBy ? <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tc("ownedBy", { name: deal.ownedBy })}</span> : null}
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", deal.activityStatus === "scheduled" && "bg-success", deal.activityStatus === "overdue" && "bg-destructive", deal.activityStatus === "none" && "bg-muted-foreground/40")} />
          </div>
          <p className="money mt-1 text-sm font-semibold">{formatCompact(deal.value)}</p>
          <p className="truncate text-xs text-muted-foreground">{deal.companyName ?? "—"}{deal.contactName ? ` · ${deal.contactName}` : ""}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {deal.tags.map((tag) => (
              <span key={tag.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>{tag.name}</span>
            ))}
            {deal.rotting ? <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">{t("legendRotting")}</span> : null}
            <span className="ml-auto inline-flex text-warning">
              {Array.from({ length: 3 }).map((_, index) => (
                <Star key={index} className={cn("h-3 w-3", index < deal.priority ? "fill-current" : "opacity-30")} />
              ))}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate, locale) : t("noClose")}</span>
            <span className="inline-flex items-center gap-1" title={deal.ownerName}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{initials(deal.ownerName)}</span>
              <span className="text-[11px] text-muted-foreground">{deal.ownerName.split(" ")[0]}</span>
            </span>
          </div>
          {deal.canEdit && onEdit ? (
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={onEdit}>{tc("edit")}</Button>
              {deal.status === "open" ? <Button size="sm" variant="ghost" onClick={onWon}>{t("markWon")}</Button> : null}
              {deal.status === "open" ? <Button size="sm" variant="ghost" onClick={onLost}>{t("markLost")}</Button> : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ListView({
  stages,
  locale,
  selected,
  onToggle,
  onDelete,
}: {
  stages: BoardStage[];
  locale: AppLocale;
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const deals = stages.flatMap((stage) => stage.deals.map((deal) => ({ ...deal, stageName: stage.name })));
  if (deals.length === 0) return <p className="text-sm text-muted-foreground">{t("noDeals")}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      {selected.length > 0 ? (
        <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
          <span>{t("selected", { count: selected.length })}</span>
          <Button size="sm" variant="destructive" onClick={onDelete}>{t("bulkDelete")}</Button>
        </div>
      ) : null}
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3" />
            <th className="p-3">{tc("name")}</th>
            <th className="p-3">{tc("company")}</th>
            <th className="p-3">{tc("stage")}</th>
            <th className="p-3">{tc("value")}</th>
            <th className="p-3">{tc("weighted")}</th>
            <th className="p-3">{tc("owner")}</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-t">
              <td className="p-3">
                <input type="checkbox" checked={selected.includes(deal.id)} onChange={(event) => onToggle(deal.id, event.target.checked)} aria-label={deal.title} />
              </td>
              <td className="p-3 font-medium"><Link href={`/deals/${deal.id}`} className="hover:underline">{deal.title}</Link></td>
              <td className="p-3">{deal.companyName ?? "—"}</td>
              <td className="p-3">{deal.stageName}</td>
              <td className="money p-3">{formatCompact(deal.value)}</td>
              <td className="money p-3">{formatCompact(deal.weighted)}</td>
              <td className="p-3">{deal.ownerName}</td>
              <td className="p-3 text-xs text-muted-foreground">{formatDate(deal.expectedCloseDate, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ stages, locale }: { stages: BoardStage[]; locale: AppLocale }) {
  const [cursor, setCursor] = useState(() => jakartaParts());
  const deals = stages.flatMap((stage) => stage.deals);
  const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
  const start = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const cells = [...Array.from({ length: start }, () => 0), ...Array.from({ length: days }, (_, index) => index + 1)];
  const label = formatMonth(`${cursor.year}-${String(cursor.month).padStart(2, "0")}`, locale);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => setCursor((current) => shiftMonth(current, -1))}>‹</Button>
        <p className="text-sm font-medium capitalize">{label}</p>
        <Button size="sm" variant="outline" onClick={() => setCursor((current) => shiftMonth(current, 1))}>›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {cells.map((day, index) => {
          const dayDeals = day === 0 ? [] : deals.filter((deal) => {
            if (!deal.expectedCloseDate) return false;
            const parts = jakartaParts(new Date(deal.expectedCloseDate));
            return parts.year === cursor.year && parts.month === cursor.month && parts.day === day;
          });
          return (
            <div key={index} className="min-h-20 rounded-md border bg-background p-1">
              <span className="text-muted-foreground">{day || ""}</span>
              {dayDeals.slice(0, 2).map((deal) => (
                <Link key={deal.id} href={`/deals/${deal.id}`} className="mt-1 block truncate rounded bg-primary/10 px-1 text-[10px] text-primary">{deal.title}</Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForecastView({ stages, locale }: { stages: BoardStage[]; locale: AppLocale }) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const open = stages.filter((stage) => stage.type === "open").flatMap((stage) => stage.deals);
  const months = Array.from({ length: 6 }, (_, index) => {
    const parts = shiftMonth(jakartaParts(), index);
    const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const deals = open.filter((deal) => deal.expectedCloseDate && jakartaParts(new Date(deal.expectedCloseDate)).year === parts.year && jakartaParts(new Date(deal.expectedCloseDate)).month === parts.month);
    return { key, deals };
  });
  return (
    <div className="kanban-scroll flex gap-3 overflow-x-auto">
      {months.map((month) => (
        <section key={month.key} className="w-64 shrink-0 rounded-xl bg-muted/70 p-3">
          <h2 className="text-sm font-semibold capitalize">{formatMonth(month.key, locale)}</h2>
          <p className="money text-sm">{formatCompact(month.deals.reduce((sum, deal) => sum + deal.value, 0))}</p>
          <p className="money text-xs text-primary">{tc("weighted")} {formatCompact(month.deals.reduce((sum, deal) => sum + deal.weighted, 0))}</p>
          <div className="mt-3 space-y-2">
            {month.deals.length === 0 ? <p className="text-xs text-muted-foreground">{t("noDeals")}</p> : null}
            {month.deals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="block rounded-md bg-card p-2 text-sm">
                <span className="font-medium">{deal.title}</span>
                <span className="money block text-xs text-muted-foreground">{formatCompact(deal.weighted)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function relocate(stages: BoardStage[], activeId: string, overId: string): BoardStage[] | null {
  const next = stages.map((stage) => ({ ...stage, deals: stage.deals.slice() }));
  const from = next.find((stage) => stage.deals.some((deal) => deal.id === activeId));
  if (!from) return null;
  const deal = from.deals.find((item) => item.id === activeId);
  if (!deal || !deal.canEdit) return null;
  const to = overId.startsWith("stage:")
    ? next.find((stage) => stage.id === overId.slice(6))
    : next.find((stage) => stage.deals.some((item) => item.id === overId));
  if (!to) return null;
  if (from.id === to.id) {
    const oldIndex = from.deals.findIndex((item) => item.id === activeId);
    const newIndex = overId.startsWith("stage:") ? from.deals.length - 1 : from.deals.findIndex((item) => item.id === overId);
    from.deals = arrayMove(from.deals, oldIndex, Math.max(0, newIndex));
    return next;
  }
  from.deals = from.deals.filter((item) => item.id !== activeId);
  const index = overId.startsWith("stage:") ? to.deals.length : to.deals.findIndex((item) => item.id === overId);
  to.deals.splice(index < 0 ? to.deals.length : index, 0, { ...deal, stageId: to.id });
  return next;
}

function shiftMonth(parts: { year: number; month: number; day: number }, offset: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: 1 };
}
