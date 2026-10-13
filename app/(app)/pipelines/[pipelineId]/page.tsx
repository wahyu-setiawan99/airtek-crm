import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DealsRealtime } from "@/components/deals-realtime";
import { PipelineBoard } from "@/components/pipeline-board";
import type { AppLocale } from "@/i18n/locale";
import { preload, withStore, type TableName } from "@/lib/store";
import { buildPipeline } from "@/lib/queries";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["pipelines", "stages", "deals", "deal_tags", "tags", "companies", "contacts", "activities", "memberships", "profiles", "lost_reasons", "saved_views"];

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ pipelineId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  preload(TABLES);
  const { pipelineId } = await params;
  const locale = await getLocale();
  const query = await searchParams;
  const session = await requireSession();
  const data = await withStore(
    TABLES,
    (store) => buildPipeline(store, session, pipelineId),
  );
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
