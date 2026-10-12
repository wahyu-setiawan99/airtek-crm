import { DEMO_PASSWORD } from "@/lib/constants";
import { subtotal } from "@/lib/domain";
import { jakartaDate, jakartaParts } from "@/lib/format";
import type { Stage, StageType, Store } from "@/types/crm";

export const STORE_VERSION = 3;

const id = {
  org: "10000000-0000-4000-8000-000000000001",
  org2: "10000000-0000-4000-8000-000000000002",
  adi: "20000000-0000-4000-8000-000000000001",
  sari: "20000000-0000-4000-8000-000000000002",
  budi: "20000000-0000-4000-8000-000000000003",
  rina: "20000000-0000-4000-8000-000000000004",
  team: "30000000-0000-4000-8000-000000000001",
  hvac: "40000000-0000-4000-8000-000000000001",
  pump: "40000000-0000-4000-8000-000000000002",
  maint: "40000000-0000-4000-8000-000000000003",
  umum: "40000000-0000-4000-8000-000000000004",
  nindya: "50000000-0000-4000-8000-000000000001",
  palindo: "50000000-0000-4000-8000-000000000002",
  bintang: "50000000-0000-4000-8000-000000000003",
  iain: "50000000-0000-4000-8000-000000000004",
  siloam: "50000000-0000-4000-8000-000000000005",
  bandara: "50000000-0000-4000-8000-000000000006",
  andi: "60000000-0000-4000-8000-000000000001",
  dewi: "60000000-0000-4000-8000-000000000002",
  leo: "60000000-0000-4000-8000-000000000003",
  rahman: "60000000-0000-4000-8000-000000000004",
  maya: "60000000-0000-4000-8000-000000000005",
  farid: "60000000-0000-4000-8000-000000000006",
  tagHvac: "80000000-0000-4000-8000-000000000001",
  tagPump: "80000000-0000-4000-8000-000000000002",
  tagTdg: "80000000-0000-4000-8000-000000000003",
  tagLift: "80000000-0000-4000-8000-000000000004",
  tagAc: "80000000-0000-4000-8000-000000000005",
  reasonPrice: "81000000-0000-4000-8000-000000000001",
  reasonCompetitor: "81000000-0000-4000-8000-000000000002",
  reasonBudget: "81000000-0000-4000-8000-000000000003",
  reasonNeed: "81000000-0000-4000-8000-000000000004",
  reasonOther: "81000000-0000-4000-8000-000000000005",
};

function stage(
  stageId: string,
  pipelineId: string,
  organizationId: string,
  name: string,
  position: number,
  probability: number,
  rotting: number | null,
  type: StageType,
): Stage {
  return {
    id: stageId,
    organization_id: organizationId,
    pipeline_id: pipelineId,
    name,
    position,
    probability,
    rotting_days: rotting,
    type,
    created_at: jakartaDate(-80, 9),
    updated_at: jakartaDate(-1, 9),
    created_by: id.adi,
  };
}

function openStages(prefix: string, pipelineId: string, organizationId: string, names: [string, number, number][]) {
  return names.map(([name, probability, rotting], index) =>
    stage(`${prefix}${index + 1}`, pipelineId, organizationId, name, index, probability, rotting, "open"),
  );
}

export function createSeed(): Store {
  const { year, month, day } = jakartaParts();
  const seededOn = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const stamp = {
    created_at: jakartaDate(-80, 9),
    updated_at: jakartaDate(-1, 9),
    created_by: id.adi,
  };

  const hvacStages = [
    ...openStages("41000000-0000-4000-8000-00000000000", id.hvac, id.org, [
      ["Kualifikasi", 10, 14],
      ["Analisa Kebutuhan", 25, 14],
      ["Penawaran", 50, 21],
      ["Negosiasi", 70, 14],
      ["Closing", 90, 10],
    ]),
    stage("41000000-0000-4000-8000-000000000006", id.hvac, id.org, "Won", 5, 100, null, "won"),
    stage("41000000-0000-4000-8000-000000000007", id.hvac, id.org, "Lost", 6, 0, null, "lost"),
  ];
  const pumpStages = [
    ...openStages("41000000-0000-4000-8000-00000000001", id.pump, id.org, [
      ["Lead", 15, 10],
      ["Survey", 40, 14],
      ["Quotation", 60, 21],
      ["Negosiasi", 80, 10],
    ]),
    stage("41000000-0000-4000-8000-000000000015", id.pump, id.org, "Won", 4, 100, null, "won"),
    stage("41000000-0000-4000-8000-000000000016", id.pump, id.org, "Lost", 5, 0, null, "lost"),
  ];
  const maintStages = [
    ...openStages("41000000-0000-4000-8000-00000000002", id.maint, id.org, [
      ["Permintaan", 20, 7],
      ["Survey", 45, 10],
      ["Terjadwal", 80, 7],
    ]),
    stage("41000000-0000-4000-8000-000000000024", id.maint, id.org, "Selesai", 3, 100, null, "won"),
    stage("41000000-0000-4000-8000-000000000025", id.maint, id.org, "Batal", 4, 0, null, "lost"),
  ];
  const umumStages = [
    ...openStages("41000000-0000-4000-8000-00000000003", id.umum, id.org2, [
      ["Kualifikasi", 10, 14],
      ["Analisa", 30, 14],
      ["Penawaran", 60, 21],
      ["Negosiasi", 80, 14],
    ]),
    stage("41000000-0000-4000-8000-000000000035", id.umum, id.org2, "Won", 4, 100, null, "won"),
    stage("41000000-0000-4000-8000-000000000036", id.umum, id.org2, "Lost", 5, 0, null, "lost"),
  ];

  const s = {
    hvacQual: hvacStages[0]!.id,
    hvacNeed: hvacStages[1]!.id,
    hvacQuote: hvacStages[2]!.id,
    hvacNego: hvacStages[3]!.id,
    hvacClose: hvacStages[4]!.id,
    hvacWon: hvacStages[5]!.id,
    hvacLost: hvacStages[6]!.id,
    pumpLead: pumpStages[0]!.id,
    pumpSurvey: pumpStages[1]!.id,
    pumpQuote: pumpStages[2]!.id,
    pumpWon: pumpStages[4]!.id,
    pumpLost: pumpStages[5]!.id,
    maintReq: maintStages[0]!.id,
    maintSurvey: maintStages[1]!.id,
    maintSched: maintStages[2]!.id,
    maintDone: maintStages[3]!.id,
  };

  return {
    version: STORE_VERSION,
    seeded_on: seededOn,
    organizations: [
      { ...stamp, id: id.org, name: "PT. Airtek Solusi Nusantara (DEMO)", logo_url: null, currency: "IDR", timezone: "Asia/Jakarta", demo: true },
      { ...stamp, id: id.org2, name: "PT. Angin Baru Internasional", logo_url: null, currency: "IDR", timezone: "Asia/Jakarta", demo: false, created_by: id.adi },
    ],
    profiles: [
      { id: id.adi, full_name: "Adi Pratama", avatar_url: null, phone: "081234560001", locale: "id", email: "adi@airtek.co.id", password: DEMO_PASSWORD, reset_token: null, reset_expires: null, email_confirmed: true, confirm_token: null, theme: "system", created_at: stamp.created_at, updated_at: stamp.updated_at },
      { id: id.sari, full_name: "Sari Wulandari", avatar_url: null, phone: "081234560002", locale: "id", email: "sari@airtek.co.id", password: DEMO_PASSWORD, reset_token: null, reset_expires: null, email_confirmed: true, confirm_token: null, theme: "system", created_at: stamp.created_at, updated_at: stamp.updated_at },
      { id: id.budi, full_name: "Budi Hartono", avatar_url: null, phone: "081234560003", locale: "id", email: "budi@airtek.co.id", password: DEMO_PASSWORD, reset_token: null, reset_expires: null, email_confirmed: true, confirm_token: null, theme: "system", created_at: stamp.created_at, updated_at: stamp.updated_at },
      { id: id.rina, full_name: "Rina Kusuma", avatar_url: null, phone: "081234560004", locale: "id", email: "rina@airtek.co.id", password: DEMO_PASSWORD, reset_token: null, reset_expires: null, email_confirmed: true, confirm_token: null, theme: "system", created_at: stamp.created_at, updated_at: stamp.updated_at },
    ],
    teams: [{ ...stamp, id: id.team, organization_id: id.org, name: "Tim Jakarta", leader_id: id.adi }],
    memberships: [
      { ...stamp, id: "31000000-0000-4000-8000-000000000001", organization_id: id.org, user_id: id.adi, role: "owner", team_id: id.team, disabled_at: null },
      { ...stamp, id: "31000000-0000-4000-8000-000000000002", organization_id: id.org, user_id: id.sari, role: "sales", team_id: id.team, disabled_at: null },
      { ...stamp, id: "31000000-0000-4000-8000-000000000003", organization_id: id.org, user_id: id.budi, role: "manager", team_id: id.team, disabled_at: null },
      { ...stamp, id: "31000000-0000-4000-8000-000000000004", organization_id: id.org, user_id: id.rina, role: "viewer", team_id: null, disabled_at: null },
      { ...stamp, id: "31000000-0000-4000-8000-000000000005", organization_id: id.org2, user_id: id.adi, role: "owner", team_id: null, disabled_at: null },
    ],
    invitations: [
      {
        id: "32000000-0000-4000-8000-000000000001",
        organization_id: id.org,
        email: "baru@airtek.co.id",
        full_name: "Calon Sales",
        role: "sales",
        team_id: null,
        token: "invite-demo-token",
        expires_at: jakartaDate(7, 18),
        accepted_at: null,
        cancelled_at: null,
        created_at: jakartaDate(-1, 10),
        created_by: id.adi,
      },
    ],
    pipelines: [
      { ...stamp, id: id.hvac, organization_id: id.org, name: "Proyek HVAC", description: "Chiller, AHU, dan VRF", color: "#0f766e", position: 0, is_default: true, archived: false },
      { ...stamp, id: id.pump, organization_id: id.org, name: "Pump & Fire", description: "Pompa dan hidran", color: "#0369a1", position: 1, is_default: false, archived: false },
      { ...stamp, id: id.maint, organization_id: id.org, name: "Maintenance", description: "Perawatan berkala", color: "#b45309", position: 2, is_default: false, archived: false },
      { ...stamp, id: id.umum, organization_id: id.org2, name: "Umum", description: null, color: "#0f766e", position: 0, is_default: true, archived: false },
    ],
    stages: [...hvacStages, ...pumpStages, ...maintStages, ...umumStages],
    companies: [
      { ...stamp, id: id.nindya, organization_id: id.org, name: "PT Nindya Karya", industry: "Konstruksi", npwp: "01.234.567.8-012.000", address: "Jl. Letjen TB Simatupang", city: "Jakarta Selatan", province: "DKI Jakarta", phone: "0217654321", email: "proyek@nindyakarya.co.id", website: "https://nindyakarya.co.id", owner_id: id.adi },
      { ...stamp, id: id.palindo, organization_id: id.org, name: "PT. Palindo Inti Nusantara", industry: "Galangan kapal", npwp: null, address: "Kawasan Industri Sekupang", city: "Batam", province: "Kepulauan Riau", phone: "0778456789", email: "procurement@palindo.co.id", website: null, owner_id: id.budi },
      { ...stamp, id: id.bintang, organization_id: id.org, name: "CV Bintang Leo Jaya", industry: "Kontraktor", npwp: null, address: "Jl. Perintis Kemerdekaan", city: "Makassar", province: "Sulawesi Selatan", phone: "0411555666", email: "leo@bintangjaya.co.id", website: null, owner_id: id.sari },
      { ...stamp, id: id.iain, organization_id: id.org, name: "IAIN Parepare", industry: "Pendidikan", npwp: null, address: "Jl. Amal Bakti", city: "Parepare", province: "Sulawesi Selatan", phone: "042121234", email: "umum@iainpare.ac.id", website: "https://iainpare.ac.id", owner_id: id.adi },
      { ...stamp, id: id.siloam, organization_id: id.org, name: "RS Siloam Lippo Village", industry: "Kesehatan", npwp: null, address: "Jl. Siloam No. 6", city: "Tangerang", province: "Banten", phone: "02180646900", email: "facility@siloamhospitals.com", website: null, owner_id: id.adi },
      { ...stamp, id: id.bandara, organization_id: id.org, name: "Bandara Sultan Hasanuddin", industry: "Transportasi", npwp: null, address: "Jl. Bandara Baru", city: "Makassar", province: "Sulawesi Selatan", phone: "0411550108", email: "teknik@hasanuddin-airport.co.id", website: null, owner_id: id.budi },
    ],
    contacts: [
      { ...stamp, id: id.andi, organization_id: id.org, first_name: "Andi", last_name: "Wijaya", company_id: id.nindya, job_title: "Project Manager", email: "andi.wijaya@nindyakarya.co.id", phone: "081298760001", whatsapp: "6281298760001", address: null, owner_id: id.sari, source: "Referral" },
      { ...stamp, id: id.dewi, organization_id: id.org, first_name: "Dewi", last_name: "Lestari", company_id: id.palindo, job_title: "Procurement", email: "dewi.lestari@palindo.co.id", phone: "081298760002", whatsapp: "6281298760002", address: null, owner_id: id.budi, source: "Pameran" },
      { ...stamp, id: id.leo, organization_id: id.org, first_name: "Leo", last_name: "Santoso", company_id: id.bintang, job_title: "Direktur", email: "leo@bintangjaya.co.id", phone: "081298760003", whatsapp: "6281298760003", address: null, owner_id: id.sari, source: "Website" },
      { ...stamp, id: id.rahman, organization_id: id.org, first_name: "Rahman", last_name: "Hakim", company_id: id.iain, job_title: "Bagian Umum", email: "rahman@iainpare.ac.id", phone: "081298760004", whatsapp: "6281298760004", address: null, owner_id: id.adi, source: "Tender" },
      { ...stamp, id: id.maya, organization_id: id.org, first_name: "Maya", last_name: "Putri", company_id: id.siloam, job_title: "Facility Manager", email: "maya.putri@siloamhospitals.com", phone: "081298760005", whatsapp: "6281298760005", address: null, owner_id: id.adi, source: "Referral" },
      { ...stamp, id: id.farid, organization_id: id.org, first_name: "Farid", last_name: "Anwar", company_id: id.bandara, job_title: "Kepala Teknik", email: "farid.anwar@hasanuddin-airport.co.id", phone: "081298760006", whatsapp: "6281298760006", address: null, owner_id: id.budi, source: "Kunjungan" },
    ],
    tags: [
      { ...stamp, id: id.tagHvac, organization_id: id.org, name: "HVAC", color: "#0f766e" },
      { ...stamp, id: id.tagPump, organization_id: id.org, name: "Pompa", color: "#0369a1" },
      { ...stamp, id: id.tagTdg, organization_id: id.org, name: "TDG", color: "#b45309" },
      { ...stamp, id: id.tagLift, organization_id: id.org, name: "Lift", color: "#6d28d9" },
      { ...stamp, id: id.tagAc, organization_id: id.org, name: "AC", color: "#0e7490" },
    ],
    lost_reasons: [
      { ...stamp, id: id.reasonPrice, organization_id: id.org, name: "Harga" },
      { ...stamp, id: id.reasonCompetitor, organization_id: id.org, name: "Kompetitor" },
      { ...stamp, id: id.reasonBudget, organization_id: id.org, name: "Anggaran ditunda" },
      { ...stamp, id: id.reasonNeed, organization_id: id.org, name: "Tidak ada kebutuhan" },
      { ...stamp, id: id.reasonOther, organization_id: id.org, name: "Lainnya" },
    ],
    deals: [
      deal("70000000-0000-4000-8000-000000000001", "Gd Barak CPI", id.hvac, s.hvacQuote, 850_000_000, id.sari, id.nindya, id.andi, 3, 20, -1, "open", 0),
      deal("70000000-0000-4000-8000-000000000002", "Lift IAIN Parepare", id.hvac, s.hvacNego, 910_200_000, id.adi, id.iain, id.rahman, 3, 18, -2, "open", 0),
      deal("70000000-0000-4000-8000-000000000003", "Chiller RS Siloam", id.hvac, s.hvacClose, 1_250_000_000, id.adi, id.siloam, id.maya, 3, 10, 0, "open", 0),
      deal("70000000-0000-4000-8000-000000000004", "AHU Bandara Hasanuddin", id.hvac, s.hvacQual, 680_000_000, id.budi, id.bandara, id.farid, 2, 40, -20, "open", 0),
      deal("70000000-0000-4000-8000-000000000005", "VRF Gedung Bintang Leo", id.hvac, s.hvacNeed, 260_000_000, id.sari, id.bintang, id.leo, 1, 28, -4, "open", 0),
      deal("70000000-0000-4000-8000-000000000006", "Exhaust TDG Workshop Palindo", id.hvac, s.hvacQuote, 310_000_000, id.budi, id.palindo, id.dewi, 2, 22, -3, "open", 1),
      { ...deal("70000000-0000-4000-8000-000000000007", "Instalasi AHU Nindya fase 1", id.hvac, s.hvacWon, 430_000_000, id.adi, id.nindya, id.andi, 2, -12, -12, "won", 0), won_at: jakartaDate(-12, 16), created_at: jakartaDate(-55, 9) },
      { ...deal("70000000-0000-4000-8000-000000000008", "Chiller pengganti Palindo", id.hvac, s.hvacLost, 500_000_000, id.sari, id.palindo, id.dewi, 1, -20, -20, "lost", 0), lost_at: jakartaDate(-20, 11), lost_reason_id: id.reasonPrice, created_at: jakartaDate(-48, 9) },
      deal("70000000-0000-4000-8000-000000000009", "Pompa Hydrant Palindo", id.pump, s.pumpSurvey, 420_000_000, id.budi, id.palindo, id.dewi, 3, 15, -6, "open", 0),
      deal("70000000-0000-4000-8000-000000000010", "Fire Pump IAIN", id.pump, s.pumpQuote, 180_000_000, id.sari, id.iain, id.rahman, 2, 30, -2, "open", 0),
      { ...deal("70000000-0000-4000-8000-000000000011", "Pompa transfer Bintang Leo", id.pump, s.pumpWon, 95_000_000, id.sari, id.bintang, id.leo, 1, -5, -5, "won", 0), won_at: jakartaDate(-5, 15), created_at: jakartaDate(-40, 9) },
      { ...deal("70000000-0000-4000-8000-000000000012", "Hydrant Bandara", id.pump, s.pumpLost, 210_000_000, id.budi, id.bandara, id.farid, 2, -4, -4, "lost", 0), lost_at: jakartaDate(-4, 17), lost_reason_id: id.reasonCompetitor, created_at: jakartaDate(-36, 9) },
      deal("70000000-0000-4000-8000-000000000013", "Maintenance Cooling Tower Bintang Leo", id.maint, s.maintSurvey, 95_000_000, id.sari, id.bintang, id.leo, 2, 7, -1, "open", 0),
      deal("70000000-0000-4000-8000-000000000014", "Service AHU Siloam", id.maint, s.maintSched, 45_000_000, id.adi, id.siloam, id.maya, 2, 3, -8, "open", 0),
      { ...deal("70000000-0000-4000-8000-000000000015", "Cuci cooling tower Nindya", id.maint, s.maintDone, 18_000_000, id.budi, id.nindya, id.andi, 0, -3, -3, "won", 0), won_at: jakartaDate(-3, 14), created_at: jakartaDate(-20, 9) },
    ],
    deal_contacts: [
      { id: "71000000-0000-4000-8000-000000000001", deal_id: "70000000-0000-4000-8000-000000000001", contact_id: id.andi, role: "Pengambil keputusan" },
      { id: "71000000-0000-4000-8000-000000000002", deal_id: "70000000-0000-4000-8000-000000000002", contact_id: id.rahman, role: "Pengguna" },
      { id: "71000000-0000-4000-8000-000000000003", deal_id: "70000000-0000-4000-8000-000000000003", contact_id: id.maya, role: "Pengambil keputusan" },
    ],
    deal_tags: [
      { deal_id: "70000000-0000-4000-8000-000000000001", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000002", tag_id: id.tagLift },
      { deal_id: "70000000-0000-4000-8000-000000000003", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000004", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000005", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000006", tag_id: id.tagTdg },
      { deal_id: "70000000-0000-4000-8000-000000000007", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000008", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000009", tag_id: id.tagPump },
      { deal_id: "70000000-0000-4000-8000-000000000010", tag_id: id.tagPump },
      { deal_id: "70000000-0000-4000-8000-000000000011", tag_id: id.tagPump },
      { deal_id: "70000000-0000-4000-8000-000000000012", tag_id: id.tagPump },
      { deal_id: "70000000-0000-4000-8000-000000000013", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000014", tag_id: id.tagHvac },
      { deal_id: "70000000-0000-4000-8000-000000000015", tag_id: id.tagHvac },
    ],
    products: [
      { ...stamp, id: "82000000-0000-4000-8000-000000000001", organization_id: id.org, name: "AC Split 2 PK", sku: "AC-2PK", unit: "unit", unit_price: 8_500_000, tag_id: id.tagAc },
      { ...stamp, id: "82000000-0000-4000-8000-000000000002", organization_id: id.org, name: "Chiller 200 TR", sku: "CH-200", unit: "unit", unit_price: 890_000_000, tag_id: id.tagAc },
      { ...stamp, id: "82000000-0000-4000-8000-000000000003", organization_id: id.org, name: "Fire Pump Electric", sku: "PH-500", unit: "unit", unit_price: 125_000_000, tag_id: id.tagPump },
      { ...stamp, id: "82000000-0000-4000-8000-000000000004", organization_id: id.org, name: "AC Cassette", sku: "AC-CAS", unit: "unit", unit_price: 18_000_000, tag_id: id.tagAc },
      { ...stamp, id: "82000000-0000-4000-8000-000000000005", organization_id: id.org, name: "Passenger Lift 8 orang", sku: "LF-8", unit: "unit", unit_price: 450_000_000, tag_id: id.tagLift },
      { ...stamp, id: "82000000-0000-4000-8000-000000000006", organization_id: id.org, name: "VRF Outdoor", sku: "VRF-OD", unit: "unit", unit_price: 210_000_000, tag_id: id.tagAc },
      { ...stamp, id: "82000000-0000-4000-8000-000000000007", organization_id: id.org, name: "Jasa Instalasi", sku: "SVC-INST", unit: "lot", unit_price: 75_000_000, tag_id: id.tagHvac },
    ],
    deal_products: [
      line("83000000-0000-4000-8000-000000000001", "70000000-0000-4000-8000-000000000002", "82000000-0000-4000-8000-000000000005", 2, 450_000_000, 0),
      line("83000000-0000-4000-8000-000000000002", "70000000-0000-4000-8000-000000000003", "82000000-0000-4000-8000-000000000002", 1, 890_000_000, 0),
      line("83000000-0000-4000-8000-000000000003", "70000000-0000-4000-8000-000000000003", "82000000-0000-4000-8000-000000000007", 1, 75_000_000, 0),
      line("83000000-0000-4000-8000-000000000004", "70000000-0000-4000-8000-000000000001", "82000000-0000-4000-8000-000000000001", 4, 185_000_000, 5),
    ],
    activities: [
      activity("84000000-0000-4000-8000-000000000001", "call", "Follow up penawaran barak", id.sari, "70000000-0000-4000-8000-000000000001", id.andi, id.nindya, 1, null),
      activity("84000000-0000-4000-8000-000000000002", "meeting", "Review spec chiller Siloam", id.adi, "70000000-0000-4000-8000-000000000003", id.maya, id.siloam, 0, null),
      activity("84000000-0000-4000-8000-000000000003", "visit", "Survey ruang pompa Palindo", id.budi, "70000000-0000-4000-8000-000000000009", id.dewi, id.palindo, -2, null),
      activity("84000000-0000-4000-8000-000000000004", "task", "Kirim jadwal service AHU", id.adi, "70000000-0000-4000-8000-000000000014", id.maya, id.siloam, -1, null),
      activity("84000000-0000-4000-8000-000000000005", "whatsapp", "Konfirmasi shaft lift IAIN", id.sari, "70000000-0000-4000-8000-000000000002", id.rahman, id.iain, 3, null),
      activity("84000000-0000-4000-8000-000000000006", "email", "Kirim MOM negosiasi", id.adi, "70000000-0000-4000-8000-000000000003", id.maya, id.siloam, -6, -6),
    ],
    notes: [
      { ...stamp, id: "85000000-0000-4000-8000-000000000001", organization_id: id.org, body: "Klien minta AHU low noise untuk asrama. Kompetitor sudah kirim angka kasar.", deal_id: "70000000-0000-4000-8000-000000000001", contact_id: null, company_id: null, pinned: true, created_by: id.sari, created_at: jakartaDate(-2, 11) },
      { ...stamp, id: "85000000-0000-4000-8000-000000000002", organization_id: id.org, body: "Shaft sudah tersedia, kapasitas 8 orang, 4 lantai. Target PO sebelum akhir bulan.", deal_id: "70000000-0000-4000-8000-000000000002", contact_id: null, company_id: null, pinned: false, created_by: id.adi, created_at: jakartaDate(-3, 15) },
    ],
    stage_history: [
      { id: "86000000-0000-4000-8000-000000000001", deal_id: "70000000-0000-4000-8000-000000000007", from_stage_id: s.hvacClose, to_stage_id: s.hvacWon, changed_by: id.adi, changed_at: jakartaDate(-12, 16) },
      { id: "86000000-0000-4000-8000-000000000002", deal_id: "70000000-0000-4000-8000-000000000007", from_stage_id: s.hvacNego, to_stage_id: s.hvacClose, changed_by: id.adi, changed_at: jakartaDate(-20, 10) },
      { id: "86000000-0000-4000-8000-000000000003", deal_id: "70000000-0000-4000-8000-000000000011", from_stage_id: s.pumpQuote, to_stage_id: s.pumpWon, changed_by: id.sari, changed_at: jakartaDate(-5, 15) },
      { id: "86000000-0000-4000-8000-000000000004", deal_id: "70000000-0000-4000-8000-000000000015", from_stage_id: s.maintSched, to_stage_id: s.maintDone, changed_by: id.budi, changed_at: jakartaDate(-3, 14) },
      { id: "86000000-0000-4000-8000-000000000005", deal_id: "70000000-0000-4000-8000-000000000008", from_stage_id: s.hvacNego, to_stage_id: s.hvacLost, changed_by: id.sari, changed_at: jakartaDate(-20, 11) },
      { id: "86000000-0000-4000-8000-000000000006", deal_id: "70000000-0000-4000-8000-000000000012", from_stage_id: s.pumpQuote, to_stage_id: s.pumpLost, changed_by: id.budi, changed_at: jakartaDate(-4, 17) },
    ],
    audit_logs: [
      { id: "87000000-0000-4000-8000-000000000001", organization_id: id.org, entity: "deal", entity_id: "70000000-0000-4000-8000-000000000007", action: "won", diff: { title: "Instalasi AHU Nindya fase 1" }, user_id: id.adi, created_at: jakartaDate(-12, 16) },
    ],
    notifications: [
      { id: "88000000-0000-4000-8000-000000000001", organization_id: id.org, user_id: id.adi, type: "activity_due", payload: { title: "Kirim jadwal service AHU", href: "/activities" }, read_at: null, created_at: jakartaDate(-1, 8) },
      { id: "88000000-0000-4000-8000-000000000002", organization_id: id.org, user_id: id.sari, type: "deal_assigned", payload: { title: "Gd Barak CPI", href: "/deals/70000000-0000-4000-8000-000000000001" }, read_at: null, created_at: jakartaDate(-2, 9) },
      { id: "88000000-0000-4000-8000-000000000003", organization_id: id.org, user_id: id.adi, type: "mention", payload: { title: "Lift IAIN Parepare", href: "/deals/70000000-0000-4000-8000-000000000002" }, read_at: jakartaDate(-1, 12), created_at: jakartaDate(-4, 9) },
    ],
    saved_views: [
      { id: "89000000-0000-4000-8000-000000000001", organization_id: id.org, user_id: id.sari, pipeline_id: id.hvac, name: "Deal saya", filters: { mine: true, view: "kanban" }, is_shared: false, created_at: jakartaDate(-10, 9) },
    ],
  };
}

function deal(
  dealId: string,
  title: string,
  pipelineId: string,
  stageId: string,
  value: number,
  ownerId: string,
  companyId: string,
  contactId: string,
  priority: number,
  closeInDays: number,
  lastActivityDays: number,
  status: "open" | "won" | "lost",
  position: number,
) {
  return {
    id: dealId,
    organization_id: id.org,
    title,
    pipeline_id: pipelineId,
    stage_id: stageId,
    value,
    currency: "IDR",
    probability_override: null,
    expected_close_date: jakartaDate(closeInDays, 17),
    priority,
    company_id: companyId,
    primary_contact_id: contactId,
    owner_id: ownerId,
    status,
    lost_reason_id: null,
    won_at: null,
    lost_at: null,
    position,
    last_activity_at: jakartaDate(lastActivityDays, 11),
    description: null,
    created_at: jakartaDate(-30, 9),
    updated_at: jakartaDate(lastActivityDays, 11),
    created_by: ownerId,
  };
}

function line(lineId: string, dealId: string, productId: string, qty: number, unitPrice: number, discount: number) {
  return {
    id: lineId,
    deal_id: dealId,
    product_id: productId,
    qty,
    unit_price: unitPrice,
    discount_pct: discount,
    subtotal: subtotal(qty, unitPrice, discount),
  };
}

function activity(
  activityId: string,
  type: "call" | "meeting" | "email" | "task" | "visit" | "whatsapp",
  subject: string,
  assignee: string,
  dealId: string,
  contactId: string,
  companyId: string,
  dueDays: number,
  doneDays: number | null,
) {
  return {
    id: activityId,
    organization_id: id.org,
    type,
    subject,
    note: null,
    due_at: jakartaDate(dueDays, dueDays === 0 ? 15 : 10),
    done_at: doneDays === null ? null : jakartaDate(doneDays, 16),
    result_note: doneDays === null ? null : "Selesai, klien minta revisi minor.",
    assigned_to: assignee,
    deal_id: dealId,
    contact_id: contactId,
    company_id: companyId,
    created_at: jakartaDate(dueDays - 2, 9),
    updated_at: jakartaDate(doneDays ?? dueDays, 9),
    created_by: assignee,
  };
}
