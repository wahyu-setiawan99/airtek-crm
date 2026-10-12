import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { loadStore } from "@/lib/store";
import { defaultPipelineId } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function PipelinesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const pipelineId = defaultPipelineId(await loadStore(), session.organizationId);
  if (!pipelineId) redirect({ href: "/settings/pipelines", locale });
  redirect({ href: `/pipelines/${pipelineId}`, locale });
}
