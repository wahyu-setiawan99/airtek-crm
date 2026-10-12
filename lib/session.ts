import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { readStore } from "@/lib/demo/store";
import { supabaseEnabled } from "@/lib/env";
import { loadStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import type { CommitScope } from "@/lib/supabase/store";
import type { User } from "@supabase/supabase-js";
import type { Membership, Organization, Profile, Role } from "@/types/crm";

export type Session = {
  userId: string;
  organizationId: string;
  role: Role;
  profile: Profile;
  organization: Organization;
  memberships: Membership[];
};

/** One Auth round-trip per request. Every other helper reads this cache. */
export const getAuthUser = cache(async (): Promise<User | null> => {
  if (!supabaseEnabled) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Signed-in user id: Supabase Auth in production, a cookie in demo mode. */
export const getUserId = cache(async (): Promise<string | null> => {
  if (supabaseEnabled) return (await getAuthUser())?.id ?? null;
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
});

/** Active membership for this user. One indexed read — does not load the CRM snapshot. */
export const hasActiveMembership = cache(async (): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) return false;
  if (supabaseEnabled) {
    const supabase = await createClient();
    if (!supabase) return false;
    const { data } = await supabase.from("memberships").select("organization_id").eq("user_id", userId).is("disabled_at", null).limit(1);
    return Boolean(data && data.length > 0);
  }
  return readStore().memberships.some((item) => item.user_id === userId && !item.disabled_at);
});

export const getSession = cache(async (): Promise<Session | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const jar = await cookies();
  const store = await loadStore();
  const profile = store.profiles.find((item) => item.id === userId);
  if (!profile) return null;

  const memberships = store.memberships.filter((item) => item.user_id === userId && !item.disabled_at);
  if (memberships.length === 0) return null;

  const requested = jar.get(ORG_COOKIE)?.value;
  const membership = memberships.find((item) => item.organization_id === requested) ?? memberships[0];
  if (!membership) return null;
  const organization = store.organizations.find((item) => item.id === membership.organization_id);
  if (!organization) return null;

  return {
    userId,
    organizationId: organization.id,
    role: membership.role,
    profile,
    organization,
    memberships,
  };
});

/** What a signed-in user may write: their organizations and their own profile. */
export function sessionScope(session: Session): CommitScope {
  return {
    organizations: session.memberships.map((item) => item.organization_id),
    profiles: [session.userId],
  };
}

/** App pages. Onboarding is only for a signed-in user who still has no organization. */
export async function requireSession(): Promise<Session> {
  const locale = await getLocale();
  const userId = await getUserId();
  if (!userId) {
    redirect({ href: "/login", locale });
    throw new Error("Unauthenticated");
  }
  const session = await getSession();
  if (!session) {
    redirect({ href: "/onboarding", locale });
    throw new Error("Unauthenticated");
  }
  return session;
}
