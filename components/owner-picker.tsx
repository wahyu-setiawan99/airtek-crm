"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setOwnerAction } from "@/lib/actions/phase9";
import { Select } from "@/components/ui/form";

export function OwnerPicker({
  kind,
  id,
  ownerId,
  owners,
  canEdit,
}: {
  kind: "contact" | "company";
  id: string;
  ownerId: string | null;
  owners: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const t = useTranslations("common");
  return (
    <label className="grid max-w-xs gap-1 text-sm">
      <span className="text-muted-foreground">{t("owner")}</span>
      <Select
        aria-label={t("owner")}
        value={ownerId ?? ""}
        disabled={!canEdit}
        onChange={(event) => {
          void setOwnerAction({ kind, id, ownerId: event.target.value }).then((result) => {
            if (!result.ok) toast.error(result.error);
          });
        }}
      >
        {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
      </Select>
    </label>
  );
}
