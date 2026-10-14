"use client";

import { Shield, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { inviteMemberAction, setMemberRoleAction } from "@/lib/actions/crm";
import { cancelInvitationAction, deleteMemberAccountAction, resendInvitationAction, setMemberActiveAction } from "@/lib/actions/phase9";
import type { AppLocale } from "@/i18n/locale";
import { formatDateTime } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import type { Role } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";

type Member = { userId: string; name: string; email: string; role: Role; disabled: boolean };
type Invitation = { id: string; email: string; role: Role; expiresAt: string; status: "pending" | "accepted" | "expired" };

const LEVELS = [
  { role: "owner" as const, level: "levelBoss", body: "roleBossBody", icon: Shield },
  { role: "admin" as const, level: "levelAdmin", body: "roleAdminBody", icon: Users },
  { role: "sales" as const, level: "levelSales", body: "roleSalesBody", icon: UserRound },
];

const ROLE_ORDER: Role[] = ["owner", "admin", "manager", "sales", "presales", "viewer"];

export function MembersPanel({
  members,
  invitations,
  canAdmin,
  currentUserId,
  isOwner,
  locale,
}: {
  members: Member[];
  invitations: Invitation[];
  canAdmin: boolean;
  currentUserId: string;
  isOwner: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const waiting = invitations.filter((item) => item.status !== "accepted");
  const visibleMembers = isOwner ? members : members.filter((member) => member.role !== "owner");
  const levels = isOwner ? LEVELS : LEVELS.filter((level) => level.role !== "owner");
  const grouped = ROLE_ORDER
    .map((role) => ({ role, people: visibleMembers.filter((member) => member.role === role) }))
    .filter((group) => group.people.length > 0);

  function done(result: { ok: boolean; error?: string }) {
    if (!result.ok) {
      toast.error(result.error ?? tc("error"));
      return;
    }
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">{t("levelsTitle")}</h2>
        <div className={cn("grid items-stretch gap-3", levels.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2")}>
          {levels.map((level, index) => {
            const Icon = level.icon;
            return (
              <article key={level.role} className="flex h-full flex-col rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("levelRank", { n: index + 1 })}</p>
                    <p className="text-sm font-semibold">{tc(`roles.${level.role}`)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(level.body)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6">
        {grouped.map((group) => (
          <div key={group.role} className="grid gap-3">
            <h2 className="text-sm font-semibold">{tc(`roles.${group.role}`)}</h2>
            <ul className="grid gap-3">
              {group.people.map((member) => {
                const isBoss = member.role === "owner";
                const canRemove = canAdmin && !isBoss && member.userId !== currentUserId;
                return (
                  <li key={member.userId} className={cn("flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3", member.disabled && "opacity-70")}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(member.name)}</span>
                    <div className="min-w-48 flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {member.disabled ? <span className="inline-flex h-9 items-center rounded-full bg-muted px-3 text-xs text-muted-foreground">{t("inactive")}</span> : null}
                      {isBoss ? (
                        <span className="inline-flex h-9 items-center rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">{t("bossLocked")}</span>
                      ) : (
                        <Select
                          className="h-9 w-40"
                          defaultValue={member.role}
                          disabled={!canAdmin || member.disabled}
                          aria-label={tc("role")}
                          onChange={(event) => void setMemberRoleAction(member.userId, event.target.value as Role).then(done)}
                        >
                          {(["admin", "sales", "presales"] as const).map((role) => <option key={role} value={role}>{tc(`roles.${role}`)}</option>)}
                        </Select>
                      )}
                      {canRemove ? (
                        <Button
                          className="h-9"
                          variant="outline"
                          onClick={() => {
                            const message = member.disabled ? t("enableConfirm") : t("disableConfirm");
                            if (!window.confirm(message)) return;
                            void setMemberActiveAction(member.userId, member.disabled).then(done);
                          }}
                        >
                          {member.disabled ? t("enable") : t("disable")}
                        </Button>
                      ) : null}
                      {canRemove ? (
                        <Button className="h-9" variant="destructive" onClick={() => setRemoving(member)}>{t("deleteAccount")}</Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("pending")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("invitesHint")}</p>
        </div>
        {waiting.length === 0 ? <p className="text-sm text-muted-foreground">{t("invitesEmpty")}</p> : (
          <ul className="grid gap-2">
            {waiting.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">{tc(`roles.${invite.role}`)}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", invite.status === "expired" ? "bg-destructive/10 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>
                  {t(invite.status === "expired" ? "statusExpired" : "statusPending")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(invite.status === "expired" ? "inviteEnded" : "inviteUntil", { date: formatDateTime(invite.expiresAt, locale) })}
                </span>
                {canAdmin ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void resendInvitationAction(invite.id).then(done)}>{t("resend")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (!window.confirm(t("cancelConfirm"))) return;
                      void cancelInvitationAction(invite.id).then(done);
                    }}>{t("cancelInvite")}</Button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAdmin ? (
        <form
          className="grid gap-4 rounded-lg border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const email = String(form.get("email"));
            const formElement = event.currentTarget;
            void inviteMemberAction({ email, fullName: String(form.get("fullName")), role: String(form.get("role")), teamId: null }).then((result) => {
              if (!result.ok) return toast.error(result.error);
              toast.success(t("inviteSent", { email }));
              formElement.reset();
            });
          }}
        >
          <h2 className="text-sm font-semibold">{t("invite")}</h2>
          <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_auto]">
            <Field label={tc("name")}><Input name="fullName" required /></Field>
            <Field label={tc("email")}><Input name="email" type="email" required /></Field>
            <Field label={tc("role")}>
              <Select name="role" defaultValue="sales">
                <option value="sales">{tc("roles.sales")}</option>
                <option value="presales">{tc("roles.presales")}</option>
                <option value="admin">{tc("roles.admin")}</option>
              </Select>
            </Field>
            <Button type="submit" className="h-10">{t("copyInvite")}</Button>
          </div>
        </form>
      ) : null}

      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title={removing ? t("deleteAccountTitle", { name: removing.name }) : t("deleteAccount")}
        description={removing ? t("deleteAccountBody", { email: removing.email }) : undefined}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setRemoving(null)}>{tc("cancel")}</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !removing}
            onClick={() => {
              if (!removing) return;
              setBusy(true);
              void deleteMemberAccountAction(removing.userId).then((result) => {
                setBusy(false);
                if (!result.ok) return toast.error(result.error);
                setRemoving(null);
              });
            }}
          >
            {t("deleteAccount")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
