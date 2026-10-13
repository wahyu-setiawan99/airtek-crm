"use client";

import { Command } from "cmdk";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ShellData } from "@/types/view";

/** Ctrl+K palette. Loaded only when opened (see AppShell), so cmdk stays out of every page's JS. */
export default function CommandPalette({
  open,
  setOpen,
  shell,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  shell: ShellData;
}) {
  const tc = useTranslations("common");
  const tcmd = useTranslations("command");
  const router = useRouter();
  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={tcmd("placeholder")}
      overlayClassName="fixed inset-0 z-50 bg-black/50"
      contentClassName="fixed inset-0 z-50 flex flex-col overflow-hidden bg-popover pt-[env(safe-area-inset-top)] text-popover-foreground sm:inset-auto sm:left-1/2 sm:top-[12%] sm:block sm:w-[min(100%-1.5rem,36rem)] sm:-translate-x-1/2 sm:rounded-xl sm:border sm:pt-0 sm:shadow-2xl"
    >
      <div className="flex items-center border-b">
        <Command.Input placeholder={tcmd("placeholder")} aria-label={tcmd("placeholder")} className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base outline-none sm:text-sm" />
        <button type="button" className="h-12 px-4 text-sm font-medium text-primary sm:hidden" onClick={() => setOpen(false)}>{tc("cancel")}</button>
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-80 sm:flex-none">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">{tcmd("empty")}</Command.Empty>
        <Command.Group heading={tcmd("actions")} className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Command.Item className="flex items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent" onSelect={() => { setOpen(false); if (shell.pipelineId) router.push(`/pipelines/${shell.pipelineId}?new=1`); }}>
            <Plus className="h-4 w-4" /> {tcmd("newDeal")}
          </Command.Item>
          <Command.Item className="flex items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent" onSelect={() => { setOpen(false); router.push("/contacts?new=1"); }}>
            <Plus className="h-4 w-4" /> {tcmd("newContact")}
          </Command.Item>
          <Command.Item className="flex items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent" onSelect={() => { setOpen(false); router.push("/companies?new=1"); }}>
            <Plus className="h-4 w-4" /> {tcmd("newCompany")}
          </Command.Item>
        </Command.Group>
        <Command.Group heading={tcmd("deals")} className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          {shell.search.deals.map((deal) => (
            <Command.Item key={deal.id} value={`${deal.title} ${deal.subtitle}`} className="rounded-md px-2 py-2 text-sm aria-selected:bg-accent" onSelect={() => { setOpen(false); router.push(`/deals/${deal.id}`); }}>
              <span className="block font-medium">{deal.title}</span>
              <span className="text-xs text-muted-foreground">{deal.subtitle}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading={tcmd("contacts")} className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          {shell.search.contacts.map((item) => (
            <Command.Item key={item.id} value={item.title} className="rounded-md px-2 py-2 text-sm aria-selected:bg-accent" onSelect={() => { setOpen(false); router.push(`/contacts/${item.id}`); }}>
              {item.title}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading={tcmd("companies")} className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          {shell.search.companies.map((item) => (
            <Command.Item key={item.id} value={item.title} className="rounded-md px-2 py-2 text-sm aria-selected:bg-accent" onSelect={() => { setOpen(false); router.push(`/companies/${item.id}`); }}>
              {item.title}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
