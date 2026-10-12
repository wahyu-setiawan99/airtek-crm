import { setRequestLocale } from "next-intl/server";
import { AcceptInviteForm } from "@/components/accept-invite-form";
import { redirect } from "@/i18n/navigation";
import { getUserId } from "@/lib/session";

export default async function AcceptInvitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getUserId())) redirect({ href: "/login", locale });
  return <AcceptInviteForm />;
}
