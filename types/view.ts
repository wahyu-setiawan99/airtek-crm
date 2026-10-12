import type { ActivityType, DealStatus, Role, SavedView, StageType } from "@/types/crm";

export type TagChip = { id: string; name: string; color: string };
export type Option = { id: string; name: string };

export type BoardDeal = {
  id: string;
  title: string;
  value: number;
  probability: number;
  weighted: number;
  priority: number;
  status: DealStatus;
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  ownerId: string;
  ownerName: string;
  tags: TagChip[];
  expectedCloseDate: string | null;
  lastActivityAt: string | null;
  activityStatus: "scheduled" | "overdue" | "none";
  rotting: boolean;
  canEdit: boolean;
  stageId: string;
  createdAt: string;
};

export type BoardStage = {
  id: string;
  name: string;
  probability: number;
  rottingDays: number | null;
  type: StageType;
  deals: BoardDeal[];
};

export type PipelineData = {
  pipeline: { id: string; name: string; color: string };
  pipelines: Option[];
  stages: BoardStage[];
  companies: Option[];
  contacts: { id: string; name: string; companyId: string | null }[];
  owners: Option[];
  tags: TagChip[];
  lostReasons: Option[];
  savedViews: { id: string; name: string; filters: SavedView["filters"] }[];
  me: { id: string; name: string; role: Role; canCreate: boolean; canManage: boolean };
};

export type ShellData = {
  /** Running on the local JSON store instead of Supabase. */
  demo?: boolean;
  user: { id: string; name: string; email: string; role: Role; theme: "light" | "dark" | "system" };
  organization: Option & { demo: boolean };
  organizations: Option[];
  pipelineId: string | null;
  notifications: { id: string; type: "deal_assigned" | "activity_due" | "mention"; title: string; href: string; read: boolean; createdAt: string }[];
  search: {
    deals: { id: string; title: string; subtitle: string }[];
    contacts: { id: string; title: string; subtitle: string }[];
    companies: { id: string; title: string; subtitle: string }[];
  };
};

export type DashboardData = {
  name: string;
  pipelines: Option[];
  pipelineId: string;
  period: "month" | "quarter" | "year";
  openCount: number;
  pipelineValue: number;
  weighted: number;
  wonValue: number;
  winRate: number;
  avgCycle: number;
  funnel: { name: string; total: number; weighted: number }[];
  forecast: { key: string; total: number; weighted: number }[];
  sales: {
    id: string;
    name: string;
    open: number;
    pipeline: number;
    weighted: number;
    won: number;
    winRate: number | null;
    overdue: number;
    href: string;
  }[];
  overdue: { id: string; subject: string; dueAt: string; href: string }[];
};

export type DealDetailData = BoardDeal & {
  probabilityOverride: number | null;
  createdAt: string;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  pipelineId: string;
  stageId: string;
  stages: { id: string; name: string; type: StageType; probability: number }[];
  tags: TagChip[];
  allTags: TagChip[];
  owners: Option[];
  companies: Option[];
  contacts: { id: string; name: string; companyId: string | null }[];
  related: { id: string; name: string; role: string | null; phone: string | null; email: string | null; whatsapp: string | null }[];
  lines: { id: string; name: string; qty: number; unitPrice: number; discount: number; subtotal: number }[];
  catalog: { id: string; name: string; unitPrice: number; unit: string }[];
  lineTotal: number;
  activities: { id: string; type: ActivityType; subject: string; dueAt: string; doneAt: string | null; note: string | null }[];
  notes: { id: string; body: string; author: string; createdAt: string; pinned: boolean }[];
  history: { id: string; from: string | null; to: string; at: string; by: string }[];
  lostReasons: Option[];
  description: string | null;
  pipelineName: string;
  nav: { index: number; total: number; prevId: string | null; nextId: string | null };
  /** Time spent per stage (ms) and when the deal last entered it. */
  stageTimes: Record<string, { ms: number; enteredAt: string }>;
  relatedCount: number;
  primaryContact: { id: string; name: string; jobTitle: string | null; email: string | null; phone: string | null; whatsapp: string | null } | null;
  company: { id: string; name: string; city: string | null; phone: string | null; email: string | null } | null;
  createdByName: string;
  source: string | null;
  canManage: boolean;
  events: DealEvent[];
};

export type DealEvent = {
  id: string;
  action: string;
  field: string | null;
  from: string | null;
  to: string | null;
  at: string;
  by: string;
};

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  jobTitle: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerId: string;
  ownerName: string;
  source: string | null;
  canEdit: boolean;
};

export type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  npwp: string | null;
  address: string | null;
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
};

export type ActivityRow = {
  id: string;
  type: ActivityType;
  subject: string;
  note: string | null;
  dueAt: string;
  doneAt: string | null;
  assigneeId: string;
  assigneeName: string;
  dealId: string | null;
  dealTitle: string | null;
  contactId: string | null;
  companyId: string | null;
  bucket: "overdue" | "today" | "upcoming" | "done";
};

export type ReportData = {
  pipelines: Option[];
  owners: Option[];
  won: number;
  lost: number;
  wonValue: number;
  lostValue: number;
  reasons: { name: string; count: number }[];
  durations: { name: string; days: number }[];
  sales: { name: string; won: number; lost: number; value: number }[];
  rows: { title: string; status: string; value: string; owner: string; closed: string; reason: string }[];
};
