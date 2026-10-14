import { createId } from "@/lib/demo/store";
import type { Role, StageType, Store } from "@/types/crm";

const now = () => new Date().toISOString();

const LOST_REASONS = ["Harga", "Kompetitor", "Anggaran ditunda", "Tidak ada kebutuhan", "Lainnya"];

const DEFAULT_TAGS: [string, string][] = [
  ["Lift", "#6d28d9"],
  ["Pompa", "#0369a1"],
  ["AC", "#0f766e"],
];

type StageDef = [string, number, number | null, StageType];

const SALES_STAGES: StageDef[] = [
  ["Kualifikasi", 10, 14, "open"],
  ["Analisa Kebutuhan", 25, 14, "open"],
  ["Penawaran", 50, 21, "open"],
  ["Negosiasi", 70, 14, "open"],
  ["Closing", 90, 10, "open"],
  ["Won", 100, null, "won"],
  ["Lost", 0, null, "lost"],
];

/** Presales follows the project from approach to tender (user decision 14 Oct 2026). */
const PRESALES_STAGES: StageDef[] = [
  ["Approach", 10, 14, "open"],
  ["Design", 25, 14, "open"],
  ["Submitted", 40, 14, "open"],
  ["Ready Tender", 55, 14, "open"],
  ["On Tender", 65, 14, "open"],
  ["On Negotiation", 80, 10, "open"],
  ["Deal", 100, null, "won"],
  ["Closed", 100, null, "won"],
  ["Loss", 0, null, "lost"],
];

function addPipeline(
  store: Store,
  organizationId: string,
  userId: string,
  name: string,
  description: string,
  color: string,
  position: number,
  isDefault: boolean,
  stages: StageDef[],
  timestamp: string,
) {
  const pipelineId = createId();
  store.pipelines.push({
    id: pipelineId,
    organization_id: organizationId,
    name,
    description,
    color,
    position,
    is_default: isDefault,
    archived: false,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: userId,
  });
  stages.forEach(([stageName, probability, rotting, type], index) => {
    store.stages.push({
      id: createId(),
      organization_id: organizationId,
      pipeline_id: pipelineId,
      name: stageName,
      position: index,
      probability,
      rotting_days: rotting,
      type,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
    });
  });
  return pipelineId;
}

/** Sales + Presales pipelines and Lift / Pompa / AC tags. */
export function provisionOrganization(store: Store, userId: string, orgName: string, demo = false) {
  const organizationId = createId();
  const timestamp = now();
  store.organizations.push({
    id: organizationId,
    name: orgName,
    logo_url: null,
    currency: "IDR",
    timezone: "Asia/Jakarta",
    demo,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: userId,
  });
  store.memberships.push({
    id: createId(),
    organization_id: organizationId,
    user_id: userId,
    role: "owner",
    team_id: null,
    disabled_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: userId,
  });

  addPipeline(store, organizationId, userId, "Sales", "Pipeline penjualan", "#0f766e", 0, true, SALES_STAGES, timestamp);
  addPipeline(store, organizationId, userId, "Presales", "Survey dan desain sebelum sales", "#6d28d9", 1, false, PRESALES_STAGES, timestamp);

  DEFAULT_TAGS.forEach(([name, color]) => {
    store.tags.push({
      id: createId(),
      organization_id: organizationId,
      name,
      color,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
    });
  });

  LOST_REASONS.forEach((name) => {
    store.lost_reasons.push({
      id: createId(),
      organization_id: organizationId,
      name,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
    });
  });

  return organizationId;
}

export function addMembership(
  store: Store,
  organizationId: string,
  userId: string,
  role: Role,
  createdBy: string,
  teamId: string | null = null,
) {
  const timestamp = now();
  store.memberships.push({
    id: createId(),
    organization_id: organizationId,
    user_id: userId,
    role,
    team_id: teamId,
    disabled_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: createdBy,
  });
}

export function duplicatePipeline(store: Store, pipelineId: string, userId: string) {
  const source = store.pipelines.find((item) => item.id === pipelineId);
  if (!source) return null;
  const timestamp = now();
  const copyId = createId();
  const position = store.pipelines.filter((item) => item.organization_id === source.organization_id).length;
  store.pipelines.push({
    ...source,
    id: copyId,
    name: `${source.name} (salinan)`,
    position,
    is_default: false,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: userId,
  });
  store.stages
    .filter((stage) => stage.pipeline_id === pipelineId)
    .forEach((stage) => {
      store.stages.push({
        ...stage,
        id: createId(),
        pipeline_id: copyId,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: userId,
      });
    });
  return copyId;
}
