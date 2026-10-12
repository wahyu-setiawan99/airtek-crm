import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { supabaseEnabled } from "@/lib/env";
import { loadStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import type { CommitScope } from "@/lib/supabase/store";
import type { Membership, Organization, Profile, Role } from "@/types/crm";

export type Session = {
  userId: string;
  organizationId: string;
  role: Role;
  profile: Profile;
  organization: Organization;
  memberships: Membership[];
};

/** Signed-in user id: Supabase Auth in production, a cookie in demo mode. */
export const getUserId = cache(async (): Promise<string | null> => {
  if (supabaseEnabled) {
    const supabase = await createClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    return data.user?.id ?? null;
  }
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
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

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    if (await getUserId()) {
      const locale = await getLocale();
      redirect({ href: "/onboarding", locale });
    }
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    throw new Error("Unauthenticated");
  }
  return session;
}
