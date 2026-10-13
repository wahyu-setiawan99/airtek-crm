"use client";

import { Command } from "cmdk";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  Columns3,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { markNotificationsReadAction, switchOrgAction, updateThemeAction } from "@/lib/actions/crm";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppLocale } from "@/i18n/locale";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShellData } from "@/types/view";
import mark from "@/public/brand/airtek-mark.png";
import { BrandLogo } from "@/components/brand-logo";
import { PwaSupport } from "@/components/pwa-register";
import { ThemeMenu } from "@/components/theme-menu";
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
  sidebarCollapsed = false,
}: {
  locale: AppLocale;
  shell: ShellData;
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tcmd = useTranslations("command");
  const tn = useTranslations("notifications");
  const ts = useTranslations("settings");
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  // Last theme received from the server; applied only when the saved value itself changes,
  // because setTheme's identity changes with every theme switch and would re-run the effect.
  const syncedTheme = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [more, setMore] = useState(false);
  const [collapsed, setCollapsed] = useState(sidebarCollapsed);
  const unread = shell.notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (syncedTheme.current === shell.user.theme) return;
    syncedTheme.current = shell.user.theme;
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
      if (event.key === "[" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setCollapsed((current) => {
          const next = !current;
          document.cookie = `airtek_sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
          return next;
        });
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
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-60")}>
        <div className={cn("flex h-14 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-3")}>
          <Link
            href="/dashboard"
            aria-label={collapsed ? t("dashboard") : undefined}
            className={cn("flex min-w-0 items-center rounded-md hover:opacity-80", collapsed ? "justify-center" : "gap-3")}
          >
            {collapsed ? <Image src={mark} alt="" priority className="h-8 w-8 object-contain" /> : (
              <>
                <BrandLogo priority className="h-8" />
                <span aria-hidden className="h-6 w-px bg-sidebar-border" />
                <span className="text-xs font-semibold tracking-[0.25em] text-sidebar-muted">CRM</span>
              </>
            )}
          </Link>
        </div>
        <nav className={cn("min-h-0 flex-1 space-y-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
          {links.map((item) => {
            const href = item.key === "pipeline" ? pipelineHref : item.href;
            const Icon = item.icon;
            const link = (
              <Link
                href={href}
                aria-label={t(item.key)}
                className={cn(
                  "flex items-center gap-2 rounded-md py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed ? "justify-center px-0" : "px-2.5",
                  active(item.href) && "bg-sidebar-accent font-medium text-primary dark:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {collapsed ? null : t(item.key)}
              </Link>
            );
            if (!collapsed) return <div key={item.key}>{link}</div>;
            return (
              <Tooltip.Root key={item.key}>
                <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="right" className="z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow">
                    {t(item.key)}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </nav>
        {shell.demo && !collapsed ? <p className="px-4 pb-2 text-[11px] text-sidebar-muted">{tc("demo")}</p> : null}
        <div className={cn("mt-auto border-t border-sidebar-border px-3 pb-16 pt-3", collapsed && "px-2")}>
          {collapsed ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-sm hover:text-primary"
                  aria-label={tc("expandSidebar")}
                  onClick={() => {
                    document.cookie = "airtek_sidebar=expanded; path=/; max-age=31536000; samesite=lax";
                    setCollapsed(false);
                  }}
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="right" className="z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow">
                  {tc("expandSidebar")}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : (
            <button
              type="button"
              className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent px-3 text-sm font-medium text-sidebar-foreground shadow-sm hover:text-primary"
              aria-label={tc("collapseSidebar")}
              onClick={() => {
                document.cookie = "airtek_sidebar=collapsed; path=/; max-age=31536000; samesite=lax";
                setCollapsed(true);
              }}
            >
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              {tc("collapseSidebar")}
            </button>
          )}
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-16" : "md:pl-60")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Menu">
            <MenuIcon className="h-4 w-4" />
          </Button>
          <Link href="/dashboard" aria-label={t("dashboard")} className="md:hidden">
            <Image src={mark} alt="" priority className="h-7 w-7 object-contain" />
          </Link>
          <button
            className="hidden h-9 min-w-64 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground md:flex"
            onClick={() => setOpen(true)}
          >
            <Search className="h-4 w-4" />
            {tc("search")}
            <kbd className="ml-auto rounded border px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-md hover:bg-accent md:hidden" aria-label={tc("search")} onClick={() => setOpen(true)}>
              <Search className="h-4 w-4" />
            </button>
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
            <ThemeMenu
              labels={{ theme: tc("theme"), light: ts("themeLight"), dark: ts("themeDark"), system: ts("themeSystem") }}
              onChange={(next) => void updateThemeAction(next)}
            />
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
        <main className="px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { href: "/dashboard", key: "dashboard" as const, icon: LayoutDashboard },
          { href: pipelineHref, key: "pipeline" as const, icon: Columns3 },
          { href: "/activities", key: "activities" as const, icon: CalendarCheck },
          { href: "/deals", key: "deals" as const, icon: Handshake },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} className={cn("grid min-h-14 place-items-center gap-1 py-2 text-[11px]", active(item.key === "pipeline" ? "/pipelines" : item.href) && "text-primary")}>
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
        <button className="grid min-h-14 place-items-center gap-1 py-2 text-[11px]" onClick={() => setMore(true)}>
          <MenuIcon className="h-4 w-4" />
          {tc("all")}
        </button>
      </nav>

      {mobile || more ? (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => { setMobile(false); setMore(false); }}>
          <div className="absolute inset-y-0 left-0 flex w-[min(14rem,64vw)] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-2 pb-[env(safe-area-inset-bottom)] pt-[calc(0.75rem+env(safe-area-inset-top))] text-sidebar-foreground shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-2 pl-2">
              <Link href="/dashboard" aria-label={t("dashboard")} onClick={() => { setMobile(false); setMore(false); }} className="rounded-md hover:opacity-80">
                <BrandLogo className="h-7" />
              </Link>
              <button type="button" aria-label={tc("close")} className="grid h-10 w-10 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-accent" onClick={() => { setMobile(false); setMore(false); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {links.map((item) => {
                const href = item.key === "pipeline" ? pipelineHref : item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.key} href={href} onClick={() => { setMobile(false); setMore(false); }} className={cn("flex min-h-10 items-center gap-2.5 rounded-md px-2 text-sm", active(item.href) && "bg-sidebar-accent font-medium text-primary dark:text-sidebar-foreground")}>
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
      <span className="sr-only" onClick={() => toast.message(tc("search"))} />
      <PwaSupport />
    </div>
  );
}
