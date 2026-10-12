"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

const editorClass =
  "h-9 w-full rounded-md border border-primary/60 bg-card px-2.5 text-sm text-foreground shadow-sm outline-none ring-2 ring-primary/20";

function Display({
  canEdit,
  empty,
  onClick,
  className,
  children,
}: {
  canEdit: boolean;
  empty: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("deals");
  if (!canEdit) {
    return <span className={cn("block min-h-9 py-1.5", empty && "text-muted-foreground", className)}>{empty ? "—" : children}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={t("clickToEdit")}
      className={cn(
        "group -mx-2 flex min-h-9 w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/70",
        className,
      )}
    >
      <span className={cn("min-w-0 flex-1 [overflow-wrap:anywhere]", empty && "text-muted-foreground/80")}>{empty ? t("notSet") : children}</span>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

/** Click to edit; saves on Enter or blur, Esc cancels. `onSave` returns false to keep editing. */
export function InlineInput({
  value,
  display,
  onSave,
  canEdit,
  type = "text",
  className,
  inputClassName,
  min,
  max,
}: {
  value: string;
  display?: React.ReactNode;
  onSave: (next: string) => Promise<boolean>;
  canEdit: boolean;
  type?: "text" | "number" | "date";
  className?: string;
  inputClassName?: string;
  min?: number;
  max?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  async function commit() {
    if (draft === value) return setEditing(false);
    if (await onSave(draft)) setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        min={min}
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(editorClass, inputClassName)}
      />
    );
  }
  return (
    <Display
      canEdit={canEdit}
      empty={!value}
      className={className}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {display ?? value}
    </Display>
  );
}

export function InlineSelect({
  value,
  options,
  onSave,
  canEdit,
  allowEmpty = true,
  display,
  className,
}: {
  value: string | null;
  options: { id: string; name: string }[];
  onSave: (next: string | null) => Promise<boolean>;
  canEdit: boolean;
  allowEmpty?: boolean;
  display?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("deals");
  const [editing, setEditing] = useState(false);
  const current = options.find((item) => item.id === value);

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value ?? ""}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false);
        }}
        onChange={(event) => {
          const next = event.target.value || null;
          setEditing(false);
          if (next !== value) void onSave(next);
        }}
        className={editorClass}
      >
        {allowEmpty ? <option value="">{t("none")}</option> : null}
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    );
  }
  return (
    <Display canEdit={canEdit} empty={!current} className={className} onClick={() => setEditing(true)}>
      {display ?? current?.name}
    </Display>
  );
}
