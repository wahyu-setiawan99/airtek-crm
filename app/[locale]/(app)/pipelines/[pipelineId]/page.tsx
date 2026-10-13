import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DealsRealtime } from "@/components/deals-realtime";
import { PipelineBoard } from "@/components/pipeline-board";
import type { AppLocale } from "@/i18n/routing";
import { loadStore } from "@/lib/store";
import { buildPipeline } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; pipelineId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, pipelineId } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await requireSession();
  const data = buildPipeline(await loadStore(), session, pipelineId);
  if (!data) notFound();
  return (
    <>
    <DealsRealtime organizationId={session.organizationId} />
    <PipelineBoard
      data={data}
      locale={locale as AppLocale}
      filters={{
        q: query.q ?? "",
        owner: query.owner ?? "",
        tag: query.tag ?? "",
        mine: query.mine === "1",
        view: query.view ?? "kanban",
        priority: query.priority ?? "",
        valueMin: query.valueMin ?? "",
        valueMax: query.valueMax ?? "",
        condition: query.condition ?? "",
        client: query.client ?? "",
        party: query.party ?? "",
        project: query.project ?? "",
        closeFrom: query.closeFrom ?? "",
        closeTo: query.closeTo ?? "",
        createdFrom: query.createdFrom ?? "",
        createdTo: query.createdTo ?? "",
      }}
    />
    </>
  );
}
