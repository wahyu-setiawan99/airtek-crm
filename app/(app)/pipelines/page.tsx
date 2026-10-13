import { redirect } from "next/navigation";
import { loadStore } from "@/lib/store";
import { defaultPipelineId } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function PipelinesIndex() {
  const session = await requireSession();
  const pipelineId = defaultPipelineId(await loadStore(), session.organizationId);
  if (!pipelineId) redirect("/settings/pipelines");
  redirect(`/pipelines/${pipelineId}`);
}
