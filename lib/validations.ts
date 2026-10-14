import { z } from "zod";
import { CLIENT_TYPES } from "@/lib/client-type";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(100),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(100),
  organizationName: z.string().trim().max(120).optional(),
  inviteToken: z.string().nullable(),
});

export const forgotSchema = z.object({
  email: z.email(),
});

export const resetSchema = z.object({
  token: z.string().max(200),
  password: z.string().min(8).max(100),
});

export const dealSchema = z.object({
  id: z.string().nullable(),
  title: z.string().trim().min(2).max(160),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  value: z.number().nonnegative(),
  companyId: z.string().nullable(),
  contactId: z.string().nullable(),
  ownerId: z.string().min(1),
  priority: z.number().int().min(0).max(3),
  expectedCloseDate: z.string().nullable(),
  tagIds: z.array(z.string()),
  probabilityOverride: z.number().min(0).max(100).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  presalesDealId: z.string().nullable().optional(),
});

export const quickDealSchema = z.object({
  title: z.string().trim().min(2).max(160),
  value: z.number().nonnegative(),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  companyId: z.string().nullable(),
});

export const moveDealSchema = z.object({
  pipelineId: z.string().min(1),
  dealId: z.string().min(1),
  toStageId: z.string().min(1),
  columns: z.array(z.object({ stageId: z.string(), dealIds: z.array(z.string()) })),
  lostReasonId: z.string().nullable(),
});

export const contactSchema = z.object({
  id: z.string().nullable(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80),
  companyId: z.string().nullable(),
  jobTitle: z.string().max(80).nullable(),
  email: z.union([z.email(), z.literal("")]).nullable(),
  phone: z.string().max(30).nullable(),
  whatsapp: z.string().max(30).nullable(),
  source: z.string().max(80).nullable(),
  ownerId: z.string().min(1),
  force: z.boolean().optional(),
});

export const companySchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(2).max(160),
  clientType: z.enum(CLIENT_TYPES),
  city: z.string().max(80).nullable(),
  province: z.string().max(80).nullable(),
  phone: z.string().max(30).nullable(),
  email: z.union([z.email(), z.literal("")]).nullable(),
  website: z.string().max(160).nullable(),
  npwp: z.string().max(40).nullable(),
  address: z.string().max(240).nullable(),
  ownerId: z.string().min(1),
  force: z.boolean().optional(),
});

export const activitySchema = z.object({
  id: z.string().nullable(),
  type: z.enum(["call", "meeting", "email", "task", "visit", "whatsapp"]),
  subject: z.string().trim().min(2).max(160),
  note: z.string().max(2000).nullable(),
  dueAt: z.string().min(4),
  assignedTo: z.string().min(1),
  dealId: z.string().nullable(),
  contactId: z.string().nullable(),
  companyId: z.string().nullable(),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  dealId: z.string().nullable(),
  contactId: z.string().nullable(),
  companyId: z.string().nullable(),
});

export const productSchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(2).max(120),
  sku: z.string().max(40).nullable(),
  unit: z.string().trim().min(1).max(20),
  unitPrice: z.number().nonnegative(),
  tagId: z.string().min(1),
});

export const lineSchema = z.object({
  dealId: z.string().min(1),
  productId: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().max(30).nullable(),
  locale: z.enum(["id", "en"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(100),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const inviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(2).max(80),
  role: z.enum(["admin", "sales"]),
  teamId: z.string().nullable(),
});

export const pipelineSchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(2).max(80),
  description: z.string().max(200).nullable(),
  color: z.string().min(4).max(20),
});

export const stageSchema = z.object({
  id: z.string().nullable(),
  pipelineId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  probability: z.number().min(0).max(100),
  rottingDays: z.number().int().min(0).max(365).nullable(),
  type: z.enum(["open", "won", "lost"]),
});

export const tagSchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(1).max(24),
  color: z.string().min(4).max(20),
});

export const reasonSchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(2).max(80),
});

export const importContactSchema = z.object({
  rows: z.array(
    z.object({
      firstName: z.string().min(1),
      lastName: z.string(),
      email: z.string(),
      phone: z.string(),
      company: z.string(),
      jobTitle: z.string(),
    }),
  ),
});

export const savedViewSchema = z.object({
  pipelineId: z.string().min(1),
  name: z.string().trim().min(2).max(40),
  filters: z.object({
    q: z.string().optional(),
    owner: z.string().optional(),
    tag: z.string().optional(),
    mine: z.boolean().optional(),
    view: z.string().optional(),
  }),
});

/** Inline edits on the deal page: every field optional, only sent fields change. */
export const dealPatchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  value: z.number().nonnegative().optional(),
  probabilityOverride: z.number().int().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  companyId: z.string().nullable().optional(),
  ownerCompanyId: z.string().nullable().optional(),
  consultantCompanyId: z.string().nullable().optional(),
  contractorCompanyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  ownerId: z.string().min(1).optional(),
  tagIds: z.array(z.string()).optional(),
  description: z.string().max(8000).nullable().optional(),
  stageId: z.string().min(1).optional(),
  projectCity: z.string().max(80).nullable().optional(),
  projectProvince: z.string().max(80).nullable().optional(),
  presalesDealId: z.string().nullable().optional(),
});

export const salesTargetSchema = z.object({
  userId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().nonnegative(),
});

export const dealContactRoleSchema = z.object({
  linkId: z.string().min(1),
  role: z.enum(CLIENT_TYPES).nullable(),
});
