"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

export type FilterValues = {
  q?: string;
  owner?: string;
  tag?: string;
  status?: string;
  mine?: boolean;
};

export function FilterBar({
  values,
  owners = [],
  tags = [],
  statuses = [],
  onChange,
}: {
  values: FilterValues;
  owners?: { id: string; name: string }[];
  tags?: { id: string; name: string }[];
  statuses?: { id: string; name: string }[];
  onChange: (next: FilterValues) => void;
}) {
  const t = useTranslations("common");
  const chips = [
    values.q ? { key: "q", label: values.q } : null,
    values.owner ? { key: "owner", label: owners.find((item) => item.id === values.owner)?.name ?? values.owner } : null,
    values.tag ? { key: "tag", label: tags.find((item) => item.id === values.tag)?.name ?? values.tag } : null,
    values.status ? { key: "status", label: statuses.find((item) => item.id === values.status)?.name ?? values.status } : null,
    values.mine ? { key: "mine", label: t("myDeals") } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input className="md:max-w-xs" value={values.q ?? ""} placeholder={t("search")} onChange={(event) => onChange({ ...values, q: event.target.value })} />
        {owners.length > 0 ? (
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(values.mine)} onChange={(event) => onChange({ ...values, mine: event.target.checked })} />
          {t("myDeals")}
        </label>
        {chips.length > 0 ? <Button type="button" size="sm" variant="ghost" onClick={() => onChange({})}>{t("close")}</Button> : null}
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip.key} className="rounded-full bg-accent px-2 py-1 text-xs" onClick={() => onChange({ ...values, [chip.key]: chip.key === "mine" ? false : "" })}>
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
    if (values.q) params.set("q", values.q);
    if (values.owner) params.set("owner", values.owner);
    if (values.tag) params.set("tag", values.tag);
    if (values.status) params.set("status", values.status);
    if (values.mine) params.set("mine", "1");
    Object.entries(extra ?? {}).forEach(([key, value]) => { if (value) params.set(key, value); });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
}
