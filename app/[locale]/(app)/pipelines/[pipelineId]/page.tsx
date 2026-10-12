import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
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
  searchParams: Promise<{ view?: string; q?: string; owner?: string; tag?: string; mine?: string }>;
}) {
  const { locale, pipelineId } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const session = await requireSession();
  const data = buildPipeline(await loadStore(), session, pipelineId);
  if (!data) notFound();
  return (
    <PipelineBoard
      data={data}
      locale={locale as AppLocale}
      filters={{
        q: query.q ?? "",
        owner: query.owner ?? "",
        tag: query.tag ?? "",
        mine: query.mine === "1",
        view: query.view ?? "kanban",
      }}
    />
  );
}
