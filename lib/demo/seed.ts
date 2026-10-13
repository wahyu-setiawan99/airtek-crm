import { DEMO_PASSWORD } from "@/lib/constants";
import { subtotal } from "@/lib/domain";
import { jakartaDate, jakartaParts } from "@/lib/format";
import type { Activity, ActivityType, Deal, DealProduct, Profile, Role, Stage, StageHistory, StageType, Store } from "@/types/crm";

/**
 * Demo dataset (AGENTS.md §11.3). Used by the local demo store and by `pnpm seed:demo`.
 * Customer names and the top eight deals come from the old Odoo pipeline; the sales team
 * (except Fajrul) is fictional. Dates are relative to today so the demo always looks current.
 */
export const STORE_VERSION = 6;

/** Deterministic UUID: group (record kind) + number. */
const u = (group: number, n: number) => `${String(group).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;

const ORG = u(10, 1);
const ORG2 = u(10, 2);

const people = {
  admin: u(20, 1),
  fajrul: u(20, 2),
  taufik: u(20, 3),
  rani: u(20, 4),
  yusuf: u(20, 5),
  direksi: u(20, 6),
};

const team = u(30, 1);
const pipe = { sales: u(40, 1), presales: u(40, 2), maint: u(40, 3), umum: u(40, 4) };
const tag = { lift: u(80, 1), pompa: u(80, 2), ac: u(80, 3), hvac: u(80, 4) };
const reason = { price: u(81, 1), competitor: u(81, 2), budget: u(81, 3), need: u(81, 4), other: u(81, 5) };

type StageKey = "s1" | "s2" | "s3" | "s4" | "s5" | "sWon" | "sLost" | "p1" | "p2" | "p3" | "p4" | "p5" | "pWon" | "pLost" | "m1" | "m2" | "m3" | "mWon" | "mLost";

const stageDefs: [StageKey, string, string, number, number | null, StageType][] = [
  ["s1", pipe.sales, "Kualifikasi", 10, 14, "open"],
  ["s2", pipe.sales, "Analisa Kebutuhan", 25, 14, "open"],
  ["s3", pipe.sales, "Penawaran", 50, 21, "open"],
  ["s4", pipe.sales, "Negosiasi", 70, 14, "open"],
  ["s5", pipe.sales, "Closing", 90, 10, "open"],
  ["sWon", pipe.sales, "Won", 100, null, "won"],
  ["sLost", pipe.sales, "Lost", 0, null, "lost"],
  ["p1", pipe.presales, "Lead Masuk", 10, 7, "open"],
  ["p2", pipe.presales, "Survey Lokasi", 25, 10, "open"],
  ["p3", pipe.presales, "Desain & BOQ", 40, 14, "open"],
  ["p4", pipe.presales, "Estimasi Biaya", 60, 10, "open"],
  ["p5", pipe.presales, "Serah ke Sales", 80, 7, "open"],
  ["pWon", pipe.presales, "Won", 100, null, "won"],
  ["pLost", pipe.presales, "Lost", 0, null, "lost"],
  ["m1", pipe.maint, "Permintaan", 20, 7, "open"],
  ["m2", pipe.maint, "Survey", 45, 10, "open"],
  ["m3", pipe.maint, "Terjadwal", 80, 7, "open"],
  ["mWon", pipe.maint, "Selesai", 100, null, "won"],
  ["mLost", pipe.maint, "Batal", 0, null, "lost"],
];
const stageId = Object.fromEntries(stageDefs.map(([key], index) => [key, u(41, index + 1)])) as Record<StageKey, string>;
const stageType = Object.fromEntries(stageDefs.map(([key, , , , , type]) => [key, type])) as Record<StageKey, StageType>;
const stagePipeline = Object.fromEntries(stageDefs.map(([key, pipelineId]) => [key, pipelineId])) as Record<StageKey, string>;

const companyDefs = [
  ["nindya", "PT Nindya Karya", "kontraktor", "Jakarta Selatan", "DKI Jakarta", "0217654321", "proyek@nindyakarya.co.id"],
  ["palindo", "PT. Palindo Inti Nusantara", "kontraktor", "Batam", "Kepulauan Riau", "0778456789", "procurement@palindo.co.id"],
  ["poleanro", "PT. Poleanro Arta Konstruksi", "kontraktor", "Makassar", "Sulawesi Selatan", "0411445566", "admin@poleanro.co.id"],
  ["bintang", "CV Bintang Leo Jaya", "kontraktor", "Mamuju", "Sulawesi Barat", "0426221133", "leo@bintangjaya.co.id"],
  ["iain", "IAIN Parepare", "owner", "Parepare", "Sulawesi Selatan", "042121234", "umum@iainpare.ac.id"],
  ["vale", "PT Vale Indonesia", "owner", "Sorowako", "Sulawesi Selatan", "0215249000", "procurement@vale.co.id"],
  ["wahidin", "RSUP Dr. Wahidin Sudirohusodo", "owner", "Makassar", "Sulawesi Selatan", "0411584675", "teknik@rsupwahidin.go.id"],
  ["unam", "UNAM", "owner", "Makassar", "Sulawesi Selatan", "0411866972", "sarpras@unam.ac.id"],
  ["siloam", "RS Siloam Makassar", "owner", "Makassar", "Sulawesi Selatan", "04113000900", "facility@siloamhospitals.com"],
  ["bandara", "Bandara Sultan Hasanuddin", "owner", "Maros", "Sulawesi Selatan", "0411550108", "teknik@hasanuddin-airport.co.id"],
  ["mall", "Nipah Park Makassar", "owner", "Makassar", "Sulawesi Selatan", "04114662000", "engineering@nipahpark.co.id"],
  ["hotel", "Hotel Claro Kendari", "owner", "Kendari", "Sulawesi Tenggara", "0401312888", "chief.engineer@claro.co.id"],
] as const;
type CompanyKey = (typeof companyDefs)[number][0];
const company = Object.fromEntries(companyDefs.map(([key], index) => [key, u(50, index + 1)])) as Record<CompanyKey, string>;

const contactDefs: [string, string, string, CompanyKey, string, string][] = [
  ["dwi", "Dwi", "Sulistyo", "nindya", "Site Manager", "Tender"],
  ["andi", "Andi", "Wijaya", "nindya", "Procurement", "Referral"],
  ["safar", "Safar", "", "palindo", "Project Engineer", "Referral"],
  ["dewi", "Dewi", "Lestari", "palindo", "Purchasing", "Pameran"],
  ["ashadi", "Ashadi", "", "poleanro", "Direktur Teknik", "Kunjungan"],
  ["suri", "Suri", "Rahayu", "bintang", "Direktur", "Website"],
  ["hasyim", "Hasyim", "", "iain", "Kepala Bagian Umum", "Tender"],
  ["syahdi", "Syahdi", "", "vale", "Fire Safety Engineer", "Referral"],
  ["rudi", "Rudi", "Hartono", "vale", "Procurement Lead", "Tender"],
  ["nurul", "Nurul", "Huda", "wahidin", "Kepala Instalasi Sarpras", "Tender"],
  ["ilham", "Ilham", "Saputra", "unam", "Kabag Sarpras", "Kunjungan"],
  ["maya", "Maya", "Putri", "siloam", "Facility Manager", "Referral"],
  ["farid", "Farid", "Anwar", "bandara", "Kepala Teknik", "Kunjungan"],
  ["linda", "Linda", "Kurniawan", "mall", "Building Manager", "Website"],
  ["agus", "Agus", "Salim", "hotel", "Chief Engineer", "Pameran"],
  ["yanti", "Yanti", "Mustafa", "wahidin", "PPK", "Tender"],
  ["bayu", "Bayu", "Pratama", "poleanro", "Estimator", "Kunjungan"],
  ["rizal", "Rizal", "Fahmi", "hotel", "Purchasing", "Website"],
  ["citra", "Citra", "Ayu", "mall", "Tenant Coordinator", "Referral"],
  ["hendra", "Hendra", "Gunawan", "bandara", "Engineer HVAC", "Kunjungan"],
];
const contact = Object.fromEntries(contactDefs.map(([key], index) => [key, u(60, index + 1)]));
const contactCompany = Object.fromEntries(contactDefs.map(([key, , , companyKey]) => [key, company[companyKey]]));

type TagKey = keyof typeof tag;
type DealDef = {
  title: string;
  stage: StageKey;
  value: number;
  owner: keyof typeof people;
  contact: string;
  tag: TagKey;
  priority: number;
  /** Days from today to expected close (negative = past). */
  close: number;
  /** Days since last activity (negative = past). */
  last: number;
  /** Won/lost deals: when they closed, how long ago they were created, and why lost. */
  closedAgo?: number;
  createdAgo?: number;
  reason?: keyof typeof reason;
};

const dealDefs: DealDef[] = [
  // From Odoo
  { title: "Gd Barak CPI", stage: "s4", value: 850_000_000, owner: "fajrul", contact: "dwi", tag: "hvac", priority: 3, close: 6, last: -1 },
  { title: "ADD Gd Sauraja CPI", stage: "s4", value: 7_300_000_000, owner: "fajrul", contact: "dwi", tag: "hvac", priority: 3, close: 20, last: -2 },
  { title: "Gd. Wisma Negara CPI (Pump)", stage: "s4", value: 496_759_721, owner: "taufik", contact: "safar", tag: "pompa", priority: 2, close: 12, last: -3 },
  { title: "Mobile Fire Pump PTVI", stage: "s4", value: 7_900_000_000, owner: "taufik", contact: "syahdi", tag: "pompa", priority: 3, close: 35, last: -6 },
  { title: "AC Presisi UNAM", stage: "s5", value: 530_800_000, owner: "fajrul", contact: "ilham", tag: "ac", priority: 2, close: 4, last: -1 },
  { title: "Gd. Bunker Wahidin", stage: "s5", value: 330_000_000, owner: "fajrul", contact: "ashadi", tag: "hvac", priority: 2, close: 9, last: -2 },
  { title: "Lift IAIN Pare-pare", stage: "s5", value: 910_200_000, owner: "fajrul", contact: "hasyim", tag: "lift", priority: 3, close: 3, last: 0 },
  { title: "Gd. PA Mamuju", stage: "s5", value: 1_400_000_000, owner: "rani", contact: "suri", tag: "hvac", priority: 2, close: 14, last: -4 },
  // Sales — open
  { title: "Chiller Gedung Rawat Inap Wahidin", stage: "s3", value: 2_150_000_000, owner: "rani", contact: "nurul", tag: "hvac", priority: 3, close: 30, last: -3 },
  { title: "VRF Lobby Nipah Park", stage: "s3", value: 640_000_000, owner: "taufik", contact: "linda", tag: "ac", priority: 2, close: 25, last: -5 },
  { title: "Passenger Lift Hotel Claro", stage: "s2", value: 1_180_000_000, owner: "rani", contact: "agus", tag: "lift", priority: 2, close: 45, last: -9 },
  { title: "AHU Terminal Bandara Hasanuddin", stage: "s1", value: 980_000_000, owner: "taufik", contact: "farid", tag: "hvac", priority: 2, close: 60, last: -21 },
  { title: "Booster Pump RS Siloam", stage: "s2", value: 215_000_000, owner: "fajrul", contact: "maya", tag: "pompa", priority: 1, close: 28, last: -2 },
  { title: "AC Split Kantor Poleanro", stage: "s1", value: 96_000_000, owner: "taufik", contact: "bayu", tag: "ac", priority: 1, close: 40, last: -18 },
  { title: "Service Lift Nipah Park", stage: "s3", value: 145_000_000, owner: "rani", contact: "citra", tag: "lift", priority: 1, close: 15, last: -1 },
  { title: "Jockey Pump Gedung Vale", stage: "s2", value: 120_000_000, owner: "taufik", contact: "rudi", tag: "pompa", priority: 1, close: 33, last: -7 },
  // Sales — won (last 6 months)
  { title: "Instalasi AHU Nindya Fase 1", stage: "sWon", value: 430_000_000, owner: "fajrul", contact: "andi", tag: "hvac", priority: 2, close: -150, last: -150, closedAgo: -150, createdAgo: -205 },
  { title: "Fire Pump Diesel Vale", stage: "sWon", value: 1_250_000_000, owner: "taufik", contact: "rudi", tag: "pompa", priority: 3, close: -118, last: -118, closedAgo: -118, createdAgo: -170 },
  { title: "AC Cassette Hotel Claro", stage: "sWon", value: 285_000_000, owner: "rani", contact: "rizal", tag: "ac", priority: 1, close: -84, last: -84, closedAgo: -84, createdAgo: -130 },
  { title: "Service Lift IAIN", stage: "sWon", value: 78_000_000, owner: "fajrul", contact: "hasyim", tag: "lift", priority: 1, close: -52, last: -52, closedAgo: -52, createdAgo: -90 },
  { title: "Chiller Siloam Fase 2", stage: "sWon", value: 1_620_000_000, owner: "fajrul", contact: "maya", tag: "hvac", priority: 3, close: -27, last: -27, closedAgo: -27, createdAgo: -95 },
  { title: "Hydrant Gudang Palindo", stage: "sWon", value: 365_000_000, owner: "taufik", contact: "dewi", tag: "pompa", priority: 2, close: -9, last: -9, closedAgo: -9, createdAgo: -60 },
  // Sales — lost
  { title: "Chiller Pengganti Palindo", stage: "sLost", value: 500_000_000, owner: "rani", contact: "dewi", tag: "hvac", priority: 1, close: -135, last: -135, closedAgo: -135, createdAgo: -175, reason: "price" },
  { title: "Lift Barang Nipah Park", stage: "sLost", value: 720_000_000, owner: "rani", contact: "linda", tag: "lift", priority: 2, close: -66, last: -66, closedAgo: -66, createdAgo: -120, reason: "competitor" },
  { title: "AC Ruang Server Wahidin", stage: "sLost", value: 190_000_000, owner: "taufik", contact: "yanti", tag: "ac", priority: 1, close: -15, last: -15, closedAgo: -15, createdAgo: -70, reason: "budget" },
  // Presales
  { title: "Survey HVAC RS Siloam Gedung B", stage: "p2", value: 1_800_000_000, owner: "yusuf", contact: "maya", tag: "hvac", priority: 2, close: 50, last: -1 },
  { title: "BOQ Fire System Vale Smelter", stage: "p3", value: 4_500_000_000, owner: "yusuf", contact: "syahdi", tag: "pompa", priority: 3, close: 70, last: -4 },
  { title: "Desain Lift Rusun Mamuju", stage: "p3", value: 2_300_000_000, owner: "yusuf", contact: "suri", tag: "lift", priority: 2, close: 80, last: -12 },
  { title: "Estimasi Chiller Hotel Claro", stage: "p4", value: 1_350_000_000, owner: "yusuf", contact: "agus", tag: "hvac", priority: 2, close: 40, last: -2 },
  { title: "Lead AC Gedung Rektorat UNAM", stage: "p1", value: 410_000_000, owner: "yusuf", contact: "ilham", tag: "ac", priority: 1, close: 90, last: 0 },
  { title: "Pompa Transfer Bandara", stage: "p5", value: 260_000_000, owner: "yusuf", contact: "hendra", tag: "pompa", priority: 2, close: 20, last: -3 },
  { title: "Survey AC Poleanro Site Office", stage: "p1", value: 75_000_000, owner: "yusuf", contact: "bayu", tag: "ac", priority: 0, close: 75, last: -16 },
  // Maintenance
  { title: "Maintenance Chiller Wahidin 2026", stage: "m2", value: 240_000_000, owner: "rani", contact: "nurul", tag: "hvac", priority: 2, close: 10, last: -2 },
  { title: "Service Berkala Lift Hotel Claro", stage: "m3", value: 60_000_000, owner: "rani", contact: "agus", tag: "lift", priority: 1, close: 5, last: -1 },
  { title: "Cuci Cooling Tower Nindya", stage: "mWon", value: 18_000_000, owner: "taufik", contact: "andi", tag: "hvac", priority: 0, close: -3, last: -3, closedAgo: -3, createdAgo: -20 },
  { title: "Overhaul Pompa Hydrant Siloam", stage: "m1", value: 85_000_000, owner: "taufik", contact: "maya", tag: "pompa", priority: 1, close: 18, last: -9 },
];

const dealId = (index: number) => u(70, index + 1);
const dealIndex = (title: string) => {
  const index = dealDefs.findIndex((item) => item.title === title);
  if (index < 0) throw new Error(`seed deal not found: ${title}`);
  return dealId(index);
};

function profile(userId: string, fullName: string, email: string, phone: string): Profile {
  const at = jakartaDate(-210, 9);
  return {
    id: userId,
    full_name: fullName,
    avatar_url: null,
    phone,
    locale: "en",
    email,
    password: DEMO_PASSWORD,
    reset_token: null,
    reset_expires: null,
    email_confirmed: true,
    confirm_token: null,
    theme: "system",
    created_at: at,
    updated_at: at,
  };
}

export function createSeed(): Store {
  const { year, month, day } = jakartaParts();
  const seededOn = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const stamp = { created_at: jakartaDate(-210, 9), updated_at: jakartaDate(-1, 9), created_by: people.admin };

  const stages: Stage[] = stageDefs.map(([key, pipelineId, name, probability, rotting, type]) => {
    const siblings = stageDefs.filter((item) => item[1] === pipelineId);
    return {
      ...stamp,
      id: stageId[key],
      organization_id: ORG,
      pipeline_id: pipelineId,
      name,
      position: siblings.findIndex((item) => item[0] === key),
      probability,
      rotting_days: rotting,
      type,
    };
  });
  const umumStages: Stage[] = (
    [
      ["Kualifikasi", 10, 14, "open"],
      ["Penawaran", 50, 21, "open"],
      ["Negosiasi", 75, 14, "open"],
      ["Won", 100, null, "won"],
      ["Lost", 0, null, "lost"],
    ] as const
  ).map(([name, probability, rotting, type], position) => ({
    ...stamp,
    id: u(42, position + 1),
    organization_id: ORG2,
    pipeline_id: pipe.umum,
    name,
    position,
    probability,
    rotting_days: rotting,
    type,
  }));

  const positions = new Map<string, number>();
  const deals: Deal[] = dealDefs.map((def, index) => {
    const type = stageType[def.stage];
    const position = positions.get(def.stage) ?? 0;
    positions.set(def.stage, position + 1);
    const createdAgo = def.createdAgo ?? Math.min(def.last - 20, -25);
    const closedAt = def.closedAgo === undefined ? null : jakartaDate(def.closedAgo, 15);
    const contactId = contact[def.contact] ?? null;
    const linkedCompanyId = contactId ? (contactCompany[def.contact] ?? null) : null;
    const linkedType = companyDefs.find((item) => company[item[0]] === linkedCompanyId)?.[2];
    return {
      id: dealId(index),
      organization_id: ORG,
      title: def.title,
      description: null,
      pipeline_id: stagePipeline[def.stage],
      stage_id: stageId[def.stage],
      value: def.value,
      currency: "IDR",
      probability_override: null,
      expected_close_date: jakartaDate(def.close, 17),
      priority: def.priority,
      company_id: linkedCompanyId,
      owner_company_id: linkedType === "owner" ? linkedCompanyId : null,
      consultant_company_id: (linkedType as string | undefined) === "konsultan" ? linkedCompanyId : null,
      contractor_company_id: linkedType === "kontraktor" ? linkedCompanyId : null,
      primary_contact_id: contactId,
      owner_id: people[def.owner],
      status: type === "open" ? "open" : type,
      lost_reason_id: def.reason ? reason[def.reason] : null,
      won_at: type === "won" ? closedAt : null,
      lost_at: type === "lost" ? closedAt : null,
      position,
      last_activity_at: jakartaDate(def.last, 11),
      project_city: companyDefs.find((item) => company[item[0]] === linkedCompanyId)?.[3] ?? null,
      project_province: companyDefs.find((item) => company[item[0]] === linkedCompanyId)?.[4] ?? null,
      created_at: jakartaDate(createdAgo, 9),
      updated_at: jakartaDate(def.last, 11),
      created_by: people[def.owner],
    };
  });

  // Every deal walked through the stages before its current one.
  const history: StageHistory[] = [];
  deals.forEach((deal, index) => {
    const def = dealDefs[index];
    if (!def) return;
    const pipelineStages = stageDefs.filter((item) => item[1] === deal.pipeline_id && item[5] === "open").map((item) => item[0]);
    const target = pipelineStages.indexOf(def.stage);
    const steps = target >= 0 ? pipelineStages.slice(0, target + 1) : [...pipelineStages.slice(0, 3), def.stage];
    const created = new Date(deal.created_at).getTime();
    const end = new Date(closedOrNow(deal)).getTime();
    for (let step = 1; step < steps.length; step++) {
      const from = steps[step - 1];
      const to = steps[step];
      if (!from || !to) continue;
      const at = new Date(created + ((end - created) * step) / steps.length).toISOString();
      history.push({ id: u(86, history.length + 1), deal_id: deal.id, from_stage_id: stageId[from], to_stage_id: stageId[to], changed_by: deal.owner_id, changed_at: at });
    }
  });

  const activities: Activity[] = (
    [
      ["Gd Barak CPI", "call", "Follow up revisi harga AHU", 0, null],
      ["ADD Gd Sauraja CPI", "meeting", "Presentasi teknis ke owner CPI", 2, null],
      ["Mobile Fire Pump PTVI", "visit", "Survey lokasi pump house Sorowako", 8, null],
      ["Gd. Wisma Negara CPI (Pump)", "email", "Kirim datasheet pompa", -2, null],
      ["Lift IAIN Pare-pare", "whatsapp", "Konfirmasi ukuran shaft lift", 1, null],
      ["AC Presisi UNAM", "meeting", "Negosiasi akhir AC presisi", 0, null],
      ["Gd. Bunker Wahidin", "task", "Siapkan kontrak & jaminan pelaksanaan", -1, null],
      ["Gd. PA Mamuju", "call", "Follow up PO dari Bu Suri", -4, null],
      ["Chiller Gedung Rawat Inap Wahidin", "email", "Kirim penawaran chiller 2 unit", 3, null],
      ["VRF Lobby Nipah Park", "visit", "Survey lobby dan rute pipa", 5, null],
      ["Passenger Lift Hotel Claro", "call", "Kualifikasi kebutuhan lift", -9, -9],
      ["Estimasi Chiller Hotel Claro", "task", "Hitung beban pendinginan", 1, null],
      ["BOQ Fire System Vale Smelter", "meeting", "Review BOQ dengan tim Vale", 6, null],
      ["Maintenance Chiller Wahidin 2026", "visit", "Inspeksi chiller sebelum kontrak", 2, null],
      ["Chiller Siloam Fase 2", "meeting", "Kick-off proyek fase 2", -26, -26],
      ["Fire Pump Diesel Vale", "visit", "Commissioning fire pump", -100, -100],
    ] as [string, ActivityType, string, number, number | null][]
  ).map(([title, type, subject, due, done], index) => {
    const id = dealIndex(title);
    const deal = deals.find((item) => item.id === id);
    return {
      id: u(84, index + 1),
      organization_id: ORG,
      type,
      subject,
      note: null,
      due_at: jakartaDate(due, due === 0 ? 15 : 10),
      done_at: done === null ? null : jakartaDate(done, 16),
      result_note: done === null ? null : "Selesai. Klien setuju lanjut ke tahap berikutnya.",
      assigned_to: deal?.owner_id ?? people.admin,
      deal_id: id,
      contact_id: deal?.primary_contact_id ?? null,
      company_id: deal?.company_id ?? null,
      created_at: jakartaDate(Math.min(due, 0) - 3, 9),
      updated_at: jakartaDate(done ?? Math.min(due, 0), 9),
      created_by: deal?.owner_id ?? people.admin,
    };
  });

  const productDefs: [string, string, string, number, TagKey][] = [
    ["Passenger Lift 8 orang", "LF-P08", "unit", 450_000_000, "lift"],
    ["Passenger Lift 13 orang", "LF-P13", "unit", 620_000_000, "lift"],
    ["Service Lift", "LF-SVC", "unit", 280_000_000, "lift"],
    ["Fire Pump Electric", "PM-FPE", "unit", 125_000_000, "pompa"],
    ["Fire Pump Diesel", "PM-FPD", "unit", 210_000_000, "pompa"],
    ["Booster Pump", "PM-BST", "unit", 45_000_000, "pompa"],
    ["Jockey Pump", "PM-JCK", "unit", 18_000_000, "pompa"],
    ["AC Split 2 PK", "AC-SPL2", "unit", 8_500_000, "ac"],
    ["AC Cassette 3 PK", "AC-CAS3", "unit", 18_000_000, "ac"],
    ["VRF Outdoor 20 HP", "AC-VRF20", "unit", 210_000_000, "ac"],
    ["AC Presisi 10 kW", "AC-PRC10", "unit", 165_000_000, "ac"],
    ["Chiller 200 TR", "HV-CH200", "unit", 890_000_000, "hvac"],
    ["AHU 10.000 CFM", "HV-AHU10", "unit", 145_000_000, "hvac"],
    ["Jasa Instalasi", "SVC-INST", "lot", 75_000_000, "hvac"],
  ];
  const productId = (name: string) => u(82, productDefs.findIndex((item) => item[0] === name) + 1);
  const lines: DealProduct[] = (
    [
      ["Lift IAIN Pare-pare", "Passenger Lift 8 orang", 2, 450_000_000, 0],
      ["Lift IAIN Pare-pare", "Jasa Instalasi", 1, 10_200_000, 0],
      ["AC Presisi UNAM", "AC Presisi 10 kW", 3, 165_000_000, 0],
      ["AC Presisi UNAM", "Jasa Instalasi", 1, 35_800_000, 0],
      ["Gd Barak CPI", "AHU 10.000 CFM", 5, 145_000_000, 5],
      ["Gd Barak CPI", "Jasa Instalasi", 1, 161_250_000, 0],
      ["Mobile Fire Pump PTVI", "Fire Pump Diesel", 30, 210_000_000, 0],
      ["Mobile Fire Pump PTVI", "Jasa Instalasi", 1, 1_600_000_000, 0],
      ["Chiller Siloam Fase 2", "Chiller 200 TR", 2, 890_000_000, 9],
    ] as [string, string, number, number, number][]
  ).map(([title, product, qty, price, discount], index) => ({
    id: u(83, index + 1),
    deal_id: dealIndex(title),
    product_id: productId(product),
    qty,
    unit_price: price,
    discount_pct: discount,
    subtotal: subtotal(qty, price, discount),
  }));

  const memberships: [string, Role][] = [
    [people.admin, "owner"],
    [people.fajrul, "manager"],
    [people.taufik, "sales"],
    [people.rani, "sales"],
    [people.yusuf, "presales"],
    [people.direksi, "viewer"],
  ];

  return {
    version: STORE_VERSION,
    seeded_on: seededOn,
    organizations: [
      { ...stamp, id: ORG, name: "PT. Airtek Solusi Nusantara (DEMO)", logo_url: null, currency: "IDR", timezone: "Asia/Jakarta", demo: true },
      { ...stamp, id: ORG2, name: "PT. Angin Baru Internasional", logo_url: null, currency: "IDR", timezone: "Asia/Jakarta", demo: false },
    ],
    profiles: [
      profile(people.admin, "Admin Demo", "admin.demo@airtek.my.id", "081234560001"),
      profile(people.fajrul, "Fajrul", "manager.demo@airtek.my.id", "081234560002"),
      profile(people.taufik, "Taufik Hidayat", "sales1.demo@airtek.my.id", "081234560003"),
      profile(people.rani, "Rani Amelia", "sales2.demo@airtek.my.id", "081234560004"),
      profile(people.yusuf, "Yusuf Ramadhan", "presales.demo@airtek.my.id", "081234560005"),
      profile(people.direksi, "Direksi Demo", "direksi.demo@airtek.my.id", "081234560006"),
    ],
    teams: [{ ...stamp, id: team, organization_id: ORG, name: "Tim Sulawesi", leader_id: people.fajrul }],
    memberships: [
      ...memberships.map(([userId, role], index) => ({
        ...stamp,
        id: u(31, index + 1),
        organization_id: ORG,
        user_id: userId,
        role,
        team_id: role === "viewer" ? null : team,
        disabled_at: null,
      })),
      { ...stamp, id: u(31, 99), organization_id: ORG2, user_id: people.admin, role: "owner" as const, team_id: null, disabled_at: null },
    ],
    invitations: [
      {
        id: u(32, 1),
        organization_id: ORG,
        email: "calon.sales@airtek.my.id",
        full_name: "Calon Sales",
        role: "sales",
        team_id: team,
        token: "invite-demo-token",
        expires_at: jakartaDate(7, 18),
        accepted_at: null,
        cancelled_at: null,
        created_at: jakartaDate(-1, 10),
        created_by: people.admin,
      },
    ],
    pipelines: [
      { ...stamp, id: pipe.sales, organization_id: ORG, name: "Sales", description: "Penawaran sampai closing", color: "#9a1b4b", position: 0, is_default: true, archived: false },
      { ...stamp, id: pipe.presales, organization_id: ORG, name: "Presales", description: "Survey, desain, dan estimasi", color: "#4c2a85", position: 1, is_default: false, archived: false },
      { ...stamp, id: pipe.maint, organization_id: ORG, name: "Maintenance", description: "Kontrak perawatan berkala", color: "#b45309", position: 2, is_default: false, archived: false },
      { ...stamp, id: pipe.umum, organization_id: ORG2, name: "Sales", description: null, color: "#9a1b4b", position: 0, is_default: true, archived: false },
    ],
    stages: [...stages, ...umumStages],
    companies: companyDefs.map(([key, name, clientType, city, province, phone, email], index) => ({
      ...stamp,
      id: company[key],
      organization_id: ORG,
      name,
      client_type: clientType,
      npwp: null,
      address: null,
      city,
      province,
      phone,
      email,
      website: null,
      owner_id: [people.fajrul, people.taufik, people.rani][index % 3] ?? people.fajrul,
    })),
    contacts: contactDefs.map(([key, firstName, lastName, companyKey, jobTitle, source], index) => {
      const phone = `08129876${String(index + 1).padStart(4, "0")}`;
      const domain = companyDefs.find((item) => item[0] === companyKey)?.[6].split("@")[1] ?? "airtek.my.id";
      return {
        ...stamp,
        id: contact[key] ?? u(60, index + 1),
        organization_id: ORG,
        first_name: firstName,
        last_name: lastName,
        company_id: company[companyKey],
        job_title: jobTitle,
        email: `${key}@${domain}`,
        phone,
        whatsapp: `62${phone.slice(1)}`,
        address: null,
        owner_id: [people.fajrul, people.taufik, people.rani][index % 3] ?? people.fajrul,
        source,
      };
    }),
    tags: [
      { ...stamp, id: tag.lift, organization_id: ORG, name: "Lift", color: "#6d28d9" },
      { ...stamp, id: tag.pompa, organization_id: ORG, name: "Pompa", color: "#0369a1" },
      { ...stamp, id: tag.ac, organization_id: ORG, name: "AC", color: "#0e7490" },
      { ...stamp, id: tag.hvac, organization_id: ORG, name: "HVAC", color: "#be123c" },
    ],
    lost_reasons: [
      { ...stamp, id: reason.price, organization_id: ORG, name: "Harga" },
      { ...stamp, id: reason.competitor, organization_id: ORG, name: "Kompetitor" },
      { ...stamp, id: reason.budget, organization_id: ORG, name: "Anggaran ditunda" },
      { ...stamp, id: reason.need, organization_id: ORG, name: "Tidak ada kebutuhan" },
      { ...stamp, id: reason.other, organization_id: ORG, name: "Lainnya" },
    ],
    deals,
    deal_contacts: deals
      .filter((deal) => deal.primary_contact_id)
      .map((deal, index) => ({
        id: u(71, index + 1),
        deal_id: deal.id,
        contact_id: deal.primary_contact_id ?? "",
        role: deal.contractor_company_id ? "kontraktor" : deal.owner_company_id ? "owner" : deal.consultant_company_id ? "konsultan" : null,
      })),
    deal_tags: deals.map((deal, index) => ({ deal_id: deal.id, tag_id: tag[dealDefs[index]?.tag ?? "hvac"] })),
    products: productDefs.map(([name, sku, unit, price, tagKey], index) => ({
      ...stamp,
      id: u(82, index + 1),
      organization_id: ORG,
      name,
      sku,
      unit,
      unit_price: price,
      tag_id: tag[tagKey],
    })),
    deal_products: lines,
    activities,
    notes: [
      { ...stamp, id: u(85, 1), organization_id: ORG, body: "Owner minta AHU low noise untuk barak. Kompetitor sudah kirim angka kasar, kita perlu revisi harga ±5%.", deal_id: dealIndex("Gd Barak CPI"), contact_id: null, company_id: null, pinned: true, created_by: people.fajrul, created_at: jakartaDate(-2, 11) },
      { ...stamp, id: u(85, 2), organization_id: ORG, body: "Shaft sudah tersedia, kapasitas 8 orang, 4 lantai. Target PO sebelum akhir bulan.", deal_id: dealIndex("Lift IAIN Pare-pare"), contact_id: null, company_id: null, pinned: false, created_by: people.fajrul, created_at: jakartaDate(-3, 15) },
      { ...stamp, id: u(85, 3), organization_id: ORG, body: "30 unit fire pump diesel mobile untuk area tambang. Butuh sertifikasi UL/FM, cek lead time pabrikan.", deal_id: dealIndex("Mobile Fire Pump PTVI"), contact_id: null, company_id: null, pinned: true, created_by: people.taufik, created_at: jakartaDate(-6, 10) },
      { ...stamp, id: u(85, 4), organization_id: ORG, body: "Hasil survey: ruang chiller cukup untuk 2 unit 200 TR, perlu perkuatan lantai.", deal_id: dealIndex("Survey HVAC RS Siloam Gedung B"), contact_id: null, company_id: null, pinned: false, created_by: people.yusuf, created_at: jakartaDate(-1, 14) },
    ],
    stage_history: history,
    audit_logs: [],
    notifications: [
      { id: u(88, 1), organization_id: ORG, user_id: people.fajrul, type: "activity_due", payload: { title: "Follow up revisi harga AHU", href: "/activities" }, read_at: null, created_at: jakartaDate(0, 8) },
      { id: u(88, 2), organization_id: ORG, user_id: people.taufik, type: "deal_assigned", payload: { title: "Mobile Fire Pump PTVI", href: `/deals/${dealIndex("Mobile Fire Pump PTVI")}` }, read_at: null, created_at: jakartaDate(-6, 9) },
      { id: u(88, 3), organization_id: ORG, user_id: people.admin, type: "deal_assigned", payload: { title: "Gd. PA Mamuju", href: `/deals/${dealIndex("Gd. PA Mamuju")}` }, read_at: null, created_at: jakartaDate(-4, 9) },
    ],
    saved_views: [
      { id: u(89, 1), organization_id: ORG, user_id: people.fajrul, pipeline_id: pipe.sales, name: "Deal saya", filters: { mine: true, view: "kanban" }, is_shared: false, created_at: jakartaDate(-10, 9) },
    ],
    attachments: [],
    custom_fields: [],
    custom_field_values: [],
    import_batches: [],
    sales_targets: [
      { id: u(95, 1), organization_id: ORG, user_id: people.taufik, month: `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date())}-01`, amount: 2_000_000_000, created_at: stamp.created_at, updated_at: stamp.updated_at, created_by: people.admin },
      { id: u(95, 2), organization_id: ORG, user_id: people.rani, month: `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date())}-01`, amount: 1_500_000_000, created_at: stamp.created_at, updated_at: stamp.updated_at, created_by: people.admin },
    ],
  };
}

function closedOrNow(deal: Deal) {
  return deal.won_at ?? deal.lost_at ?? new Date().toISOString();
}
