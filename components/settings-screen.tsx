"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  archivePipelineAction,
  changePasswordAction,
  deleteReasonAction,
  deleteStageAction,
  deleteTagAction,
  duplicatePipelineAction,
  inviteMemberAction,
  moveStageAction,
  removeMemberAction,
  resetDemoAction,
  savePipelineAction,
  saveReasonAction,
  saveStageAction,
  saveTagAction,
  setMemberRoleAction,
  updateOrganizationAction,
  updateProfileAction,
} from "@/lib/actions/crm";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import type { Role } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

type SettingsData = {
  profile: { fullName: string; email: string; phone: string; locale: AppLocale; theme: "light" | "dark" | "system" };
  organization: { name: string };
  canAdmin: boolean;
  canManage: boolean;
  members: { userId: string; name: string; email: string; role: Role }[];
  invitations: { id: string; email: string; role: Role; token: string; expiresAt: string }[];
  pipelines: { id: string; name: string; description: string | null; color: string; stages: { id: string; name: string; probability: number; rotting_days: number | null; type: "open" | "won" | "lost" }[] }[];
  tags: { id: string; name: string; color: string }[];
  reasons: { id: string; name: string }[];
  audit: { id: string; entity: string; action: string; created_at: string; actor: string }[];
};

const sections = [
  ["profile", "/settings/profile"],
  ["organization", "/settings/organization"],
  ["members", "/settings/members"],
  ["pipelines", "/settings/pipelines"],
  ["tags", "/settings/tags"],
  ["lostReasons", "/settings/lost-reasons"],
  ["audit", "/settings/audit"],
] as const;

export function SettingsScreen({
  section,
  data,
  locale,
  demo = false,
}: {
  section: (typeof sections)[number][0];
  data: SettingsData;
  locale: AppLocale;
  demo?: boolean;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();

  async function done(result: { ok: boolean; error?: string }, localeChange?: AppLocale) {
    if (!result.ok) {
      toast.error(result.error ?? tc("error"));
      return;
    }
    if (localeChange) router.push("/settings/profile", { locale: localeChange });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {sections.map(([key, href]) => (
          <Link key={key} href={href} className={`rounded-md px-3 py-2 text-sm ${section === key ? "bg-accent font-medium" : "text-muted-foreground"}`}>
            {t(key)}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t(section)}</h1>
        {section === "profile" ? (
          <>
            <form className="grid max-w-lg gap-3" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const localeValue = String(form.get("locale")) as AppLocale;
              void updateProfileAction({
                fullName: String(form.get("fullName")),
                phone: String(form.get("phone")) || null,
                locale: localeValue,
                theme: String(form.get("theme")) as "light" | "dark" | "system",
              }).then((result) => done(result, localeValue));
            }}>
              <Field label={tc("name")}><Input name="fullName" required defaultValue={data.profile.fullName} /></Field>
              <Field label={tc("email")}><Input value={data.profile.email} disabled /></Field>
              <Field label={tc("phone")}><Input name="phone" defaultValue={data.profile.phone} /></Field>
              <Field label={t("language")}>
                <Select name="locale" defaultValue={data.profile.locale}><option value="id">Indonesia</option><option value="en">English</option></Select>
              </Field>
              <Field label={tc("theme")}>
                <Select name="theme" defaultValue={data.profile.theme}>
                  <option value="light">{t("themeLight")}</option>
                  <option value="dark">{t("themeDark")}</option>
                  <option value="system">{t("themeSystem")}</option>
                </Select>
              </Field>
              <Button type="submit">{tc("save")}</Button>
            </form>
            <form className="grid max-w-lg gap-3" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void changePasswordAction({
                currentPassword: String(form.get("currentPassword")),
                newPassword: String(form.get("newPassword")),
              }).then((result) => {
                if (!result.ok) toast.error(result.error);
                else toast.success(t("passwordChanged"));
              });
            }}>
              <h2 className="text-sm font-semibold">{t("changePassword")}</h2>
              <Field label={t("currentPassword")}><Input name="currentPassword" type="password" required minLength={8} /></Field>
              <Field label={t("newPassword")}><Input name="newPassword" type="password" required minLength={8} /></Field>
              <Button type="submit" variant="outline">{tc("save")}</Button>
            </form>
          </>
        ) : null}
        {section === "organization" ? (
          <form className="grid max-w-lg gap-3" onSubmit={(event) => {
            event.preventDefault();
            void updateOrganizationAction({ name: String(new FormData(event.currentTarget).get("name")) }).then((result) => done(result));
          }}>
            <Field label={t("orgName")}><Input name="name" required defaultValue={data.organization.name} disabled={!data.canAdmin} /></Field>
            {data.canAdmin ? <Button type="submit">{tc("save")}</Button> : null}
          </form>
        ) : null}
        {section === "members" ? (
          <div className="grid gap-4">
            <ul className="divide-y rounded-lg border bg-card">
              {data.members.map((member) => (
                <li key={member.userId} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Select defaultValue={member.role} disabled={!data.canAdmin} aria-label={tc("role")} onChange={(event) => void setMemberRoleAction(member.userId, event.target.value as Role).then((result) => done(result))}>
                    {(["owner", "admin", "manager", "sales", "presales", "viewer"] as const).map((role) => <option key={role} value={role}>{tc(`roles.${role}`)}</option>)}
                  </Select>
                  {data.canAdmin ? <Button size="sm" variant="outline" onClick={() => void removeMemberAction(member.userId).then((result) => done(result))}>{t("remove")}</Button> : null}
                </li>
              ))}
            </ul>
            {data.canAdmin ? (
              <form className="grid max-w-lg gap-3" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void inviteMemberAction({ email: String(form.get("email")), fullName: String(form.get("fullName")), role: String(form.get("role")), teamId: null }).then(async (result) => {
                  if (!result.ok) return toast.error(result.error);
                  const link = `${window.location.origin}/${locale}/register?invite=${result.data}`;
                  await navigator.clipboard.writeText(link);
                  toast.success(tc("copied"));
                  router.refresh();
                });
              }}>
                <h2 className="text-sm font-semibold">{t("invite")}</h2>
                <Field label={tc("name")}><Input name="fullName" required /></Field>
                <Field label={tc("email")}><Input name="email" type="email" required /></Field>
                <Field label={tc("role")}>
                  <Select name="role" defaultValue="sales">{(["admin", "manager", "sales", "presales", "viewer"] as const).map((role) => <option key={role} value={role}>{tc(`roles.${role}`)}</option>)}</Select>
                </Field>
                <Button type="submit">{t("copyInvite")}</Button>
              </form>
            ) : null}
            {data.invitations.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold">{t("pending")}</h2>
                <ul className="mt-2 text-sm">
                  {data.invitations.map((invite) => <li key={invite.id}>{invite.email} · {tc(`roles.${invite.role}`)} · {formatDateTime(invite.expiresAt, locale)}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        {section === "pipelines" && data.canManage ? (
          <div className="grid gap-4">
            {data.pipelines.map((pipeline) => (
              <article key={pipeline.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{pipeline.name}</h2>
                  <Button size="sm" variant="outline" onClick={() => void archivePipelineAction(pipeline.id).then((result) => done(result))}>{t("archive")}</Button>
                  <Button size="sm" variant="outline" onClick={() => void duplicatePipelineAction(pipeline.id).then((result) => done(result))}>{t("duplicatePipeline")}</Button>
                </div>
                <ul className="mt-3 space-y-2">
                  {pipeline.stages.map((stage) => (
                    <li key={stage.id} className="grid items-center gap-2 rounded-md border p-2 text-sm md:grid-cols-[1fr_90px_90px_110px_auto]">
                      <form className="contents" onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void saveStageAction({
                          id: stage.id,
                          pipelineId: pipeline.id,
                          name: String(form.get("name")),
                          probability: Number(form.get("probability")),
                          rottingDays: String(form.get("rotting")) === "" ? null : Number(form.get("rotting")),
                          type: String(form.get("type")),
                        }).then((result) => done(result));
                      }}>
                        <Input name="name" defaultValue={stage.name} className="h-8" />
                        <Input name="probability" type="number" min={0} max={100} defaultValue={stage.probability} className="h-8" aria-label={tc("priority")} />
                        <Input name="rotting" type="number" min={0} defaultValue={stage.rotting_days ?? ""} className="h-8" aria-label={t("rottingDays")} />
                        <Select name="type" defaultValue={stage.type} className="h-8">
                          <option value="open">{tc("open")}</option>
                          <option value="won">{tc("won")}</option>
                          <option value="lost">{tc("lost")}</option>
                        </Select>
                        <div className="flex gap-1">
                          <Button type="submit" size="sm" variant="outline">{tc("save")}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => void moveStageAction(stage.id, "up").then((result) => done(result))}>{t("moveUp")}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => void moveStageAction(stage.id, "down").then((result) => done(result))}>{t("moveDown")}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => void deleteStageAction(stage.id).then((result) => done(result))}>{tc("delete")}</Button>
                        </div>
                      </form>
                    </li>
                  ))}
                </ul>
                <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void saveStageAction({
                    id: null,
                    pipelineId: pipeline.id,
                    name: String(form.get("name")),
                    probability: 10,
                    rottingDays: 14,
                    type: "open",
                  }).then((result) => done(result));
                  event.currentTarget.reset();
                }}>
                  <Input name="name" required placeholder={t("addStage")} className="max-w-xs" />
                  <Button type="submit" size="sm">{t("addStage")}</Button>
                </form>
              </article>
            ))}
            <form className="flex flex-wrap gap-2" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void savePipelineAction({ id: null, name: String(form.get("name")), description: null, color: "#0f766e" }).then((result) => done(result));
            }}>
              <Input name="name" required placeholder={t("addPipeline")} className="max-w-xs" />
              <Button type="submit">{t("addPipeline")}</Button>
            </form>
          </div>
        ) : null}
        {section === "tags" && data.canManage ? (
          <div className="grid max-w-lg gap-3">
            {data.tags.map((tag) => (
              <form key={tag.id} className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void saveTagAction({ id: tag.id, name: String(form.get("name")), color: String(form.get("color")) }).then((result) => done(result));
              }}>
                <Input name="name" defaultValue={tag.name} />
                <Input name="color" type="color" defaultValue={tag.color} className="w-16" />
                <Button type="submit" size="sm" variant="outline">{tc("save")}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void deleteTagAction(tag.id).then((result) => done(result))}>{tc("delete")}</Button>
              </form>
            ))}
            <form className="flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void saveTagAction({ id: null, name: String(form.get("name")), color: "#0f766e" }).then((result) => done(result));
            }}>
              <Input name="name" required placeholder={t("addTag")} />
              <Button type="submit">{t("addTag")}</Button>
            </form>
          </div>
        ) : null}
        {section === "lostReasons" && data.canManage ? (
          <div className="grid max-w-lg gap-2">
            {data.reasons.map((reason) => (
              <form key={reason.id} className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                void saveReasonAction({ id: reason.id, name: String(new FormData(event.currentTarget).get("name")) }).then((result) => done(result));
              }}>
                <Input name="name" defaultValue={reason.name} />
                <Button type="submit" size="sm" variant="outline">{tc("save")}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void deleteReasonAction(reason.id).then((result) => done(result))}>{tc("delete")}</Button>
              </form>
            ))}
            <form className="flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              void saveReasonAction({ id: null, name: String(new FormData(event.currentTarget).get("name")) }).then((result) => done(result));
            }}>
              <Input name="name" required placeholder={t("addReason")} />
              <Button type="submit">{t("addReason")}</Button>
            </form>
          </div>
        ) : null}
        {section === "audit" ? (
          data.audit.length === 0 ? <p className="text-sm text-muted-foreground">{t("auditEmpty")}</p> : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {data.audit.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 p-3">
                  <span>{item.actor} · {item.action} · {item.entity}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at, locale)}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {section === "profile" && data.canAdmin && demo ? (
          <div className="max-w-lg rounded-lg border border-destructive/30 p-4">
            <h2 className="text-sm font-semibold">{t("danger")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("dangerBody")}</p>
            <Button className="mt-3" variant="destructive" onClick={() => void resetDemoAction().then(() => { window.location.href = "/id/login"; })}>{t("resetDemo")}</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
