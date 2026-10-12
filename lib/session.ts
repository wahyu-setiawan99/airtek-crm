import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { readStore } from "@/lib/demo/store";
import type { Membership, Organization, Profile, Role } from "@/types/crm";

export type Session = {
  userId: string;
  organizationId: string;
  role: Role;
  profile: Profile;
  organization: Organization;
  memberships: Membership[];
};

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const userId = jar.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const store = readStore();
  const profile = store.profiles.find((item) => item.id === userId);
  if (!profile) return null;

  const memberships = store.memberships.filter((item) => item.user_id === userId);
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
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const jar = await cookies();
    if (jar.get(SESSION_COOKIE)?.value) {
      nextRedirect("/auth/sign-out");
    }
    const locale = await getLocale();
    redirect({ href: "/login", locale });
    throw new Error("Unauthenticated");
  }
  return session;
}
