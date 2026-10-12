"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult } from "@/lib/action";
import { cookieOptions, ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { addMembership, provisionOrganization } from "@/lib/demo/onboarding";
import { createId, mutateStore, readStore } from "@/lib/demo/store";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validations";

export async function loginAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  const store = readStore();
  const profile = store.profiles.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (!profile || profile.password !== parsed.data.password) {
    return { ok: false, error: t("invalidCredentials") };
  }
  const membership = store.memberships.find((item) => item.user_id === profile.id);
  if (!membership) return { ok: false, error: t("invalidCredentials") };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, profile.id, cookieOptions);
  jar.set(ORG_COOKIE, membership.organization_id, cookieOptions);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  try {
    const result = mutateStore((store) => {
      const email = parsed.data.email.toLowerCase();
      if (store.profiles.some((item) => item.email.toLowerCase() === email)) {
        throw new ActionError(t("emailTaken"));
      }
      const timestamp = new Date().toISOString();
      const userId = createId();
      const invite = parsed.data.inviteToken
        ? store.invitations.find((item) => item.token === parsed.data.inviteToken && !item.accepted_at)
        : undefined;
      if (parsed.data.inviteToken && (!invite || invite.email.toLowerCase() !== email || new Date(invite.expires_at) < new Date())) {
        throw new ActionError(t("invalidToken"));
      }

      store.profiles.push({
        id: userId,
        full_name: parsed.data.fullName,
        avatar_url: null,
        phone: null,
        locale: "id",
        email,
        password: parsed.data.password,
        reset_token: null,
        reset_expires: null,
        created_at: timestamp,
        updated_at: timestamp,
      });

      const organizationId = invite
        ? invite.organization_id
        : provisionOrganization(store, userId, parsed.data.organizationName);
      if (invite) {
        addMembership(store, invite.organization_id, userId, invite.role, invite.created_by);
        invite.accepted_at = timestamp;
      }
      return { userId, organizationId };
    });

    const jar = await cookies();
    jar.set(SESSION_COOKIE, result.userId, cookieOptions);
    jar.set(ORG_COOKIE, result.organizationId, cookieOptions);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    return { ok: false, error: t("invalidInput") };
  }
}

export async function forgotAction(input: unknown): Promise<ActionResult<string>> {
  const t = await getTranslations("auth");
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  const token = createId();
  mutateStore((store) => {
    const profile = store.profiles.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (!profile) return;
    profile.reset_token = token;
    profile.reset_expires = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    profile.updated_at = new Date().toISOString();
  });
  return { ok: true, data: token };
}

export async function resetAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  try {
    mutateStore((store) => {
      const profile = store.profiles.find((item) => item.reset_token === parsed.data.token);
      if (!profile || !profile.reset_expires || new Date(profile.reset_expires) < new Date()) {
        throw new ActionError(t("invalidToken"));
      }
      profile.password = parsed.data.password;
      profile.reset_token = null;
      profile.reset_expires = null;
      profile.updated_at = new Date().toISOString();
    });
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    return { ok: false, error: t("invalidToken") };
  }
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
  revalidatePath("/", "layout");
}
