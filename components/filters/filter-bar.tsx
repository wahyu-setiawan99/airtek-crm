"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

export type FilterValues = {
  q?: string;
  owner?: string;
  tag?: string;
  status?: string;
  mine?: boolean;
  priority?: string;
  valueMin?: string;
  valueMax?: string;
  city?: string;
  client?: string;
  condition?: string;
  closeFrom?: string;
  closeTo?: string;
  createdFrom?: string;
  createdTo?: string;
  pipeline?: string;
  stage?: string;
  party?: string;
  project?: string;
};

const QUERY_KEYS = ["q", "owner", "tag", "status", "priority", "valueMin", "valueMax", "city", "client", "condition", "closeFrom", "closeTo", "createdFrom", "createdTo", "pipeline", "stage", "party", "project"] as const;

export function filtersFromSearch(params: { get: (key: string) => string | null }): FilterValues {
  const values: FilterValues = { mine: params.get("mine") === "1" };
  for (const key of QUERY_KEYS) {
    const value = params.get(key);
    if (value) values[key] = value;
  }
  return values;
}

export function FilterBar({
  values,
  owners = [],
  tags = [],
  statuses = [],
  extras = [],
  showMine = true,
  pipelines = [],
  stages = [],
  meId,
  multiOwner = false,
  onChange,
}: {
  values: FilterValues;
  owners?: { id: string; name: string }[];
  tags?: { id: string; name: string }[];
  statuses?: { id: string; name: string }[];
  pipelines?: { id: string; name: string }[];
  stages?: { id: string; name: string }[];
  meId?: string;
  multiOwner?: boolean;
  extras?: ("priority" | "value" | "condition" | "close" | "created" | "city" | "client" | "party" | "project")[];
  showMine?: boolean;
  onChange: (next: FilterValues) => void;
}) {
  const t = useTranslations("common");
  const tk = useTranslations("companies");
  const ownerIds = (values.owner ?? "").split(",").filter(Boolean);
  const stageIds = (values.stage ?? "").split(",").filter(Boolean);
  const chips = [
    values.q ? { key: "q", label: values.q } : null,
    values.owner ? { key: "owner", label: ownerIds.map((id) => owners.find((item) => item.id === id)?.name ?? id).join(", ") } : null,
    values.tag ? { key: "tag", label: tags.find((item) => item.id === values.tag)?.name ?? values.tag } : null,
    values.status ? { key: "status", label: statuses.find((item) => item.id === values.status)?.name ?? values.status } : null,
    values.priority ? { key: "priority", label: `${t("priority")} ${values.priority}` } : null,
    values.valueMin ? { key: "valueMin", label: `≥ ${values.valueMin}` } : null,
    values.valueMax ? { key: "valueMax", label: `≤ ${values.valueMax}` } : null,
    values.city ? { key: "city", label: values.city } : null,
    values.client ? { key: "client", label: values.client === "konsultan" ? tk("types.konsultan") : values.client === "kontraktor" ? tk("types.kontraktor") : tk("types.owner") } : null,
    values.pipeline ? { key: "pipeline", label: pipelines.find((item) => item.id === values.pipeline)?.name ?? values.pipeline } : null,
    values.stage ? { key: "stage", label: stageIds.map((id) => stages.find((item) => item.id === id)?.name ?? id).join(", ") } : null,
    values.party ? { key: "party", label: values.party } : null,
    values.project ? { key: "project", label: values.project } : null,
    values.condition ? { key: "condition", label: t(values.condition === "none" ? "noActivity" : values.condition === "rotting" ? "rotting" : "overdue") } : null,
    values.closeFrom || values.closeTo ? { key: "closeFrom", label: `${values.closeFrom ?? "…"} – ${values.closeTo ?? "…"}` } : null,
    values.createdFrom || values.createdTo ? { key: "createdFrom", label: `${values.createdFrom ?? "…"} – ${values.createdTo ?? "…"}` } : null,
    values.mine ? { key: "mine", label: t("myDeals") } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  function clear(key: string) {
    if (key === "mine") onChange({ ...values, mine: false });
    else if (key === "closeFrom") onChange({ ...values, closeFrom: "", closeTo: "" });
    else if (key === "createdFrom") onChange({ ...values, createdFrom: "", createdTo: "" });
    else onChange({ ...values, [key]: "" });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Input className="md:max-w-xs" value={values.q ?? ""} placeholder={t("search")} aria-label={t("search")} onChange={(event) => onChange({ ...values, q: event.target.value })} />
        {owners.length > 0 && multiOwner ? (
          <fieldset className="flex max-w-xl flex-wrap gap-x-3 gap-y-1">
            {owners.map((owner) => (
              <label key={owner.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={ownerIds.includes(owner.id)}
                  onChange={(event) => {
                    const next = event.target.checked ? [...ownerIds, owner.id] : ownerIds.filter((id) => id !== owner.id);
                    onChange({ ...values, owner: next.join(",") });
                  }}
                />
                {owner.id === meId ? `${owner.name} (${t("myDeals")})` : owner.name}
              </label>
            ))}
          </fieldset>
        ) : owners.length > 0 ? (
          <Select aria-label={t("owner")} value={values.owner ?? ""} onChange={(event) => onChange({ ...values, owner: event.target.value })}>
            <option value="">{t("all")}</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </Select>
        ) : null}
        {tags.length > 0 ? (
          <Select aria-label={t("tags")} value={values.tag ?? ""} onChange={(event) => onChange({ ...values, tag: event.target.value })}>
            <option value="">{t("tags")}</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </Select>
        ) : null}
        {statuses.length > 0 ? (
          <Select aria-label={t("status")} value={values.status ?? ""} onChange={(event) => onChange({ ...values, status: event.target.value })}>
            <option value="">{t("status")}</option>
            {statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
          </Select>
        ) : null}
        {pipelines.length > 0 ? (
          <Select aria-label={t("pipeline")} value={values.pipeline ?? ""} onChange={(event) => onChange({ ...values, pipeline: event.target.value })}>
            <option value="">{t("pipeline")}</option>
            {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
          </Select>
        ) : null}
        {stages.length > 0 ? (
          <details className="rounded-md border px-2 py-1 text-sm">
            <summary className="cursor-pointer">{t("stage")}</summary>
            <div className="mt-1 grid max-h-40 gap-1 overflow-auto">
              {stages.map((stage) => (
                <label key={stage.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={stageIds.includes(stage.id)}
                    onChange={(event) => {
                      const next = event.target.checked ? [...stageIds, stage.id] : stageIds.filter((id) => id !== stage.id);
                      onChange({ ...values, stage: next.join(",") });
                    }}
                  />
                  {stage.name}
                </label>
              ))}
            </div>
          </details>
        ) : null}
        {extras.includes("party") ? (
          <Input className="md:max-w-40" value={values.party ?? ""} placeholder={t("party")} aria-label={t("party")} onChange={(event) => onChange({ ...values, party: event.target.value })} />
        ) : null}
        {extras.includes("project") ? (
          <Input className="md:max-w-40" value={values.project ?? ""} placeholder={t("projectLocation")} aria-label={t("projectLocation")} onChange={(event) => onChange({ ...values, project: event.target.value })} />
        ) : null}
        {extras.includes("priority") ? (
          <Select aria-label={t("priority")} value={values.priority ?? ""} onChange={(event) => onChange({ ...values, priority: event.target.value })}>
            <option value="">{t("priority")}</option>
            {["0", "1", "2", "3"].map((level) => <option key={level} value={level}>{level}</option>)}
          </Select>
        ) : null}
        {extras.includes("value") ? (
          <>
            <Input className="md:max-w-32" type="number" min={0} value={values.valueMin ?? ""} placeholder={t("valueMin")} aria-label={t("valueMin")} onChange={(event) => onChange({ ...values, valueMin: event.target.value })} />
            <Input className="md:max-w-32" type="number" min={0} value={values.valueMax ?? ""} placeholder={t("valueMax")} aria-label={t("valueMax")} onChange={(event) => onChange({ ...values, valueMax: event.target.value })} />
          </>
        ) : null}
        {extras.includes("city") ? (
          <Input className="md:max-w-40" value={values.city ?? ""} placeholder={t("city")} aria-label={t("city")} onChange={(event) => onChange({ ...values, city: event.target.value })} />
        ) : null}
        {extras.includes("client") ? (
          <Select aria-label={tk("clientType")} value={values.client ?? ""} onChange={(event) => onChange({ ...values, client: event.target.value })}>
            <option value="">{tk("clientType")}</option>
            <option value="konsultan">{tk("types.konsultan")}</option>
            <option value="kontraktor">{tk("types.kontraktor")}</option>
            <option value="owner">{tk("types.owner")}</option>
          </Select>
        ) : null}
        {extras.includes("condition") ? (
          <Select aria-label={t("condition")} value={values.condition ?? ""} onChange={(event) => onChange({ ...values, condition: event.target.value })}>
            <option value="">{t("condition")}</option>
            <option value="overdue">{t("overdue")}</option>
            <option value="none">{t("noActivity")}</option>
            <option value="rotting">{t("rotting")}</option>
          </Select>
        ) : null}
        {extras.includes("close") ? (
          <>
            <Input type="date" value={values.closeFrom ?? ""} aria-label={t("closeFrom")} onChange={(event) => onChange({ ...values, closeFrom: event.target.value })} />
            <Input type="date" value={values.closeTo ?? ""} aria-label={t("closeTo")} onChange={(event) => onChange({ ...values, closeTo: event.target.value })} />
          </>
        ) : null}
        {extras.includes("created") ? (
          <>
            <Input type="date" value={values.createdFrom ?? ""} aria-label={t("createdFrom")} onChange={(event) => onChange({ ...values, createdFrom: event.target.value })} />
            <Input type="date" value={values.createdTo ?? ""} aria-label={t("createdTo")} onChange={(event) => onChange({ ...values, createdTo: event.target.value })} />
          </>
        ) : null}
        {showMine ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(values.mine)} onChange={(event) => onChange({ ...values, mine: event.target.checked })} />
            {t("myDeals")}
          </label>
        ) : null}
        {chips.length > 0 ? <Button type="button" size="sm" variant="ghost" onClick={() => onChange({})}>{t("reset")}</Button> : null}
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip.key} type="button" className="rounded-full bg-accent px-2 py-1 text-xs" onClick={() => clear(chip.key)}>
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function useFilterQuery() {
  const router = useRouter();
  const pathname = usePathname();
  return (values: FilterValues, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const key of QUERY_KEYS) {
      const value = values[key];
      if (value) params.set(key, value);
    }
    if (values.mine) params.set("mine", "1");
    Object.entries(extra ?? {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
}

type DealLike = {
  title: string;
  companyName: string | null;
  contactName?: string | null;
  ownerId: string;
  tags: { id: string }[];
  status: string;
  priority: number;
  value: number;
  activityStatus: "scheduled" | "overdue" | "none";
  rotting: boolean;
  expectedCloseDate: string | null;
  stageId: string;
  pipelineId?: string;
  partyNames?: string;
  projectCity?: string | null;
  projectProvince?: string | null;
  createdAt?: string | null;
  clientTypes?: string[];
};

export function matchDeal(deal: DealLike, values: FilterValues, meId?: string) {
  const q = values.q?.trim().toLowerCase();
  if (q && !`${deal.title} ${deal.companyName ?? ""} ${deal.contactName ?? ""}`.toLowerCase().includes(q)) return false;
  if (values.owner) {
    const ids = values.owner.split(",").filter(Boolean);
    if (ids.length > 0 && !ids.includes(deal.ownerId)) return false;
  }
  if (values.pipeline && deal.pipelineId !== values.pipeline) return false;
  if (values.stage && !values.stage.split(",").filter(Boolean).includes(deal.stageId)) return false;
  if (values.party && !(deal.partyNames ?? "").toLowerCase().includes(values.party.trim().toLowerCase())) return false;
  if (values.project && !`${deal.projectCity ?? ""} ${deal.projectProvince ?? ""}`.toLowerCase().includes(values.project.trim().toLowerCase())) return false;
  if (values.client && !(deal.clientTypes ?? []).includes(values.client)) return false;
  if (values.mine && meId && deal.ownerId !== meId) return false;
  if (values.tag && !deal.tags.some((item) => item.id === values.tag)) return false;
  if (values.status && deal.status !== values.status) return false;
  if (values.priority && String(deal.priority) !== values.priority) return false;
  if (values.valueMin && deal.value < Number(values.valueMin)) return false;
  if (values.valueMax && deal.value > Number(values.valueMax)) return false;
  if (values.condition === "overdue" && deal.activityStatus !== "overdue") return false;
  if (values.condition === "none" && deal.activityStatus !== "none") return false;
  if (values.condition === "rotting" && !deal.rotting) return false;
  const close = deal.expectedCloseDate?.slice(0, 10) ?? "";
  if (values.closeFrom && (!close || close < values.closeFrom)) return false;
  if (values.closeTo && (!close || close > values.closeTo)) return false;
  const created = deal.createdAt?.slice(0, 10) ?? "";
  if (values.createdFrom && (!created || created < values.createdFrom)) return false;
  if (values.createdTo && (!created || created > values.createdTo)) return false;
  return true;
}
