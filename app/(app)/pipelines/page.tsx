import { redirect } from "next/navigation";
import { withStore } from "@/lib/store";
import { defaultPipelineId } from "@/lib/queries";
import { requireSession } from "@/lib/session";

export default async function PipelinesIndex() {
  const session = await requireSession();
  const pipelineId = await withStore(["pipelines"], (store) => defaultPipelineId(store, session.organizationId, session.role));
  if (!pipelineId) redirect("/settings/pipelines");
  redirect(`/pipelines/${pipelineId}`);
}
