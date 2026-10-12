"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  Flag,
  History,
  ListChecks,
  MessageSquareText,
  Plus,
  Search,
  Trophy,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addNoteAction, completeActivityAction, saveActivityAction } from "@/lib/actions/crm";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDate, formatDateTime, formatRupiah, formatTime, jakartaParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/types/crm";
import type { DealDetailData } from "@/types/view";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";

export type ComposerTab = "note" | "activity";
type Filter = "all" | "notes" | "activities" | "changes";
type Item = {
  id: string;
  kind: "note" | "activity" | "change";
  icon: "note" | "activity" | "move" | "won" | "lost" | "field" | "created";
  at: string;
  by: string;
  title: string;
  detail?: React.ReactNode;
  body?: string;
};

const ACTIVITY_TYPES: ActivityType[] = ["call", "meeting", "email", "task", "visit", "whatsapp"];

function dayKey(iso: string) {
  const { year, month, day } = jakartaParts(new Date(iso));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** `datetime-local` value for a time N hours from now, rounded to the hour. */
function defaultDue(hours = 24) {
  const date = new Date(Date.now() + hours * 3_600_000);
  date.setMinutes(0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

const iconMap = {
  note: MessageSquareText,
  activity: ListChecks,
  move: ArrowRight,
  won: Trophy,
  lost: XCircle,
  field: History,
  created: Flag,
};

export function DealSidebar({
  deal,
  locale,
  composer,
  onComposerChange,
}: {
  deal: DealDetailData;
  locale: AppLocale;
  composer: ComposerTab;
  onComposerChange: (tab: ComposerTab) => void;
}) {
  const t = useTranslations("deals");
  const ta = useTranslations("activities");
  const tc = useTranslations("common");
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const open = deal.activities.filter((item) => !item.doneAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const next = open[0];
  const overdue = next ? new Date(next.dueAt).getTime() < Date.now() : false;

  async function run(action: Promise<{ ok: boolean; error?: string }>, success?: string) {
    setPending(true);
    const result = await action;
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? tc("error"));
      return false;
    }
    if (success) toast.success(success);
    router.refresh();
    return true;
  }

  function formatChange(field: string | null, value: string | null) {
    if (value === null || value === "") return "—";
    if (field === "value") return formatRupiah(Number(value));
    if (field === "probability") return `${value}%`;
    if (field === "expectedClose") return formatDate(value, locale);
    if (field === "priority") return "★".repeat(Number(value)) || "☆";
    return value;
  }

  const items = useMemo<Item[]>(() => {
    const wonStages = new Set(deal.stages.filter((stage) => stage.type === "won").map((stage) => stage.name));
    const lostStages = new Set(deal.stages.filter((stage) => stage.type === "lost").map((stage) => stage.name));
    const list: Item[] = [
      { id: "created", kind: "change", icon: "created", at: deal.createdAt, by: deal.createdByName, title: t("evCreated") },
      ...deal.notes.map((note) => ({
        id: `n-${note.id}`,
        kind: "note" as const,
        icon: "note" as const,
        at: note.createdAt,
        by: note.author,
        title: t("evNote"),
        body: note.body,
      })),
      ...deal.activities
        .filter((activity) => activity.doneAt)
        .map((activity) => ({
          id: `a-${activity.id}`,
          kind: "activity" as const,
          icon: "activity" as const,
          at: activity.doneAt ?? activity.dueAt,
          by: "",
          title: `${t("evActivityDone")} · ${ta(activity.type)}`,
          detail: <span className="font-medium text-foreground">{activity.subject}</span>,
          body: activity.note ?? undefined,
        })),
      ...deal.history.map((item) => {
        const icon = wonStages.has(item.to) ? "won" : lostStages.has(item.to) ? "lost" : "move";
        return {
          id: `h-${item.id}`,
          kind: "change" as const,
          icon: icon as Item["icon"],
          at: item.at,
          by: item.by,
          title: icon === "won" ? t("evWon") : icon === "lost" ? t("evLost") : t("evMoved"),
          detail: item.from ? (
            <span>
              {item.from} <ArrowRight className="inline h-3 w-3" /> <span className="font-medium text-foreground">{item.to}</span>
            </span>
          ) : (
            <span className="font-medium text-foreground">{item.to}</span>
          ),
        };
      }),
      ...deal.events
        .filter((event) => event.action === "field" && event.field)
        .map((event) => ({
          id: `e-${event.id}`,
          kind: "change" as const,
          icon: "field" as const,
          at: event.at,
          by: event.by,
          title: t("evChanged", { field: t(`fields.${event.field}` as "fields.title") }),
          detail:
            event.field === "description" ? undefined : (
              <span>
                <span className="line-through decoration-muted-foreground/50">{formatChange(event.field, event.from)}</span>{" "}
                <ArrowRight className="inline h-3 w-3" />{" "}
                <span className="font-medium text-foreground">{formatChange(event.field, event.to)}</span>
              </span>
            ),
        })),
    ];
    return list.sort((a, b) => b.at.localeCompare(a.at));
    // formatChange depends only on locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal, locale, t, ta]);

  const visible = items.filter((item) => {
    if (filter === "notes" && item.kind !== "note") return false;
    if (filter === "activities" && item.kind !== "activity") return false;
    if (filter === "changes" && item.kind !== "change") return false;
    if (!query.trim()) return true;
    const haystack = `${item.title} ${item.by} ${item.body ?? ""} ${typeof item.detail === "string" ? item.detail : ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const groups: { key: string; label: string; items: Item[] }[] = [];
  const todayKey = dayKey(new Date().toISOString());
  const yesterdayKey = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  for (const item of visible) {
    const key = dayKey(item.at);
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      const label = key === todayKey ? t("today") : key === yesterdayKey ? t("yesterday") : formatDate(item.at, locale);
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Next activity */}
      <section
        className={cn(
          "rounded-lg border p-3.5",
          !next && "border-warning/50 bg-warning/10",
          next && overdue && "border-destructive/40 bg-destructive/5",
          next && !overdue && "bg-card",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("nextActivity")}</h2>
          {open.length > 1 ? <span className="text-xs text-muted-foreground">+{open.length - 1}</span> : null}
        </div>
        {next ? (
          <div className="mt-2">
            <div className="flex items-start gap-2.5">
              <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md", overdue ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>
                <CalendarClock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{next.subject}</p>
                <p className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {ta(next.type)} · {formatDateTime(next.dueAt, locale)}
                </p>
              </div>
            </div>
            {deal.canEdit ? (
              rescheduling ? (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const due = String(new FormData(event.currentTarget).get("due"));
                    void run(
                      saveActivityAction({
                        id: next.id,
                        type: next.type,
                        subject: next.subject,
                        note: next.note,
                        dueAt: new Date(due).toISOString(),
                        assignedTo: deal.ownerId,
                        dealId: deal.id,
                        contactId: deal.contactId,
                        companyId: deal.companyId,
                      }),
                      t("saved"),
                    ).then((ok) => ok && setRescheduling(false));
                  }}
                >
                  <Input name="due" type="datetime-local" required defaultValue={defaultDue()} className="h-8" />
                  <Button size="sm" type="submit" disabled={pending}>{tc("save")}</Button>
                </form>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" disabled={pending} onClick={() => void run(completeActivityAction(next.id, ""), t("saved"))}>
                    <Check className="h-3.5 w-3.5" /> {ta("markDone")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRescheduling(true)}>{t("schedule")}</Button>
                </div>
              )
            ) : null}
          </div>
        ) : (
          <div className="mt-2 flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">{t("noActivityWarning")}</p>
              <p className="text-xs text-muted-foreground">{t("noActivityHint")}</p>
              {deal.canEdit ? (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => onComposerChange("activity")}>
                  <Plus className="h-3.5 w-3.5" /> {t("schedule")}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* Composer */}
      {deal.canEdit ? (
        <section id="deal-composer" className="rounded-lg border bg-card">
          <div className="flex border-b text-sm">
            {(["note", "activity"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onComposerChange(tab)}
                className={cn(
                  "-mb-px flex-1 border-b-2 px-3 py-2 font-medium transition-colors",
                  composer === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "note" ? t("composerNote") : t("composerActivity")}
              </button>
            ))}
          </div>
          {composer === "note" ? (
            <form
              className="grid gap-2 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const body = String(new FormData(form).get("body") ?? "").trim();
                if (!body) return;
                void run(addNoteAction({ body, dealId: deal.id, contactId: null, companyId: null })).then((ok) => ok && form.reset());
              }}
            >
              <Textarea
                name="body"
                rows={3}
                className="min-h-20 resize-y"
                placeholder={t("notePlaceholder")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("sendHint")}</span>
                <Button size="sm" type="submit" disabled={pending}>{t("saveNote")}</Button>
              </div>
            </form>
          ) : (
            <form
              className="grid gap-2 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void run(
                  saveActivityAction({
                    id: null,
                    type: String(data.get("type")),
                    subject: String(data.get("subject")),
                    note: String(data.get("note") ?? "") || null,
                    dueAt: new Date(String(data.get("dueAt"))).toISOString(),
                    assignedTo: deal.ownerId,
                    dealId: deal.id,
                    contactId: deal.contactId,
                    companyId: deal.companyId,
                  }),
                  t("saved"),
                ).then((ok) => {
                  if (ok) {
                    form.reset();
                    onComposerChange("note");
                  }
                });
              }}
            >
              <div className="grid grid-cols-[8.5rem_1fr] gap-2">
                <Select name="type" defaultValue="call" className="h-9" aria-label={ta("type")}>
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>{ta(type)}</option>
                  ))}
                </Select>
                <Input name="subject" required minLength={2} placeholder={ta("subject")} className="h-9" autoFocus />
              </div>
              <Input name="dueAt" type="datetime-local" required defaultValue={defaultDue()} className="h-9" aria-label={ta("due")} />
              <Textarea name="note" rows={2} className="min-h-16" placeholder={ta("result")} />
              <Button size="sm" type="submit" disabled={pending} className="justify-self-end">{t("schedule")}</Button>
            </form>
          )}
        </section>
      ) : null}

      {/* Timeline */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("timeline")}</h2>
          <label className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchTimeline")}
              aria-label={t("searchTimeline")}
              className="h-8 w-44 rounded-md border bg-card pl-7 pr-2 text-xs placeholder:text-muted-foreground"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "notes", "activities", "changes"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                filter === key ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {t(key === "all" ? "filterAll" : key === "notes" ? "filterNotes" : key === "activities" ? "filterActivities" : "filterChanges")}
            </button>
          ))}
        </div>
        {groups.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("emptyTimeline")}</p> : null}
        {groups.map((group) => (
          <div key={group.key}>
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {group.label}
              <span className="h-px flex-1 bg-border" />
            </div>
            <ol className="relative grid gap-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon];
                return (
                  <li key={item.id} className="relative flex gap-3">
                    <span
                      className={cn(
                        "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-background",
                        item.icon === "won" && "border-success/50 text-success",
                        item.icon === "lost" && "border-destructive/50 text-destructive",
                        item.icon === "note" && "border-primary/40 text-primary",
                        !["won", "lost", "note"].includes(item.icon) && "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {item.by ? <span className="font-medium text-foreground">{item.by}</span> : null} {item.title}
                        <span className="ml-1.5 tabular-nums">· {formatTime(item.at, locale)}</span>
                      </p>
                      {item.detail ? <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p> : null}
                      {item.body ? (
                        <p className={cn("mt-1.5 whitespace-pre-wrap text-sm", item.kind === "note" && "rounded-md border bg-card p-2.5")}>{item.body}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}
