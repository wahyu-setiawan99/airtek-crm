"use server";

import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { ActionError, type ActionResult } from "@/lib/action";
import { cookieOptions, ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { addMembership, provisionOrganization } from "@/lib/demo/onboarding";
import { createId, mutateStore, readStore } from "@/lib/demo/store";
import { siteUrl, supabaseEnabled } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { commitSupabaseStore, emptyStore } from "@/lib/supabase/store";
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

export async function loginAction(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t("invalidInput") };

  if (supabaseEnabled) {
    const supabase = await requireSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
    if (error || !data.user) return { ok: false, error: t("invalidCredentials") };
    const { data: memberships } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", data.user.id)
      .order("created_at")
      .limit(1);
    const organizationId = memberships?.[0]?.organization_id as string | undefined;
    if (!organizationId) {
      await supabase.auth.signOut();
      return { ok: false, error: t("invalidCredentials") };
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
  const membership = store.memberships.find((item) => item.user_id === profile.id);
  if (!membership) return { ok: false, error: t("invalidCredentials") };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, profile.id, cookieOptions);
  await setOrg(membership.organization_id);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

async function registerWithSupabase(data: {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  inviteToken?: string | null;
}): Promise<ActionResult> {
  const t = await getTranslations("auth");
  const admin = createAdminClient();
  const email = data.email.toLowerCase();

  let invite: Invitation | null = null;
  if (data.inviteToken) {
    const { data: row } = await admin
      .from("invitations")
      .select("*")
      .eq("token", data.inviteToken)
      .is("accepted_at", null)
      .maybeSingle();
    invite = (row as Invitation | null) ?? null;
    if (!invite || invite.email.toLowerCase() !== email || new Date(invite.expires_at) < new Date()) {
      return { ok: false, error: t("invalidToken") };
    }
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });
  if (error || !created.user) {
    const taken = error?.code === "email_exists" || /already/i.test(error?.message ?? "");
    return { ok: false, error: taken ? t("emailTaken") : t("invalidInput") };
  }
  const userId = created.user.id;

  try {
    const before = emptyStore();
    if (invite) before.invitations = [invite];
    const after = structuredClone(before);
    let organizationId: string;
    if (invite) {
      const accepted = after.invitations[0];
      if (!accepted) throw new Error("invitation missing");
      addMembership(after, accepted.organization_id, userId, accepted.role, accepted.created_by);
      accepted.accepted_at = new Date().toISOString();
      organizationId = accepted.organization_id;
    } else {
      organizationId = provisionOrganization(after, userId, data.organizationName);
    }
    await commitSupabaseStore(before, after, {
      organizations: invite ? [invite.organization_id] : [],
      profiles: [userId],
    });

    const supabase = await requireSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: data.password });
    if (signInError) throw signInError;
    await setOrg(organizationId);
  } catch (failure) {
    console.error(failure);
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: t("invalidInput") };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function registerAction(input: unknown): Promise<ActionResult> {
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
    await setOrg(result.organizationId);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
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
    const locale = await getLocale();
    const next = encodeURIComponent(`/${locale}/reset-password`);
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
    const supabase = await requireSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: t("invalidToken") };
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
  revalidatePath("/", "layout");
}
