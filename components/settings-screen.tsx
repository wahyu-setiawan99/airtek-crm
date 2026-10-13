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
  moveStageAction,
  resetDemoAction,
  savePipelineAction,
  saveReasonAction,
  saveStageAction,
  saveTagAction,
  saveSalesTargetAction,
  updateOrganizationAction,
  updateLocaleAction,
  updateProfileAction,
} from "@/lib/actions/crm";
import { deleteCustomFieldAction, saveCustomFieldAction } from "@/lib/actions/phase9";
import { MembersPanel } from "@/components/members-panel";
import { settingsSections } from "@/components/settings-nav";
import type { AppLocale } from "@/i18n/locale";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

type SettingsData = {
  profile: { fullName: string; email: string; phone: string; locale: AppLocale; theme: "light" | "dark" | "system" };
  organization: { name: string };
  canAdmin: boolean;
  canManage: boolean;
  currentUserId: string;
  isOwner: boolean;
  targetMonth: string;
  targets: { userId: string; name: string; amount: number }[];
  members: { userId: string; name: string; email: string; role: Role; disabled: boolean }[];
  invitations: { id: string; email: string; role: Role; expiresAt: string; status: "pending" | "accepted" | "expired" }[];
  customFields: { id: string; entity: "deal" | "contact" | "company"; label: string; field_type: "text" | "number" | "date" | "select"; options: string | null }[];
  pipelines: { id: string; name: string; description: string | null; color: string; stages: { id: string; name: string; probability: number; rotting_days: number | null; type: "open" | "won" | "lost" }[] }[];
  tags: { id: string; name: string; color: string }[];
  reasons: { id: string; name: string }[];
  audit: { id: string; entity: string; action: string; created_at: string; actor: string }[];
};


export function SettingsScreen({
  section,
  data,
  locale,
  demo = false,
}: {
  section: (typeof settingsSections)[number][0];
  data: SettingsData;
  locale: AppLocale;
  demo?: boolean;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  async function done(result: { ok: boolean; error?: string }) {
    if (!result.ok) {
      toast.error(result.error ?? tc("error"));
      return;
    }
  }

  return (
    <>
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t(section)}</h1>
        {section === "profile" ? (
          <>
            <form className="grid max-w-lg gap-3" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void updateProfileAction({
                fullName: String(form.get("fullName")),
                phone: String(form.get("phone")) || null,
              }).then((result) => {
                if (result.ok) toast.success(t("savedProfile"));
                void done(result);
              });
            }}>
              <Field label={tc("name")}><Input name="fullName" required defaultValue={data.profile.fullName} /></Field>
              <Field label={tc("email")}><Input value={data.profile.email} disabled /></Field>
              <Field label={tc("phone")}><Input name="phone" defaultValue={data.profile.phone} /></Field>
              <Button type="submit">{tc("save")}</Button>
            </form>
            <section className="grid max-w-lg gap-2 rounded-lg border bg-card p-4" aria-labelledby="language-heading">
              <h2 id="language-heading" className="text-sm font-semibold">{t("language")}</h2>
              <p className="text-xs text-muted-foreground">{t("languageHint")}</p>
              <div role="radiogroup" aria-labelledby="language-heading" className="mt-1 grid w-full grid-cols-2 gap-1 rounded-lg border bg-muted p-1 sm:max-w-sm">
                {([["en", "English"], ["id", "Bahasa Indonesia"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={data.profile.locale === value}
                    disabled={data.profile.locale === value}
                    onClick={() => {
                      void updateLocaleAction(value).then((result) => {
                        if (!result.ok) return toast.error(result.error);
                      });
                    }}
                    className={cn(
                      "h-10 rounded-md px-3 text-sm font-medium transition-colors",
                      data.profile.locale === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
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
          <MembersPanel
            members={data.members}
            invitations={data.invitations}
            canAdmin={data.canAdmin}
            currentUserId={data.currentUserId}
            isOwner={data.isOwner}
            locale={locale}
          />
        ) : null}
        {section === "targets" && data.canAdmin ? (
          <div className="grid max-w-xl gap-3">
            <p className="text-sm text-muted-foreground">{t("targetsHint")}</p>
            {data.targets.length === 0 ? <p className="text-sm text-muted-foreground">{t("targetsEmpty")}</p> : data.targets.map((person) => (
              <form key={person.userId} className="grid grid-cols-[minmax(0,1fr)_9rem_auto] items-center gap-2" onSubmit={(event) => {
                event.preventDefault();
                const amount = Number(new FormData(event.currentTarget).get("amount") ?? 0);
                void saveSalesTargetAction({ userId: person.userId, month: data.targetMonth, amount }).then((result) => done(result));
              }}>
                <span className="truncate text-sm">{person.name}</span>
                <Input name="amount" type="number" min={0} defaultValue={person.amount} aria-label={person.name} />
                <Button type="submit" size="sm">{t("saveTarget")}</Button>
              </form>
            ))}
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
                <Input name="name" defaultValue={tag.name} aria-label={t("tags")} className="min-w-0 flex-1" />
                <Input name="color" type="color" defaultValue={tag.color} aria-label={t("tagColor")} className="w-12 shrink-0 p-1" />
                <RowActions save={tc("save")} remove={tc("delete")} onRemove={() => void deleteTagAction(tag.id).then((result) => done(result))} />
              </form>
            ))}
            <form className="flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              const target = event.currentTarget;
              const form = new FormData(target);
              void saveTagAction({ id: null, name: String(form.get("name")), color: "#0f766e" }).then((result) => {
                if (result.ok) target.reset();
                done(result);
              });
            }}>
              <Input name="name" required placeholder={t("addTag")} aria-label={t("addTag")} className="min-w-0 flex-1" />
              <Button type="submit" className="h-10 w-[14.5rem] shrink-0">{t("addTag")}</Button>
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
                <Input name="name" defaultValue={reason.name} aria-label={t("lostReasons")} className="min-w-0 flex-1" />
                <RowActions save={tc("save")} remove={tc("delete")} onRemove={() => void deleteReasonAction(reason.id).then((result) => done(result))} />
              </form>
            ))}
            <form className="flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              const target = event.currentTarget;
              void saveReasonAction({ id: null, name: String(new FormData(target).get("name")) }).then((result) => {
                if (result.ok) target.reset();
                done(result);
              });
            }}>
              <Input name="name" required placeholder={t("addReason")} aria-label={t("addReason")} className="min-w-0 flex-1" />
              <Button type="submit" className="h-10 w-44 shrink-0">{t("addReason")}</Button>
            </form>
          </div>
        ) : null}
        {section === "customFields" && data.canAdmin ? (
          <div className="grid max-w-lg gap-4">
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {data.customFields.map((field) => (
                <li key={field.id} className="flex items-center justify-between gap-2 p-3">
                  <span>{field.label} · {field.entity} · {field.field_type}</span>
                  <Button size="sm" variant="ghost" onClick={() => void deleteCustomFieldAction(field.id).then((result) => done(result))}>{tc("delete")}</Button>
                </li>
              ))}
            </ul>
            <form className="grid gap-3" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void saveCustomFieldAction({
                entity: String(form.get("entity")) as "deal" | "contact" | "company",
                label: String(form.get("label")),
                fieldType: String(form.get("fieldType")) as "text" | "number" | "date" | "select",
                options: String(form.get("options") ?? "") || null,
              }).then((result) => done(result));
            }}>
              <Field label={t("fieldLabel")}><Input name="label" required /></Field>
              <Field label={t("fieldEntity")}>
                <Select name="entity" defaultValue="deal">
                  <option value="deal">{tc("pipeline")}</option>
                  <option value="contact">{tc("contact")}</option>
                  <option value="company">{tc("company")}</option>
                </Select>
              </Field>
              <Field label={t("fieldType")}>
                <Select name="fieldType" defaultValue="text">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                </Select>
              </Field>
              <Field label={t("description")}><Input name="options" placeholder="A, B, C" /></Field>
              <Button type="submit">{t("addField")}</Button>
            </form>
          </div>
        ) : null}
        {section === "import" ? <p className="text-sm text-muted-foreground">{t("import")}</p> : null}
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
            <Button className="mt-3" variant="destructive" onClick={() => void resetDemoAction().then(() => { window.location.href = "/login"; })}>{t("resetDemo")}</Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Save + Delete pair with a fixed width, so the "Add" button below can match it. */
function RowActions({ save, remove, onRemove }: { save: string; remove: string; onRemove: () => void }) {
  return (
    <div className="grid w-44 shrink-0 grid-cols-2 gap-2">
      <Button type="submit" variant="outline" className="h-10 px-2">{save}</Button>
      <Button type="button" variant="ghost" className="h-10 px-2" onClick={onRemove}>{remove}</Button>
    </div>
  );
}
