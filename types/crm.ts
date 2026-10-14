import type { ClientType } from "@/lib/client-type";

export type { ClientType };

export type Role = "owner" | "admin" | "manager" | "sales" | "presales" | "viewer";
export type ThemePreference = "light" | "dark" | "system";
export type StageType = "open" | "won" | "lost";
export type DealStatus = "open" | "won" | "lost";
export type ActivityType = "call" | "meeting" | "email" | "task" | "visit" | "whatsapp";
export type JsonObject = Record<string, string | number | boolean | null>;

type Stamp = {
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type Organization = Stamp & {
  id: string;
  name: string;
  logo_url: string | null;
  currency: string;
  timezone: string;
  /** Presentation org. Real customer data stays in a separate organization. */
  demo: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  locale: "id" | "en";
  email: string;
  /** Demo-only. Supabase Auth replaces this once the project is linked. */
  password: string;
  reset_token: string | null;
  reset_expires: string | null;
  /** Demo-store only. Supabase Auth owns confirmation. */
  email_confirmed: boolean;
  confirm_token: string | null;
  theme: ThemePreference;
  created_at: string;
  updated_at: string;
};

export type Team = Stamp & {
  id: string;
  organization_id: string;
  name: string;
  leader_id: string | null;
};

export type Membership = Stamp & {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  team_id: string | null;
  disabled_at: string | null;
};

export type Invitation = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: Role;
  team_id: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  created_by: string;
};

export type Pipeline = Stamp & {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  is_default: boolean;
  archived: boolean;
};

export type Stage = Stamp & {
  id: string;
  organization_id: string;
  pipeline_id: string;
  name: string;
  position: number;
  probability: number;
  rotting_days: number | null;
  type: StageType;
};

export type Company = Stamp & {
  id: string;
  organization_id: string;
  name: string;
  client_type: ClientType;
  npwp: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  owner_id: string | null;
  external_ref?: string | null;
  import_batch_id?: string | null;
};

export type Contact = Stamp & {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  company_id: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  owner_id: string | null;
  source: string | null;
  external_ref?: string | null;
  import_batch_id?: string | null;
};

export type Deal = Stamp & {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  pipeline_id: string;
  stage_id: string;
  value: number;
  currency: string;
  probability_override: number | null;
  expected_close_date: string | null;
  priority: number;
  company_id: string | null;
  owner_company_id: string | null;
  consultant_company_id: string | null;
  contractor_company_id: string | null;
  primary_contact_id: string | null;
  owner_id: string;
  status: DealStatus;
  lost_reason_id: string | null;
  won_at: string | null;
  lost_at: string | null;
  position: number;
  last_activity_at: string | null;
  project_city: string | null;
  project_province: string | null;
  /** Presales project this Sales deal came from (migration 0012). */
  presales_deal_id?: string | null;
  external_ref?: string | null;
  import_batch_id?: string | null;
};

export type DealContact = {
  id: string;
  deal_id: string;
  contact_id: string;
  role: string | null;
};

export type Tag = Stamp & {
  id: string;
  organization_id: string;
  name: string;
  color: string;
};

export type DealTag = {
  deal_id: string;
  tag_id: string;
};

export type LostReason = Stamp & {
  id: string;
  organization_id: string;
  name: string;
};

export type Activity = Stamp & {
  id: string;
  organization_id: string;
  type: ActivityType;
  subject: string;
  note: string | null;
  due_at: string;
  done_at: string | null;
  result_note: string | null;
  assigned_to: string;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  external_ref?: string | null;
  import_batch_id?: string | null;
};

export type Note = Stamp & {
  id: string;
  organization_id: string;
  body: string;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  pinned: boolean;
};

export type Product = Stamp & {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  unit: string;
  unit_price: number;
  tag_id: string | null;
  external_ref?: string | null;
  import_batch_id?: string | null;
};

export type DealProduct = {
  id: string;
  deal_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  subtotal: number;
};

export type StageHistory = {
  id: string;
  deal_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string;
  changed_at: string;
};

export type AuditLog = {
  id: string;
  organization_id: string;
  entity: string;
  entity_id: string;
  action: string;
  diff: JsonObject;
  user_id: string;
  created_at: string;
};

export type AppNotification = {
  id: string;
  organization_id: string;
  user_id: string;
  type: "deal_assigned" | "activity_due" | "mention";
  payload: { title: string; href: string };
  read_at: string | null;
  created_at: string;
};

export type Attachment = {
  id: string;
  organization_id: string;
  storage_path: string;
  file_name: string;
  size: number;
  mime: string;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  created_at: string;
  created_by: string | null;
};

export type CustomField = Stamp & {
  id: string;
  organization_id: string;
  entity: "deal" | "contact" | "company";
  label: string;
  field_type: "text" | "number" | "date" | "select";
  options: string | null;
};

export type CustomFieldValue = {
  id: string;
  organization_id: string;
  field_id: string;
  entity_id: string;
  value: string;
  created_at: string;
};

export type ImportBatch = {
  id: string;
  organization_id: string;
  source: string;
  file_names: string;
  counts: JsonObject;
  created_by: string;
  created_at: string;
};

export type SalesTarget = {
  id: string;
  organization_id: string;
  user_id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type SavedView = {
  id: string;
  organization_id: string;
  user_id: string;
  pipeline_id: string | null;
  name: string;
  filters: {
    q?: string;
    owner?: string;
    tag?: string;
    mine?: boolean;
    view?: string;
  };
  is_shared: boolean;
  created_at: string;
};

export type Store = {
  version: number;
  seeded_on: string;
  organizations: Organization[];
  profiles: Profile[];
  teams: Team[];
  memberships: Membership[];
  invitations: Invitation[];
  pipelines: Pipeline[];
  stages: Stage[];
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  deal_contacts: DealContact[];
  tags: Tag[];
  deal_tags: DealTag[];
  lost_reasons: LostReason[];
  activities: Activity[];
  notes: Note[];
  products: Product[];
  deal_products: DealProduct[];
  stage_history: StageHistory[];
  audit_logs: AuditLog[];
  notifications: AppNotification[];
  saved_views: SavedView[];
  attachments: Attachment[];
  custom_fields: CustomField[];
  custom_field_values: CustomFieldValue[];
  import_batches: ImportBatch[];
  sales_targets: SalesTarget[];
};
