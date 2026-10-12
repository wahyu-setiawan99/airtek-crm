import { setRequestLocale } from "next-intl/server";
import { AcceptInviteForm } from "@/components/accept-invite-form";

export default async function AcceptInvitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AcceptInviteForm />;
}
