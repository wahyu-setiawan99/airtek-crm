"use client";

import { Command } from "cmdk";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  Columns3,
  Handshake,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Monitor,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  SunMedium,
  Users,
  Wind,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { markNotificationsReadAction, switchOrgAction, updateThemeAction } from "@/lib/actions/crm";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShellData } from "@/types/view";
import { Button } from "@/components/ui/button";
import { MenuContent, MenuItem, Menu, MenuTrigger } from "@/components/ui/dropdown";

const links = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/pipelines", key: "pipeline", icon: Columns3 },
  { href: "/deals", key: "deals", icon: Handshake },
  { href: "/contacts", key: "contacts", icon: Users },
  { href: "/companies", key: "companies", icon: Building2 },
  { href: "/activities", key: "activities", icon: CalendarCheck },
  { href: "/products", key: "products", icon: Package },
  { href: "/reports", key: "reports", icon: BarChart3 },
  { href: "/settings/profile", key: "settings", icon: Settings },
] as const;

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

export function AppShell({
  locale,
  shell,
  children,
}: {
  locale: AppLocale;
  shell: ShellData;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tcmd = useTranslations("command");
  const tset = useTranslations("settings");
  const tn = useTranslations("notifications");
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [more, setMore] = useState(false);
  const unread = shell.notifications.filter((item) => !item.read).length;

  useEffect(() => {
    setTheme(shell.user.theme);
  }, [setTheme, shell.user.theme]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (isTyping(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key.toLowerCase() === "n" && shell.pipelineId) {
        event.preventDefault();
        router.push(`/pipelines/${shell.pipelineId}?new=1`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, shell.pipelineId]);

  function active(href: string) {
    if (href === "/pipelines") return pathname.startsWith("/pipelines");
    if (href.startsWith("/settings")) return pathname.startsWith("/settings");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const pipelineHref = shell.pipelineId ? `/pipelines/${shell.pipelineId}` : "/settings/pipelines";

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Wind className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">Airtek</p>
            <p className="mt-1 text-[11px] text-sidebar-muted">CRM</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map((item) => {
            const href = item.key === "pipeline" ? pipelineHref : item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  active(item.href) && "bg-sidebar-accent text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        {shell.demo ? <p className="px-4 pb-4 text-[11px] text-sidebar-muted">{tc("demo")}</p> : null}
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Menu">
            <MenuIcon className="h-4 w-4" />
          </Button>
          <button
            className="hidden h-9 min-w-64 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground md:flex"
            onClick={() => setOpen(true)}
          >
            <Search className="h-4 w-4" />
            {tc("search")}
            <kbd className="ml-auto rounded border px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Menu>
              <MenuTrigger className="hidden h-9 max-w-56 items-center gap-2 truncate rounded-md px-2 text-sm hover:bg-accent sm:flex">
                {shell.organization.name}
                {shell.organization.demo ? <span className="rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-black">DEMO</span> : null}
              </MenuTrigger>
              <MenuContent>
                {shell.organizations.map((org) => (
                  <MenuItem
                    key={org.id}
                    onSelect={() => {
                      void switchOrgAction(org.id).then(() => {
                        router.push("/dashboard");
                        router.refresh();
                      });
                    }}
                  >
                    {org.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            <Menu>
              <MenuTrigger className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-accent" aria-label={tc("notifications")}>
                <Bell className="h-4 w-4" />
                {unread > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" /> : null}
              </MenuTrigger>
              <MenuContent className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{tc("notifications")}</p>
                  <button
                    className="text-xs text-primary"
                    onClick={() => {
                      void markNotificationsReadAction().then(() => router.refresh());
                    }}
                  >
                    {tc("markAllRead")}
                  </button>
                </div>
                {shell.notifications.length === 0 ? <p className="px-2 py-4 text-sm text-muted-foreground">{tc("noNotifications")}</p> : null}
                {shell.notifications.map((item) => (
                  <MenuItem key={item.id} onSelect={() => router.push(item.href)}>
                    <span className="grid">
                      <span className={cn("font-medium", !item.read && "text-primary")}>{tn(item.type)}</span>
                      <span className="text-muted-foreground">{item.title}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(item.createdAt, locale)}</span>
                    </span>
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            <Link
              href={pathname}
              locale={locale === "id" ? "en" : "id"}
              className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent"
              aria-label={tc("language")}
            >
              <Languages className="h-4 w-4" />
            </Link>
            <Menu>
              <MenuTrigger className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent" aria-label={tc("theme")}>
                <SunMedium className="h-4 w-4 dark:hidden" />
                <Moon className="hidden h-4 w-4 dark:block" />
              </MenuTrigger>
              <MenuContent>
                {([
                  ["light", tset("themeLight"), SunMedium],
                  ["dark", tset("themeDark"), Moon],
                  ["system", tset("themeSystem"), Monitor],
                ] as const).map(([value, label, Icon]) => (
                  <MenuItem key={value} onSelect={() => {
                    setTheme(value);
                    void updateThemeAction(value);
                  }}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            <Menu>
              <MenuTrigger className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {shell.user.name.slice(0, 1)}
              </MenuTrigger>
              <MenuContent>
                <div className="px-2 py-1.5">
                  <p className="font-medium">{shell.user.name}</p>
                  <p className="text-xs text-muted-foreground">{shell.user.email}</p>
                  <p className="text-xs text-muted-foreground">{tc(`roles.${shell.user.role}`)}</p>
                </div>
                <MenuItem onSelect={() => router.push("/settings/profile")}>{tc("profile")}</MenuItem>
                <MenuItem onSelect={() => { window.location.href = "/auth/sign-out"; }}>
                  <LogOut className="h-4 w-4" />
                  {tc("logout")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </header>
        <main className="px-3 py-4 pb-24 md:px-6 md:pb-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden">
        {[
          { href: "/dashboard", key: "dashboard" as const, icon: LayoutDashboard },
          { href: pipelineHref, key: "pipeline" as const, icon: Columns3 },
          { href: "/activities", key: "activities" as const, icon: CalendarCheck },
          { href: "/deals", key: "deals" as const, icon: Handshake },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} className={cn("grid place-items-center gap-1 py-2 text-[10px]", active(item.key === "pipeline" ? "/pipelines" : item.href) && "text-primary")}>
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
        <button className="grid place-items-center gap-1 py-2 text-[10px]" onClick={() => setMore(true)}>
          <MenuIcon className="h-4 w-4" />
          {tc("all")}
        </button>
      </nav>

      {mobile || more ? (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => { setMobile(false); setMore(false); }}>
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar p-4 text-sidebar-foreground" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <Wind className="h-4 w-4" /> Airtek
            </div>
            <div className="space-y-1">
              {links.map((item) => {
                const href = item.key === "pipeline" ? pipelineHref : item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.key} href={href} onClick={() => { setMobile(false); setMore(false); }} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
                    <Icon className="h-4 w-4" />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label={tcmd("placeholder")}
        overlayClassName="fixed inset-0 z-50 bg-black/50"
        contentClassName="fixed left-1/2 top-[12%] z-50 w-[min(100%-1.5rem,36rem)] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
      >
        <Command.Input placeholder={tcmd("placeholder")} className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none" />
        <Command.List className="max-h-80 overflow-y-auto p-2">
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
      <span className="sr-only" onClick={() => toast.message(tc("search"))} />
    </div>
  );
}
