"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult } from "@/lib/action";
import { cookieOptions, ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { clearSignedIn, markSignedIn } from "@/lib/session-flags";
import { addMembership, provisionOrganization } from "@/lib/demo/onboarding";
import { createId, mutateStore, readStore } from "@/lib/demo/store";
import { DEV_ACCOUNTS, isBootstrapAdmin, isLocalDevSupabase, siteUrl, supabaseEnabled } from "@/lib/env";
import { getAuthUser, getUserId } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mutate } from "@/lib/store";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validations";
import type { Invitation } from "@/types/crm";

async function requireSupabase() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function setOrg(organizationId: string) {
  const jar = await cookies();
  jar.set(ORG_COOKIE, organizationId, cookieOptions);
}

export async function loginAction(input: unknown): Promise<ActionResult<{ next: "onboarding" } | null>> {
  const t = await getTranslations("auth");
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  if (supabaseEnabled) {
    const supabase = await requireSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
    if (error || !data.user) {
      const unconfirmed = error?.code === "email_not_confirmed" || /not confirmed/i.test(error?.message ?? "");
      if (unconfirmed) return { ok: false, error: t("emailNotConfirmed"), code: "unconfirmed" as const };
      return { ok: false, error: t("invalidCredentials") };
    }
    const { data: memberships } = await supabase
      .from("memberships")
      .select("organization_id, disabled_at")
      .eq("user_id", data.user.id)
      .order("created_at")
      .limit(5);
    const { data: profileRow } = await supabase.from("profiles").select("locale").eq("id", data.user.id).maybeSingle();
    await markSignedIn(typeof profileRow?.locale === "string" ? profileRow.locale : "en");
    const organizationId = memberships?.find((row) => !row.disabled_at)?.organization_id as string | undefined;
    if (!organizationId) {
      await setOrg("");
      revalidatePath("/", "layout");
      return { ok: true, data: { next: "onboarding" as const } };
    }
    await setOrg(organizationId);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  }

  const store = readStore();
  const profile = store.profiles.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (!profile || profile.password !== parsed.data.password) {
    return { ok: false, error: t("invalidCredentials") };
  }
  if (!profile.email_confirmed) return { ok: false, error: t("emailNotConfirmed"), code: "unconfirmed" as const };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, profile.id, cookieOptions);
  await markSignedIn(profile.locale);
  const membership = store.memberships.find((item) => item.user_id === profile.id && !item.disabled_at);
  if (!membership) {
    revalidatePath("/", "layout");
    return { ok: true, data: { next: "onboarding" as const } };
  }
  await setOrg(membership.organization_id);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

/** Dev-only quick login for the accounts from `pnpm dev:seed`. Never available in production builds. */
export async function devLoginAction(email: string): Promise<ActionResult<{ next: "onboarding" } | null>> {
  if (!isLocalDevSupabase() || !DEV_ACCOUNTS.some((item) => item.email === email)) {
    const t = await getTranslations("common");
    return { ok: false, error: t("forbidden") };
  }
  return loginAction({ email, password: process.env.DEV_TEST_PASSWORD?.trim() || "airtek-dev-123" });
}

async function registerWithSupabase(data: {
  fullName: string;
  email: string;
  password: string;
  inviteToken?: string | null;
}): Promise<ActionResult<{ status: "pending" | "ready" }>> {
  const t = await getTranslations("auth");
  const email = data.email.toLowerCase();
  const admin = createAdminClient();

  let invite: Invitation | null = null;
  if (data.inviteToken) {
    const { data: row } = await admin.from("invitations").select("*").eq("token", data.inviteToken).is("accepted_at", null).maybeSingle();
    invite = (row as Invitation | null) ?? null;
    if (!invite || invite.cancelled_at || invite.email.toLowerCase() !== email || new Date(invite.expires_at) < new Date()) {
      return { ok: false, error: t("invalidToken") };
    }
  } else if (!isBootstrapAdmin(email)) {
    return { ok: false, error: t("inviteOnly") };
  }

  const supabase = await requireSupabase();

  const { data: signed, error } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding`,
      data: { full_name: data.fullName },
    },
  });
  if (error || !signed.user) {
    const taken = error?.code === "email_exists" || /already/i.test(error?.message ?? "");
    return { ok: false, error: taken ? t("emailTaken") : t("invalidInput") };
  }
  return { ok: true, data: { status: signed.session ? "ready" : "pending" } };
}

const RESEND_COOKIE = "airtek_resend_at";

export async function resendConfirmationAction(email: string): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false, error: t("invalidInput") };
  const jar = await cookies();
  const last = Number(jar.get(RESEND_COOKIE)?.value ?? 0);
  if (Date.now() - last < 60_000) return { ok: false, error: t("resendWait") };
  if (supabaseEnabled) {
    const supabase = await requireSupabase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalized,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` },
    });
    if (error) return { ok: false, error: t("invalidInput") };
  }
  jar.set(RESEND_COOKIE, String(Date.now()), { ...cookieOptions, httpOnly: true, maxAge: 60 });
  return { ok: true, data: null };
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const user = supabaseEnabled ? await getAuthUser() : null;
  const userId = supabaseEnabled ? user?.id : (await cookies()).get(SESSION_COOKIE)?.value;
  if (!userId) return { ok: false, error: t("invalidInput") };

  let email = "";
  let invitationId: string | null = null;
  let preloadedInvite: Invitation | null = null;
  if (user) {
    email = user.email?.toLowerCase() ?? "";
    invitationId = typeof user.user_metadata?.invitation_id === "string" ? user.user_metadata.invitation_id : null;
    if (invitationId) {
      const admin = createAdminClient();
      const { data: row } = await admin.from("invitations").select("*").eq("id", invitationId).maybeSingle();
      preloadedInvite = (row as Invitation | null) ?? null;
    }
  }

  try {
    const organizationId = await mutate((store) => {
      const profile = store.profiles.find((item) => item.id === userId);
      if (!supabaseEnabled) email = profile?.email.toLowerCase() ?? "";
      if (preloadedInvite && !store.invitations.some((item) => item.id === preloadedInvite?.id)) {
        store.invitations.push(preloadedInvite);
      }
      const existing = store.memberships.find((item) => item.user_id === userId && !item.disabled_at);
      if (existing) return existing.organization_id;
      const invite = store.invitations.find((item) => {
        if (item.accepted_at || item.cancelled_at || item.email.toLowerCase() !== email) return false;
        if (new Date(item.expires_at) < new Date()) return false;
        return invitationId ? item.id === invitationId : true;
      });
      if (invite) {
        addMembership(store, invite.organization_id, userId, invite.role, invite.created_by, invite.team_id);
        invite.accepted_at = new Date().toISOString();
        return invite.organization_id;
      }
      if (!isBootstrapAdmin(email)) throw new ActionError(t("inviteOnly"));
      return provisionOrganization(store, userId, "PT. Airtek Solusi Nusantara");
    }, { organizations: preloadedInvite ? [preloadedInvite.organization_id] : [], profiles: [userId] });

    if (!organizationId) return { ok: false, error: t("inviteOnly") };
    await setOrg(organizationId);
    await markSignedIn();
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: t("invalidInput") };
  }
}

export async function acceptInviteAction(input: { fullName: string; password: string }): Promise<ActionResult> {
  const t = await getTranslations("auth");
  if (input.password.length < 8 || input.fullName.trim().length < 2) return { ok: false, error: t("invalidInput") };
  if (supabaseEnabled) {
    const supabase = await requireSupabase();
    const { error } = await supabase.auth.updateUser({ password: input.password, data: { full_name: input.fullName } });
    if (error) return { ok: false, error: t("invalidInput") };
  }
  return completeOnboardingAction();
}

export async function registerAction(input: unknown): Promise<ActionResult<{ status: "pending" | "ready"; demoConfirmPath?: string } | null>> {
  const t = await getTranslations("auth");
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  if (supabaseEnabled) return registerWithSupabase(parsed.data);

  try {
    const result = mutateStore((store) => {
      const email = parsed.data.email.toLowerCase();
      if (store.profiles.some((item) => item.email.toLowerCase() === email)) {
        throw new ActionError(t("emailTaken"));
      }
      const invite = parsed.data.inviteToken
        ? store.invitations.find((item) => item.token === parsed.data.inviteToken && !item.accepted_at && !item.cancelled_at)
        : undefined;
      if (parsed.data.inviteToken && (!invite || invite.email.toLowerCase() !== email || new Date(invite.expires_at) < new Date())) {
        throw new ActionError(t("invalidToken"));
      }
      if (!invite && !isBootstrapAdmin(email)) throw new ActionError(t("inviteOnly"));

      const timestamp = new Date().toISOString();
      const userId = createId();
      const confirmToken = createId();
      store.profiles.push({
        id: userId,
        full_name: parsed.data.fullName,
        avatar_url: null,
        phone: null,
        locale: "en",
        email,
        password: parsed.data.password,
        reset_token: null,
        reset_expires: null,
        email_confirmed: false,
        confirm_token: confirmToken,
        theme: "dark",
        created_at: timestamp,
        updated_at: timestamp,
      });
      return { confirmToken };
    });
    return { ok: true, data: { status: "pending" as const, demoConfirmPath: `/auth/confirm-demo?token=${result.confirmToken}` } };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    return { ok: false, error: t("invalidInput") };
  }
}

/** Demo mode returns the reset token so the UI can show the link; Supabase mode emails it and returns null. */
export async function forgotAction(input: unknown): Promise<ActionResult<string | null>> {
  const t = await getTranslations("auth");
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  if (supabaseEnabled) {
    const supabase = await requireSupabase();
    const next = encodeURIComponent("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      redirectTo: `${siteUrl()}/auth/callback?next=${next}`,
    });
    if (error) console.error(error);
    // Same answer whether or not the email exists.
    return { ok: true, data: null };
  }

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

  if (supabaseEnabled) {
    // The recovery link signed the user in via /auth/callback.
    if (!(await getUserId())) return { ok: false, error: t("invalidToken") };
    const supabase = await requireSupabase();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { ok: false, error: t("invalidInput") };
    return { ok: true, data: null };
  }

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
  if (supabaseEnabled) {
    const supabase = await requireSupabase();
    await supabase.auth.signOut();
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
  await clearSignedIn();
  revalidatePath("/", "layout");
}
