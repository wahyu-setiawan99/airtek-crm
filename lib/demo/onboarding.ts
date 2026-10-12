import { createId } from "@/lib/demo/store";
import type { Role, StageType, Store } from "@/types/crm";

const now = () => new Date().toISOString();

export function provisionOrganization(store: Store, userId: string, orgName: string) {
  const organizationId = createId();
  const timestamp = now();
  store.organizations.push({
    id: organizationId,
    name: orgName,
    logo_url: null,
    currency: "IDR",
    timezone: "Asia/Jakarta",
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
    created_at: timestamp,
    updated_at: timestamp,
    created_by: userId,
  });

  const pipelineId = createId();
  store.pipelines.push({
    id: pipelineId,
    organization_id: organizationId,
    name: "Sales",
    description: "Pipeline default",
    color: "#0f766e",
    position: 0,
    is_default: true,
    archived: false,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: userId,
  });

  const stages: [string, number, number | null, StageType][] = [
    ["Kualifikasi", 10, 14, "open"],
    ["Analisa Kebutuhan", 25, 14, "open"],
    ["Penawaran", 50, 21, "open"],
    ["Negosiasi", 70, 14, "open"],
    ["Closing", 90, 10, "open"],
    ["Won", 100, null, "won"],
    ["Lost", 0, null, "lost"],
  ];
  stages.forEach(([name, probability, rotting, type], position) => {
    store.stages.push({
      id: createId(),
      organization_id: organizationId,
      pipeline_id: pipelineId,
      name,
      position,
      probability,
      rotting_days: rotting,
      type,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
    });
  });

  [
    ["HVAC", "#0f766e"],
    ["PUMP", "#0369a1"],
    ["TDG", "#b45309"],
    ["LIFT", "#6d28d9"],
  ].forEach(([name, color]) => {
    store.tags.push({
      id: createId(),
      organization_id: organizationId,
      name: name ?? "TAG",
      color: color ?? "#0f766e",
      created_at: timestamp,
      updated_at: timestamp,
      created_by: userId,
    });
  });

  ["Harga", "Kompetitor", "Anggaran ditunda", "Tidak ada kebutuhan", "Lainnya"].forEach((name) => {
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

export function addMembership(store: Store, organizationId: string, userId: string, role: Role, createdBy: string) {
  const timestamp = now();
  store.memberships.push({
    id: createId(),
    organization_id: organizationId,
    user_id: userId,
    role,
    team_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: createdBy,
  });
}
