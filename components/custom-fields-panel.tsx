"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { saveCustomValueAction } from "@/lib/actions/phase9";
import { useRouter } from "@/i18n/navigation";
import { Input, Select } from "@/components/ui/form";

export type ExtraField = {
  id: string;
  label: string;
  fieldType: "text" | "number" | "date" | "select";
  options: string | null;
  value: string;
};

export function CustomFieldsPanel({ entityId, fields, canEdit }: { entityId: string; fields: ExtraField[]; canEdit: boolean }) {
  const tc = useTranslations("common");
  const router = useRouter();
  if (fields.length === 0) return <p className="text-sm text-muted-foreground">{tc("empty")}</p>;
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4">
      {fields.map((field) => (
        <label key={field.id} className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{field.label}</span>
          {field.fieldType === "select" ? (
            <Select
              defaultValue={field.value}
              disabled={!canEdit}
              aria-label={field.label}
              onChange={(event) => {
                void saveCustomValueAction({ fieldId: field.id, entityId, value: event.target.value }).then((result) => {
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                });
              }}
            >
              <option value="">—</option>
              {(field.options ?? "").split(",").map((option) => option.trim()).filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          ) : (
            <Input
              aria-label={field.label}
              type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
              defaultValue={field.value}
              disabled={!canEdit}
              onBlur={(event) => {
                if (event.target.value === field.value) return;
                void saveCustomValueAction({ fieldId: field.id, entityId, value: event.target.value }).then((result) => {
                  if (!result.ok) toast.error(result.error);
                });
              }}
            />
          )}
        </label>
      ))}
    </div>
  );
}
