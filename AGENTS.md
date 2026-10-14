# AGENTS.md — Airtek CRM

Panduan untuk AI agent (Cursor, Claude, dll) yang membangun project ini. Baca seluruh file ini sebelum menulis kode. Kerjakan per fase, centang checklist saat selesai.

## 0. Cara Kerja Agent & Antrian Kerja (BACA PERTAMA)

User memberi **satu perintah yang sama** setiap sesi: *"Baca AGENTS.md dan lanjutkan Antrian Kerja §0."* Agent menentukan sendiri tugas berikutnya dari daftar di bawah, mengerjakannya sampai selesai, lalu **lanjut ke item berikutnya** — sampai bertemu **kondisi berhenti**.

### 0.1 Antrian kerja (kerjakan berurutan, item teratas yang belum ✅ dan tidak 🔒)
1. [x] **§15.0 Langkah 3** — Speed Insights + Analytics, ukur ulang, isi tabel §15.1.
2. [x] **§16.1–16.2** — jenis klien Konsultan/Kontraktor/Owner (hapus "Industri") + pihak proyek di deal. *(butuh migration `0005`)*
3. [x] **§16.3–16.4** — filter lintas sales di daftar Deal (pipeline, tahap, jenis klien, lokasi, target closing, nilai), badge "Milik {nama}", target sales per bulan, cek duplikat, lokasi proyek. *(migration `0006`)*
4. [x] **§19** — URL tanpa `/id`/`/en` (bahasa dari pengaturan, default English) + halaman depan statis di `/` (tombol Masuk / Buka Dashboard). *(migration `0007`: default `profiles.locale` = `en`)*
5. [x] **§13.8** — QA: Lighthouse desktop ≥ 90, aksesibilitas, nol hydration warning, uji alur lengkap di lokal.
6. [ ] 🔒 **§14 Impor Odoo** — TERKUNCI sampai user menulis di chat bahwa direktur & semua sales sudah aktif di CRM.
7. [x] **§20 Mobile-friendly & PWA** — selesai 13 Okt 2026 (kecuali 🔒 web push). Sisa: user mencoba pasang di HP Android & iPhone lalu melapor.
8. [x] **§15.3, §15.5, §15.6, §15.7** — optimasi besar selesai 13 Okt 2026 (hasil di §15.9). Migration `0008` & `0009` sudah dijalankan user di produksi (13 Okt 2026).
   - ⚠️ 14 Okt 2026: produksi ternyata tidak punya `deals.description` & `profiles.email` (isi `0002` tidak pernah lengkap) → `0011_repair_server_writes.sql`. **0010, 0011, 0012 sudah dijalankan user (14 Okt 2026)**; skema produksi dicek sama dengan lokal di semua tabel. Cek skema produksi: bandingkan kolom tiap tabel lokal vs `GET /rest/v1/<tabel>?select=<kolom>&limit=0` dengan anon key (kolom hilang → error 42703).
9. [ ] 🔒 **Fase 11 AI Gemini** (§17) — TERKUNCI sampai user memberikan `GEMINI_API_KEY` di Vercel/`.env.local`.

Saat item selesai: centang di sini **dan** di checklist fasenya (§5), perbarui status di §13 bila relevan.

### 0.2 Langkah wajib setiap item
1. Baca bagian spesifikasi item itu + §6 (konvensi), §8 (arsitektur data), §18 (lingkungan lokal).
2. Nyalakan lingkungan lokal: `pnpm db:start` → `pnpm dev:seed` → `pnpm dev`. Uji dengan akun §18 sesuai level (`boss`, `admin`, `sales1`, `sales2` @airtek.test); email dicek di Mailpit `http://127.0.0.1:55424`.
3. Tabel/kolom baru → migration baru `supabase/migrations/000N_*.sql` (jangan edit yang lama), `types/crm.ts`, `TABLES` di `lib/supabase/store.ts`, `lib/demo/seed.ts`, `scripts/dev-seed.ts` bila perlu. Uji dengan `pnpm db:reset` + `pnpm dev:seed`.
4. `pnpm lint && pnpm typecheck && pnpm build` harus lulus.
5. Commit kecil (Conventional Commits) → **push** ke `main` → pastikan deploy Vercel **Ready** (status commit di GitHub, atau minta user melihat Vercel → Deployments).

### 0.3 Kondisi berhenti (hentikan antrian, laporkan, tunggu user)
- **Migration baru untuk produksi:** commit di lokal tetapi **JANGAN push** kode yang bergantung padanya. Minta user menjalankan isi `supabase/migrations/000N_*.sql` di Supabase produksi (SQL Editor) dan membalas "SQL 000N sudah" — baru push. (Migration yang murni menambah kolom/tabel boleh dijalankan user lebih dulu; kode baru tidak boleh live sebelum SQL-nya.)
- Butuh tindakan user di dashboard: env/kunci baru di Vercel, pengaturan Supabase, DNS, Resend, dsb.
- Item berikutnya 🔒 terkunci, atau butuh keputusan bisnis yang tidak tertulis di sini.
- Gagal yang tidak bisa diperbaiki setelah 2–3 percobaan (build/test/deploy).

### 0.4 Format laporan ke user (Bahasa Indonesia, singkat)
1. **Selesai:** item apa, commit apa, sudah di-push & deploy Ready atau belum.
2. **Perlu Anda lakukan:** langkah konkret (mis. "jalankan SQL 0005 di Supabase → balas 'SQL 0005 sudah'"), atau "tidak ada".
3. **Berikutnya:** item antrian selanjutnya / alasan berhenti.

### 0.5 Larangan
- Tidak membuat akun, login, atau menjalankan seed di produksi (`airtek.my.id`); seed hanya lokal (`scripts/dev-seed.ts` punya pengaman localhost — jangan dihapus).
- Tidak menyimpan kredensial produksi di repo; tidak mengubah migration lama yang sudah dijalankan.
- Tidak menghapus keputusan user yang tercatat (§11.2 level Boss/Administrator/Sales, §11.3 tanpa demo di produksi, §12 undangan email saja, §13 "Tidak dikerjakan", §16 hanya 3 jenis klien).

## 1. Tujuan
CRM web untuk PT. Airtek Solusi Nusantara (kontraktor HVAC, Pump, TDG, Lift) — menggantikan Odoo CRM dengan UX lebih cepat, multi-pipeline, forecast yang jelas. **Desktop-first** (PC/laptop), tetap **mobile-friendly** dan bisa dipasang sebagai aplikasi (PWA) — §20.

Kelebihan dibanding Odoo yang WAJIB terasa:
- Multi-pipeline dengan stage custom per pipeline (mis. "Proyek HVAC", "Pump & Fire", "Maintenance").
- Probabilitas per stage → **weighted forecast** otomatis di header kolom (bukan hanya total).
- Indikator deal "basi" (tidak ada aktivitas > N hari, warna kartu berubah).
- Drag & drop mulus + optimistic update, quick-add di kolom.
- Command palette (Ctrl+K) untuk cari deal/kontak/perusahaan & aksi cepat.
- Dashboard ringkas: pipeline value, win rate, forecast per bulan, performa sales.
- Halaman detail deal lebih rapi dari Odoo: inline edit + autosave, weighted value, durasi per stage, next activity jelas (lihat §7.1).
- Dark/Light mode, format Rupiah singkat (Rp 18,4 M).

## 2. Tech Stack (jangan ganti tanpa diskusi)
- **Next.js 15** (App Router, Server Components, Server Actions), **TypeScript strict**
- **Tailwind CSS v4** + **shadcn/ui** (Radix) + **lucide-react** icons
- **Supabase**: Postgres, Auth (email/password + magic link + Google OAuth opsional), Storage (lampiran), Realtime (update kanban)
- `@supabase/ssr` untuk auth di server/middleware
- **TanStack Query** (client cache & optimistic update), **TanStack Table** (list view)
- **@dnd-kit** (kanban drag & drop)
- **react-hook-form + zod** (form & validasi; schema zod dipakai ulang di server action)
- **next-intl** (i18n: `id` default, `en`)
- **Recharts** (grafik), **date-fns** (tanggal, locale id)
- **next-themes** (dark mode), **sonner** (toast), **cmdk** (command palette), **Tiptap** (rich text catatan)
- Package manager: **pnpm**. Deploy: **Vercel**. Repo: **GitHub**.

## 3. Struktur Folder
```
app/
  [locale]/
    (auth)/login, register, forgot-password, reset-password
    (app)/
      layout.tsx            # sidebar + topbar + command palette
      dashboard/
      pipelines/[pipelineId]/   # kanban | list | calendar | forecast (via ?view=)
      deals/[dealId]/
      contacts/  contacts/[id]/
      companies/ companies/[id]/
      activities/           # "Aktivitas saya": hari ini, terlambat, mendatang
      products/
      reports/
      settings/  (profile, organization, members, pipelines, tags, lost-reasons, custom-fields)
  auth/callback/route.ts    # Supabase OAuth/magic-link callback
components/
  ui/                       # shadcn (jangan edit manual besar-besaran)
  kanban/ deals/ contacts/ companies/ activities/ charts/ layout/
lib/
  supabase/ (client.ts, server.ts, middleware.ts)
  validations/              # zod schemas
  actions/                  # server actions per domain
  queries/                  # fungsi fetch per domain
  format.ts                 # formatRupiah, formatCompact, formatDate
  permissions.ts
messages/ id.json en.json
supabase/
  migrations/               # SQL migration (sumber kebenaran skema)
  seed.sql
types/database.ts           # hasil `supabase gen types typescript`
middleware.ts               # next-intl + refresh session + proteksi route
```

## 4. Model Data (Postgres / Supabase)
Semua tabel bisnis punya `id uuid pk default gen_random_uuid()`, `organization_id uuid not null`, `created_at`, `updated_at`, `created_by`. Uang disimpan `numeric(18,2)`, mata uang default `IDR`.

| Tabel | Kolom penting |
|---|---|
| `organizations` | name, logo_url, currency (IDR), timezone (Asia/Jakarta) |
| `profiles` | id = auth.users.id, full_name, avatar_url, phone, locale |
| `memberships` | organization_id, user_id, role (`owner`/`admin`/`manager`/`sales`/`viewer`), team_id |
| `teams` | name, leader_id |
| `invitations` | email, role, token, expires_at, accepted_at |
| `pipelines` | name, description, color, position, is_default, archived |
| `stages` | pipeline_id, name, position, probability (0–100), rotting_days, type (`open`/`won`/`lost`) |
| `companies` | name, industry, npwp, address, city, province, phone, email, website, owner_id |
| `contacts` | first_name, last_name, company_id, job_title, email, phone, whatsapp, address, owner_id, source |
| `deals` | title, pipeline_id, stage_id, value, currency, probability_override, expected_close_date, priority (0–3 bintang), company_id, primary_contact_id, owner_id, status (`open`/`won`/`lost`), lost_reason_id, won_at, lost_at, position (urutan dalam kolom), last_activity_at |
| `deal_contacts` | deal_id, contact_id, role |
| `tags` + `deal_tags` | name, color (HVAC, PUMP, TDG, LIFT…) |
| `lost_reasons` | name |
| `activities` | type (`call`/`meeting`/`email`/`task`/`visit`/`whatsapp`), subject, note, due_at, done_at, assigned_to, deal_id, contact_id, company_id |
| `notes` | body (markdown), deal_id / contact_id / company_id, pinned |
| `attachments` | storage_path, file_name, size, mime, deal_id / contact_id / company_id |
| `products` | name, sku, unit, unit_price, category |
| `deal_products` | deal_id, product_id, qty, unit_price, discount_pct, subtotal (generated) |
| `custom_fields` + `custom_field_values` | entity (`deal`/`contact`/`company`), label, type, options |
| `stage_history` | deal_id, from_stage_id, to_stage_id, changed_by, changed_at (untuk laporan durasi stage) |
| `audit_logs` | entity, entity_id, action, diff jsonb, user_id |
| `notifications` | user_id, type, payload jsonb, read_at |
| `saved_views` | user_id, pipeline_id, name, filters jsonb, is_shared |

Aturan DB:
- **RLS aktif di SEMUA tabel**. Policy dasar: user hanya bisa akses baris dengan `organization_id` di mana dia punya membership. Helper SQL: `is_member(org uuid)`, `has_role(org uuid, roles text[])`.
- Role `sales` hanya boleh edit deal/kontak miliknya (owner_id = auth.uid()) kecuali di-assign; `manager`+ bisa semua di timnya; `viewer` read-only.
- Trigger: `updated_at` otomatis; insert `stage_history` saat `stage_id` berubah; set `won_at/lost_at` saat stage bertipe won/lost; update `deals.last_activity_at` saat activity/note dibuat.
- Trigger `on auth.users insert` → buat `profiles`.
- Index: `deals(organization_id, pipeline_id, stage_id, position)`, `contacts(organization_id, email)`, full-text search (`tsvector`) untuk deals/contacts/companies.
- View/RPC: `pipeline_summary(pipeline_id)` → total & weighted value per stage; `move_deal(deal_id, stage_id, position)` atomik.

## 5. Fitur & Fase Pengerjaan

### Fase 0 — Setup
- [x] `pnpm create next-app` (TS, Tailwind, App Router, ESLint), pasang shadcn/ui, next-intl, next-themes
- [x] Supabase project + Supabase CLI (`supabase init`, `supabase link`), `.env.local` dari `.env.example` (lokal sudah; project produksi dibuat user)
- [x] Layout dasar: sidebar (Dashboard, Pipeline, Deals, Kontak, Perusahaan, Aktivitas, Produk, Laporan, Pengaturan), topbar (switch org, search, notifikasi, profil, tema, bahasa)
- [x] `git init`, push ke GitHub — [ ] hubungkan ke Vercel + domain airtek.my.id (lihat §8)

### Fase 1 — Auth & Akun
- [x] Login, register, lupa/reset password (Supabase Auth) — [ ] magic link, (opsional) Google OAuth
- [x] Register terbuka saat ini akan DIGANTI: hanya main administrator + sistem undangan + konfirmasi email (§11.1–11.2)
- [x] Middleware proteksi route `(app)`; redirect ke `/login`
- [x] Onboarding: setelah register pertama → buat organization + pipeline default (Qualification, Needs Analysis, Quotation, Negotiation, Closing, Won, Lost)
- [x] Halaman profil (nama, foto, telepon, bahasa, ganti password)
- [x] Organisasi: undang anggota via email (invitations), atur role & tim, hapus anggota
- [x] Multi-organization: user bisa tergabung di >1 org, switcher di topbar

### Fase 2 — Kontak & Perusahaan
- [x] CRUD perusahaan & kontak (list dengan TanStack Table: sort, filter, pagination server-side, pilih kolom)
- [x] Halaman detail: info, deal terkait, timeline (activity + note + perubahan stage), lampiran
- [x] Import CSV (mapping kolom + preview + deteksi duplikat email/telepon), export CSV/Excel
- [x] Tombol cepat: telepon (`tel:`), WhatsApp (`wa.me`), email (`mailto:`)

### Fase 3 — Multi Pipeline & Deals (inti)
- [x] Settings → Pipelines: tambah/rename/arsip pipeline; tambah/urutkan (drag)/hapus stage; set probability, rotting_days, tipe won/lost
- [x] Kanban per pipeline: header kolom = nama, jumlah deal, **total & weighted value**, progress bar won/lost
- [x] Kartu deal: judul, nilai (Rp), perusahaan + kontak, tag berwarna, bintang prioritas, ikon status aktivitas (hijau=terjadwal, merah=terlambat, abu=tidak ada), avatar owner, badge "basi"
- [x] Drag & drop antar stage & urutan dalam kolom (optimistic, rollback jika gagal), RPC `move_deal`
- [x] Quick-add deal di atas kolom (judul, perusahaan, nilai) + form lengkap di dialog/sheet
- [x] Mark Won / Lost (wajib pilih lost reason), restore
- [x] View lain: **List** (tabel, bulk edit/hapus/pindah stage), **Calendar** (expected close date), **Forecast** (kolom per bulan)
- [x] Filter & group: owner, tag, tanggal, nilai, prioritas, status; "My deals"; saved views
- [x] Halaman detail deal **sesuai spesifikasi §7.1** (belum: tab Lampiran — butuh Supabase Storage; editor Tiptap diganti textarea autosave) (header + stage bar, ringkasan nilai, info grid, tab Notes/Produk/Kontak/Lampiran/Info tambahan, panel kanan activity + timeline)
- [ ] Realtime: perubahan deal oleh user lain langsung muncul di kanban

### Fase 4 — Aktivitas & Notifikasi
- [x] Jadwalkan aktivitas dari deal/kontak/perusahaan; tandai selesai + catatan hasil
- [x] Halaman "Aktivitas saya": Terlambat / Hari ini / Mendatang
- [x] Notifikasi in-app (deal di-assign, aktivitas jatuh tempo, mention di note) + badge di topbar
- [ ] (Opsional) email reminder harian via Supabase Edge Function / Vercel Cron

### Fase 5 — Dashboard & Laporan
- [x] Dashboard: KPI (pipeline value, weighted forecast, deal won bulan ini, win rate, rata-rata siklus), grafik funnel per stage, forecast per bulan, top sales, aktivitas terlambat
- [x] Reports: filter periode/pipeline/owner/tag; won vs lost, lost reasons, durasi per stage (dari `stage_history`), performa per sales; export CSV
- [x] Filter dashboard per pipeline & periode

### Fase 6 — Polish
- [x] Command palette Ctrl+K (cari + aksi: "Deal baru", "Kontak baru", pindah pipeline)
- [x] Keyboard shortcut (N = deal baru, / = search)
- [x] Produk/katalog + (opsional) generate Penawaran PDF dari line items
- [ ] Custom fields
- [x] Audit log di settings (admin)
- [x] Empty state, skeleton loading, error boundary, halaman 404
- [x] Lighthouse desktop ≥ 90, aksesibilitas (label, fokus, kontras)

### Fase 8 — Akses, demo & konfigurasi bisnis (KERJAKAN SEBELUM Fase 7) — spesifikasi di §11
- [x] Main administrator dari env `BOOTSTRAP_ADMIN_EMAIL` (§11.1)
- [x] Wajib konfirmasi email, pendaftaran publik ditutup (§11.1)
- [x] Undangan oleh administrator + pilih role, termasuk role baru `presales` (§11.2)
- [x] ~~Organisasi & akun demo di produksi~~ — DIBATALKAN atas keputusan user (12 Okt 2026), script `seed:demo` dihapus (§11.3)
- [x] Isi data demo §11.3: pipeline Sales/Presales/Maintenance, tag Lift/Pompa/AC/HVAC, 36 deal, akun `presales.demo`
- [x] Kategori produk berbasis tag: Lift, Pompa, AC + custom (§11.4)
- [x] Pipeline default Sales & Presales + custom (§11.5)
- [x] Filter bar di Pipeline dan Deal (salesperson, tag, status, cari, URL query)
- [ ] Filter bar di Kontak, Perusahaan, Aktivitas, Produk, Laporan; filter nilai/tanggal/prioritas/kota/kondisi (§11.6)
- [x] Salesperson: nama di kartu kanban, kolom + group by di daftar Deal, tabel Performa Sales di dashboard (§11.7)
- [ ] Bulk action ganti salesperson; ganti pemilik di detail kontak/perusahaan (§11.7)
- [x] Mode Terang / Gelap / Sistem, tersimpan per user (§11.8)

### Fase 9 — Sisa pekerjaan & penyempurnaan (KERJAKAN SETELAH Fase 8, SEBELUM Fase 7) — detail di §13
- [ ] Email undangan custom bergaya Odoo + SMTP Resend gratis (§12)
- [x] Kelola undangan: kirim ulang, batalkan, status Menunggu/Diterima/Kedaluwarsa (§13.1)
- [x] Filter seragam di Kontak, Perusahaan, Aktivitas, Produk, Laporan (§13.2)
- [x] Bulk ganti salesperson + ganti pemilik kontak/perusahaan (§13.3)
- [x] Lampiran file via Supabase Storage (§13.4)
- [x] Realtime kanban (§13.5)
- [x] Custom fields (§13.6)
- [x] Pengingat aktivitas via email harian (§13.7)
- [x] QA: Lighthouse ≥ 90, aksesibilitas, hydration warning (§13.8)
- [x] Sidebar bisa diciutkan (mode ikon) / dimunculkan (§13.9)
- [x] Lingkungan dev lokal (Docker) + akun testing + masuk cepat (§18)
- [ ] Impor data dari Odoo CRM (§14) — **hanya setelah semua sales sudah diundang & aktif** (§14.0)
- [x] Jenis klien Konsultan/Kontraktor/Owner + pihak proyek (§16.1–16.2)
- [x] Visibilitas & filter proyek lintas sales (§16.3)
- [x] Fitur sederhana dari riset CRM lain: target sales, cek duplikat, lokasi proyek (§16.4)

### Fase 7 — Mobile-friendly & PWA — spesifikasi lengkap di §20
- [x] Web App Manifest (nama, ikon 192/512 + maskable, theme color), installable — dibuat Cursor 13 Okt 2026, verifikasi §20.6
- [x] Service worker aset statis (hanya produksi) — tanpa cache halaman/data user (§20.5)
- [x] Menu bawah dengan safe area iPhone; tabel produk detail deal bisa digeser horizontal
- [x] Audit & perbaikan semua halaman di 360–768px (§20.2)
- [x] Kanban mobile 1 kolom + tab/geser antar tahap + pindah tahap via menu (§20.3)
- [x] Detail deal mobile 1 kolom + bar aksi bawah (telepon/WA/aktivitas/catatan) (§20.4)
- [x] Daftar → kartu, filter jadi panel bawah, dialog jadi sheet layar penuh (§20.2)
- [x] Ajakan pasang aplikasi (Android prompt + petunjuk iOS), halaman offline, notifikasi versi baru (§20.5)
- [ ] 🔒 Web push notification — tunggu keputusan user (§20.5)

### Fase 10 — Optimasi kecepatan — detail di §15 (**§15.0 langkah 1–3 DIKERJAKAN SEKARANG**, sisanya setelah Fase 9)
- [x] §15.0 Langkah 1 — redirect 1 lompatan (middleware & onboarding)
- [x] §15.0 Langkah 2 — auth middleware tanpa round-trip (`getClaims`)
- [x] §15.0 Langkah 3 — ukur (Speed Insights + catat angka)
- [x] Ukur baseline (Vercel Speed Insights, Lighthouse, waktu server per halaman) (§15.1)
- [x] Kurangi redirect berantai menjadi maksimal 1 lompatan (§15.2)
- [x] Ganti snapshot "muat semua tabel" dengan query per halaman (§15.3)
- [x] Kurangi panggilan auth per request (§15.4)
- [x] Revalidasi & cache yang lebih sempit (§15.5)
- [x] Perkecil bundle JavaScript (§15.6)
- [x] Cek region & index database (§15.7)

### Fase 11 — Integrasi AI (Gemini) — detail di §17 (boleh mulai setelah Fase 9)
- [ ] Fondasi: wrapper server-only, env, kuota & log pemakaian (§17.2)
- [ ] Tahap 1: ringkasan deal, catatan/chat → aktivitas, draft follow-up (§17.3 A–C)
- [ ] Tahap 2: langkah berikutnya & risiko, tanya data dengan bahasa biasa, ringkasan mingguan (§17.3 D–F)
- [ ] Tahap 3: bantu impor Odoo, ekstraksi PDF penawaran/BOQ, analisis menang/kalah (§17.3 G–I)

## 6. Konvensi Kode
- TypeScript strict, **tanpa `any`**. Tipe DB dari `types/database.ts` (regenerate setiap migration: `pnpm db:types`).
- Server Components default; `"use client"` hanya untuk interaktif (kanban, form, chart).
- Mutasi lewat **Server Actions** di `lib/actions/*`, selalu: validasi zod → cek auth/role → query → `revalidatePath`/return data. Return `{ ok: true, data } | { ok: false, error }`, jangan throw ke client.
- Jangan pernah pakai `service_role` key di client. Hanya di server bila benar-benar perlu (mis. menerima undangan).
- Semua teks UI lewat `next-intl` (`messages/id.json`, `messages/en.json`) — jangan hardcode string.
- Uang: `formatRupiah(value)` → "Rp 850.000.000"; `formatCompact` → "Rp 18,4 M" / "Rp 850 jt". Tanggal pakai locale `id`, zona `Asia/Jakarta`.
- Nama file kebab-case, komponen PascalCase, satu komponen utama per file.
- Perubahan skema = file migration baru di `supabase/migrations/` (jangan edit migration lama yang sudah di-push).
- Commit kecil per fitur, format Conventional Commits (`feat:`, `fix:`, `chore:`).

## 7. Desain UI
- Gaya modern bersih (referensi: Linear, Attio, Pipedrive). Dark mode default mengikuti sistem.
- Warna aksen brand teal/hijau, warna tag dapat dipilih.
- Kartu kanban padat tapi terbaca; nilai Rupiah tebal; hover menampilkan aksi cepat (jadwalkan aktivitas, won, lost, edit).
- Font: Inter / Geist. Radius `0.5rem`. Gunakan komponen shadcn konsisten.

### Desktop-first
- Target utama lebar **1280–1920px**; tetap layak dipakai di 1024px (panel kanan bisa di-collapse). Belum perlu polish < 1024px — itu Fase 7 (PWA).
- Tetap pakai utilitas Tailwind yang fleksibel (flex/grid, tanpa lebar fixed besar) supaya Fase 7 tidak perlu rombak total.
- Manfaatkan kelebihan desktop: hover state & tooltip, keyboard shortcut, tabel padat, panel samping, klik kanan (context menu) di kartu kanban.

### 7.1 Halaman Detail Deal (`/pipelines/[pipelineId]` → klik kartu → `/deals/[dealId]`)
Referensi: form opportunity Odoo, tapi lebih rapi, informatif, dan cepat. Layout 2 kolom: **konten utama ±65%** (kiri) dan **panel aktivitas ±35%** (kanan, sticky, scroll sendiri).

**A. Header (sticky)**
- Breadcrumb `Pipeline Sales › Gd Barak CPI`; navigasi `‹ 1 / 14 ›` antar deal dalam view/filter yang sama (shortcut `J`/`K`).
- Judul besar, **inline-editable**; badge status (Open / Won / Lost) dan avatar owner.
- Tombol aksi kanan: **Won** (hijau), **Lost** (merah outline → dialog pilih lost reason + catatan), menu `⋯` (duplikat, pindah pipeline, salin link, hapus).
- Chip info: "Deal terkait (2)" (deal lain dengan perusahaan/kontak sama) dan "Meeting berikutnya" — pengganti tombol "No Meeting / Similar Leads" Odoo.

**B. Stage bar**
- Bar chevron selebar konten, semua stage pipeline; stage aktif diberi warna aksen, stage terlewati lebih redup.
- Tiap stage menampilkan **lama berada di stage** (mis. "5 jam", "3 hari") dari `stage_history`; tooltip berisi tanggal masuk/keluar.
- Klik stage → pindah (optimistic + toast dengan Undo). Stage bertipe won/lost memicu dialog yang sama dengan tombol Won/Lost.

**C. Kartu ringkasan nilai** (baris KPI, 4 kotak)
- **Nilai deal** (Rp, besar & tebal) — bisa diambil otomatis dari total produk.
- **Probabilitas** — default dari stage; jika di-override tampil ikon reset ke default.
- **Weighted value** = nilai × probabilitas (otomatis, read-only) — tidak ada di Odoo.
- **Expected closing** — tanggal + hitung mundur ("6 hari lagi"; merah bila lewat).
- Di bawahnya: bintang prioritas (0–3) dan tag berwarna (tambah/hapus inline, bisa buat tag baru).

**D. Info grid (2 kolom, label kiri rata, nilai kanan)**
- Kiri: **Perusahaan** (link + hover card ringkas), **Kontak utama** (nama, jabatan), **Email** & **Telepon** (otomatis dari kontak; tombol salin, `tel:`, WhatsApp, `mailto:`).
- Kanan: **Salesperson** (avatar + picker), **Tim**, **Sumber lead**, **Dibuat** (tanggal + oleh siapa).
- Field kosong tampil teks redup "Belum diisi" (bukan placeholder "e.g. …" seperti Odoo); klik untuk isi.

**E. Tab konten**
- **Catatan** — rich text editor (Tiptap) untuk deskripsi proyek, autosave.
- **Produk** — tabel line items (produk, qty, satuan, harga, diskon %, subtotal), subtotal + PPN 11% + total; toggle "Gunakan total sebagai nilai deal".
- **Kontak terkait** — daftar `deal_contacts` dengan peran (Pemilik proyek, Konsultan, Kontraktor, Purchasing).
- **Lampiran** — drag & drop upload ke Supabase Storage, preview gambar/PDF, unduh.
- **Info tambahan** — lokasi proyek (alamat, kota, provinsi), custom fields.

**F. Panel kanan — aktivitas & timeline**
- Kartu **Aktivitas berikutnya** paling atas: jenis, judul, due date (merah bila terlambat), tombol ✓ Selesai / Jadwal ulang. Jika kosong: peringatan kuning "Belum ada aktivitas terjadwal" + tombol jadwalkan.
- Composer bertab: **Catatan** | **Aktivitas** | **WhatsApp** (log percakapan) — dengan @mention anggota tim.
- **Timeline** dikelompokkan per tanggal ("Hari ini", "Kemarin", "12 Okt 2026"): catatan, aktivitas selesai, perpindahan stage, perubahan field (`Rp 0 → Rp 850.000.000`, nama field dalam bahasa UI), upload lampiran. Filter chip: Semua / Catatan / Aktivitas / Perubahan, plus kotak cari.

**G. Perilaku**
- **Inline edit di semua field + autosave** saat blur/Enter (debounce), indikator "Menyimpan… / Tersimpan", Esc untuk batal. Tidak ada tombol Save global.
- Validasi zod di client & server; error tampil di bawah field.
- Shortcut: `J`/`K` deal sebelumnya/berikutnya, `W` won, `L` lost, `A` jadwalkan aktivitas, `Ctrl+Enter` kirim catatan.
- Skeleton loading untuk header, kartu KPI, dan timeline.

### 7.2 Form deal baru & pengaturan (keputusan user 13 Okt 2026)
- Label **Value → "Estimasi nilai proyek"** (EN "Estimated project value"), kolom nominal Rupiah `CurrencyInput` (`components/ui/currency-input.tsx`): prefiks "Rp", tanpa nol di depan, pemisah ribuan titik seperti `formatRupiah` (850.000.000); dipakai juga di quick-add kanban.
- **Owner → "PIC Sales"** di form deal.
- **Periode Dashboard & Laporan**: Bulan ini / Kuartal ini / Tahun ini / **Rentang tanggal** (kalender Dari–Sampai, `components/period-picker.tsx`, `lib/period.ts`, URL `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`). Target sales dijumlah untuk bulan-bulan dalam rentang.
- **Prioritas** tampil sebagai kata: 0 Rendah / 1 Sedang / 2 Tinggi / 3 Sangat tinggi (`common.priorities`); nilai DB tetap 0–3.
- **Probability override tidak ada di form deal baru** (masih bisa diubah di kartu Probabilitas detail deal); simpan form tidak menghapus override yang sudah ada.
- Pilihan **tag** di form = pill berwarna (kelas `.tag-option` di `globals.css`), bukan checkbox biasa.
- Pengaturan: nav tab ada di `app/(app)/settings/layout.tsx` (`components/settings-nav.tsx`) agar posisi gulir tab di HP tidak di-reset saat pindah tab. Baris Tag/Alasan kalah: tombol Save+Delete lebar tetap, tombol "Tambah" selebar keduanya. Toggle bahasa dua kolom sama lebar.
- Nama aplikasi terpasang (PWA) = **AirtekCRM**.
- Halaman Kontak & Perusahaan: tombol utama (**Kontak baru** / **Perusahaan baru**) paling depan, lalu Ekspor/Impor.

## 8. Environment & Deploy
`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
Script `package.json`: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `db:types` (`supabase gen types typescript --linked > types/database.ts`), `db:push` (`supabase db push`), `db:reset`.

Target deploy (sudah ditentukan):
- **GitHub repo:** https://github.com/wahyu-setiawan99/airtek-crm (branch `main`)
- **Domain produksi:** **https://airtek.my.id** (custom domain di Vercel). `NEXT_PUBLIC_SITE_URL=https://airtek.my.id`.
- **Vercel:** import repo di atas, region function `sin1` (lihat `vercel.json`), hubungkan ke project Supabase.
- **Supabase:** project dibuat oleh user memakai **akun Supabase lain** (akun utama sudah kena limit 2 project) yang login via GitHub user. Region **Southeast Asia (Singapore)** agar dekat dengan Vercel `sin1`. Agent TIDAK membuat project Supabase sendiri — user mengisi URL/keys di Vercel.

Arsitektur data (penting):
- Server Next.js adalah satu-satunya penulis data: server action → cek izin → `lib/store.ts#mutate` → hanya baris yang berubah ditulis dengan service-role key (`lib/supabase/store.ts`).
- **Baca data per tabel, bukan seluruh snapshot (§15.3, sejak 13 Okt 2026):**
  - Halaman: `preload(TABLES)` di baris pertama, lalu `const data = await withStore(TABLES, (store) => buildX(store, session))`. `TABLES` = konstanta di atas halaman berisi tabel yang dibaca. Callback **sinkron** dan hanya mengembalikan data turunan.
  - Aksi: `runAction(fn, ["deals", "stages"])` — argumen kedua = tabel yang **dibaca** `fn`. Tabel yang hanya ditambah baris (`push`/`unshift`, mis. `audit_logs`, `notes`, `notifications`, `stage_history`) tidak perlu dimuat.
  - Membaca tabel yang tidak didaftarkan → `MissingTable` → tabel itu dimuat dan callback diulang otomatis (benar, hanya lebih lambat). Jalankan dengan `STORE_TRACE=1` untuk melihat log `[store] loaded "x" on demand` lalu tambahkan tabelnya ke daftar.
  - Jangan memakai `loadStore()` (sudah dihapus), spread `{...store}`, atau `Object.values(store)`.
  - Di builder (`lib/queries.ts`) pakai indeks memo (`dealIndex`, `companyIndex`, `dealTagIndex`, …), bukan `find`/`filter` di dalam `map` per deal. Format tanggal/uang pakai helper `lib/format.ts` (formatter Intl dipakai ulang).
  - Setelah aksi **jangan** memanggil `router.refresh()`: aksi sudah `revalidatePath` dan responsnya membawa halaman terbaru. Pengecualian: realtime, ganti organisasi, terima undangan.
- Browser/anon key hanya bisa **membaca** data organisasinya (RLS read policies). Semua policy tulis sengaja dihapus di migration 0002.
- Tanpa env Supabase, app jalan di mode demo (file JSON lokal, di Vercel memakai `/tmp` yang tidak permanen).
- Local dev Supabase: `npx supabase start` (port 554xx di `supabase/config.toml`, karena 543xx dipakai project lain).

Langkah deploy:
1. Push ke `main` di repo GitHub di atas.
2. Supabase (akun baru) → New project (region Singapore) → SQL Editor: jalankan `supabase/migrations/0001_init.sql` lalu `0002_server_writes.sql` (atau `supabase link` + `pnpm db:push`).
3. Supabase → Authentication → URL Configuration: Site URL `https://airtek.my.id`; Redirect URLs: `https://airtek.my.id/auth/callback`, `https://*.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`.
4. Vercel → New Project → import repo → Environment Variables (Production & Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://airtek.my.id`, `BOOTSTRAP_ADMIN_EMAIL=wahyusetiawanblog9999@gmail.com` (setelah Fase 8) → Deploy.
5. Vercel → Project → Settings → Domains → tambah `airtek.my.id` (+ `www.airtek.my.id` redirect). Di DNS registrar `.my.id`: record `A @ 76.76.21.21` dan `CNAME www cname.vercel-dns.com` (ikuti nilai yang ditampilkan Vercel).
6. Email reset password: Supabase default SMTP sangat terbatas → pasang custom SMTP (mis. Resend) di Authentication → SMTP Settings.
7. Setiap push ke `main` → auto deploy production; branch/PR → preview deploy.

## 9. Seed Data (dev)
`lib/demo/seed.ts` hanya dipakai mode demo lokal (tanpa env Supabase): pipeline Sales/Presales/Maintenance, 36 deal contoh termasuk data Odoo. Tidak ada data/akun demo di produksi.

## 10. Definition of Done (setiap fitur)
- `pnpm lint`, `pnpm typecheck`, `pnpm build` lulus tanpa error.
- RLS diuji: user org A tidak bisa melihat data org B; role `viewer` tidak bisa edit.
- Teks tersedia di `id` dan `en`; tampil benar di dark & light mode pada lebar desktop 1280px dan 1920px (mobile < 1024px belum wajib — Fase 7).
- Loading, empty, dan error state ada.
- Checklist fase di file ini dicentang.

## 11. Spesifikasi Fase 8 — Akses, Demo & Konfigurasi Bisnis

> Ingat arsitektur data di §8: setiap tabel/kolom baru WAJIB ditambahkan di migration baru (`supabase/migrations/0003_...sql` — jangan edit 0001/0002), di `types/crm.ts` (`Store` + tipe baris), di daftar `TABLES` di `lib/supabase/store.ts` (urutan sesuai foreign key), dan di seed demo `lib/demo/seed.ts`. Semua penulisan data tetap lewat server action → `runAction`.

### 11.1 Main administrator & konfirmasi email
- **Main administrator:** `wahyusetiawanblog9999@gmail.com`. Simpan di env **`BOOTSTRAP_ADMIN_EMAIL`** (Vercel + `.env.local`), jangan hardcode di kode.
- Hanya SATU email bootstrap (owner, akses penuh). Semua akun lain — termasuk direksi/boss — masuk lewat **undangan** dari owner/administrator dengan role yang dipilih (§11.2); role bisa diubah kemudian di Pengaturan → Anggota.
- **Pendaftaran publik ditutup.** `/register` hanya menerima email yang sama dengan `BOOTSTRAP_ADMIN_EMAIL`; email lain mendapat pesan "Pendaftaran hanya lewat undangan administrator". Semua user lain masuk lewat undangan (§11.2).
- **Wajib konfirmasi email** untuk semua akun:
  - Supabase → Authentication → Providers → Email: **Confirm email = ON**.
  - Register memakai `supabase.auth.signUp({ email, password, options: { emailRedirectTo: SITE_URL + "/auth/callback?next=/id/onboarding", data: { full_name } } })`. Hapus `admin.auth.admin.createUser({ email_confirm: true })` di `registerWithSupabase` (`lib/actions/auth.ts`).
  - Setelah submit tampilkan layar "Cek email Anda untuk konfirmasi" + tombol kirim ulang (`supabase.auth.resend({ type: "signup", email })`, maksimal 1× per 60 detik).
  - `app/auth/callback/route.ts` mendukung dua format link: `?code=` (`exchangeCodeForSession`) dan `?token_hash=&type=` (`verifyOtp`).
  - Provisioning organisasi dipindah ke **setelah konfirmasi** (halaman `/onboarding`): jika user belum punya membership DAN email = `BOOTSTRAP_ADMIN_EMAIL` → buat organisasi "PT. Airtek Solusi Nusantara" dengan role `owner` + pipeline (§11.5) dan tag (§11.4) default. Jika bukan bootstrap dan tidak punya undangan → logout + pesan.
  - Login dengan email yang belum dikonfirmasi → pesan "Email belum dikonfirmasi" + tombol kirim ulang.
- **SMTP custom wajib** (SMTP bawaan Supabase hanya beberapa email/jam): Resend dengan domain `airtek.my.id`, pengirim `noreply@airtek.my.id` (tambahkan record SPF/DKIM dari Resend di DNS). Isi di Supabase → Authentication → SMTP Settings.
- Template email Supabase (Konfirmasi, Undangan, Reset password) dalam **English** dengan nama "Airtek CRM" (keputusan user 13 Okt 2026).

### 11.2 Undangan oleh administrator
- **Level yang dipakai (keputusan user 12 Okt 2026):**
  1. **Boss** = `owner` = main administrator (`BOOTSTRAP_ADMIN_EMAIL`). Akses penuh dan **tersembunyi**: tidak muncul di daftar anggota, pilihan salesperson, maupun Performa Sales bagi non-owner (`orgPeople()` di `lib/queries.ts`). Hanya owner yang bisa mengubah/mengeluarkan baris owner atau memberi role owner.
  2. **Administrator** = `admin` (direktur). Bisa semua hal termasuk mengundang & mengatur sales. Boss menaikkan seseorang ke Administrator di Pengaturan → Anggota.
  3. **Sales** = `sales`, diundang via email oleh Administrator/Boss.
  - Form undangan dan pemilih role menawarkan **Administrator, Sales, Presales** (Presales ditambahkan atas keputusan user 14 Okt 2026). Role `manager`/`viewer` masih ada di DB/izin tapi tidak ditawarkan di UI.
- Hanya `owner`/`admin` yang bisa mengundang (Pengaturan → Anggota → **Undang anggota**).
- Form: **Email**, **Nama lengkap**, **Role**, **Tim** (opsional).
- Role yang bisa dipilih:

  | Label UI | Nilai DB | Hak akses |
  |---|---|---|
  | Administrator | `admin` | Semua, termasuk anggota, pipeline, tag, produk, audit log |
  | Manajer Sales | `manager` | Semua deal/kontak organisasi, laporan, ganti salesperson |
  | Sales | `sales` | Edit deal/kontak/aktivitas miliknya; lihat semua deal |
  | Presales | `presales` **(baru)** | Sama dengan `sales`, default ke pipeline Presales |
  | Viewer (Direksi) | `viewer` | Lihat semua data + dashboard/laporan, tidak bisa mengubah |

  `owner` = main administrator: tidak bisa dipilih di form, tidak bisa dihapus/diturunkan selama hanya ada satu owner. Tambah `presales` di check constraint `memberships.role` dan `invitations.role`, tipe `Role`, `lib/permissions.ts` (perlakukan seperti `sales`), dan `common.roles` di `messages/*.json`.
- Alur: server action → simpan `invitations` (email, role, team_id, token, expires_at 7 hari, created_by) → `admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL + "/auth/callback?next=/id/accept-invite", data: { full_name, invitation_id } })`. Jika email sudah punya akun → langsung buat membership + notifikasi in-app, tanpa email undangan auth.
- Halaman `/accept-invite`: user (sudah login dari link) mengisi nama + kata sandi (`supabase.auth.updateUser({ password })`) → membership dibuat sesuai role undangan → `accepted_at` diisi → redirect ke pipeline default role-nya.
- Pengaturan → Anggota: daftar undangan berstatus **Menunggu / Diterima / Kedaluwarsa**, tombol **Kirim ulang** & **Batalkan**. Role bisa diubah; anggota bisa **dinonaktifkan** (`memberships.disabled_at`, tidak bisa login ke org tsb) tanpa menghapus datanya.

### 11.3 Data & akun demo — DIBATALKAN
- Keputusan user (12 Okt 2026): **tidak ada organisasi DEMO maupun akun dummy di produksi.** Boss/pengguna mendaftar sendiri dan menerima email konfirmasi.
- Script `pnpm seed:demo` sudah dihapus. Jangan membuat akun via `admin.createUser({ email_confirm: true })` di produksi.
- Dataset contoh (`lib/demo/seed.ts`) tetap ada khusus untuk mode demo lokal tanpa Supabase.

### 11.4 Produk berbasis kategori (tag)
- Kategori produk = **tag** (satu master dengan tag deal). Default per organisasi: **Lift**, **Pompa**, **AC** (warna berbeda). Admin bisa tambah/rename/ubah warna/hapus kategori custom di Pengaturan → Tag & Kategori (hapus ditolak bila masih dipakai).
- Ganti kolom teks `products.category` dengan `products.tag_id` (FK `tags`, `on delete restrict`); migrasikan data lama berdasarkan nama.
- Halaman Produk: chip filter per kategori (Semua · Lift · Pompa · AC · …); kolom nama, SKU, kategori (chip berwarna), satuan, harga, jumlah dipakai di deal. Form produk wajib memilih kategori.
- Katalog contoh: **Lift** — Passenger Lift 8 orang, Passenger Lift 13 orang, Service Lift; **Pompa** — Fire Pump Electric, Fire Pump Diesel, Booster Pump, Jockey Pump; **AC** — AC Split 2 PK, AC Cassette, VRF Outdoor, AC Presisi, Chiller.
- Menambah produk ke deal otomatis menambahkan tag kategorinya ke deal.

### 11.5 Pipeline default Sales & Presales + custom
- Organisasi baru otomatis punya 2 pipeline:
  - **Sales** (default): Kualifikasi 10% → Analisa Kebutuhan 25% → Penawaran 50% → Negosiasi 70% → Closing 90% → Won → Lost.
  - **Presales** (keputusan user 14 Okt 2026): Approach 10% → Design 25% → Submitted 40% → Ready Tender 55% → On Tender 65% → On Negotiation 80% → **Deal** (won) → **Closed** (won) → **Loss** (lost). Migration `0010` mengubah pipeline Presales yang sudah ada (nama lama diganti di tempat, deal tetap di tahapnya).
- **Pihak proyek per pipeline** (keputusan user 14 Okt 2026): **Presales = Konsultan + Owner**, **Sales = Kontraktor + Owner** (`PIPELINE_PARTIES` di `lib/client-type.ts`, pipeline dikenali dari nama "Presales"). Pilihan perusahaan di form deal & quick-add difilter sesuai pipeline; detail deal hanya menampilkan baris pihak pipeline itu (pihak lain yang sudah terisi tetap terlihat); server menolak pihak yang tidak sesuai (`common.partyNotAllowed`).
- Pipeline custom tetap bisa ditambah di Pengaturan → Pipeline; tambahkan tombol **Duplikat pipeline** (salin stage).
- Aksi **Kirim ke pipeline Sales** di detail deal Presales: pindah ke stage pertama pipeline Sales, catat riwayat, opsional ganti salesperson.
- Pipeline default per role (`defaultPipelineId(store, org, role)` di `lib/queries.ts`, dipakai menu Pipeline, `/pipelines`, dashboard): `presales` → pipeline jenis Presales, `sales` → pipeline jenis Sales, lainnya → pipeline default organisasi.
- Form deal menulis jelas pipeline tujuannya (keputusan user 14 Okt 2026): judul "New Sales deal" / "New Presales deal" (ID "Deal Sales baru"), keterangan "… · projects with a contractor and owner" (Sales) atau "… consultant and owner" (Presales); tombol di halaman pipeline memakai label yang sama.

### 11.6 Filter seragam
- Satu komponen `components/filters/filter-bar.tsx` untuk Pipeline (kanban/list/kalender/forecast), Deal, Kontak, Perusahaan, Aktivitas, Produk, Dashboard, Laporan.
- Filter (sesuai halaman): **Salesperson** (multi, termasuk "Saya"), **Tag/kategori** (multi), **Stage**, **Status** (Open/Won/Lost), **Nilai** min–maks, **Target closing** & **Tanggal dibuat** (preset Minggu/Bulan/Kuartal/Tahun ini + rentang custom), **Prioritas**, **Perusahaan**, **Kota/Provinsi**, **Kondisi** (aktivitas terlambat, tanpa aktivitas, basi), plus pencarian teks.
- Filter aktif tampil sebagai chip yang bisa dihapus + tombol **Reset**; disimpan di **URL query** (bisa dibagikan) dan bisa disimpan sebagai **Saved view** (pribadi / tim).
- Total di header kolom kanban dan ringkasan list mengikuti filter.

### 11.7 Salesperson terlihat jelas ("salesnya siapa")
- Kartu kanban: avatar + **nama depan** salesperson (tooltip nama lengkap), bukan hanya inisial.
- List deal: kolom **Salesperson** (sortable) + **Group by salesperson** dengan subtotal nilai & weighted.
- Bulk action **Ganti salesperson** (manager/admin), tercatat di audit + notifikasi ke salesperson baru.
- Dashboard: kartu **Performa Sales** per orang (pipeline aktif, weighted, won bulan ini, win rate, aktivitas terlambat); klik nama → pipeline terfilter ke orang itu.
- Detail kontak & perusahaan menampilkan salesperson pemilik; manager/admin bisa menggantinya.

### 11.8 Mode Terang / Gelap
- Menu tema **Terang / Gelap / Sistem** (`components/theme-menu.tsx`) di topbar, halaman login/undangan, dan halaman depan. **Sistem** mengikuti pengaturan HP/komputer. **Default = Gelap** untuk tamu (next-themes `defaultTheme="dark"`) dan akun baru (`profiles.theme` default `dark`, migration `0008`). Keputusan user 13 Okt 2026: opsi Sistem dikembalikan, default gelap.
- Simpan per user di `profiles.theme` (`light` | `dark` | `system`, default `system`) dan terapkan setelah login. Halaman login/register mengikuti tema sistem.
- Cek kontras semua komponen (kanban, chart Recharts, dialog, tabel, badge DEMO) di kedua mode pada 1280px dan 1920px.

## 12. Email Undangan Custom (gratis)

Tujuan: email undangan seperti Odoo — penerima klik **Terima undangan**, langsung ke halaman buat kata sandi, lalu masuk. **Hanya lewat email** (tidak ada link undangan via WhatsApp / salin tautan).

**Contoh isi (English — keputusan user 13 Okt 2026):**
> **Subject:** You are invited to Airtek CRM
>
> Hello {full_name},
> *This link is valid for 7 days.*
> **{organization}** uses **Airtek CRM** to manage its sales pipeline. **{invited_by}** invited you as **{role}**.
> After you accept, sign in with:
> • Login: {email}
> • Link: https://airtek.my.id
> [ Accept invitation ]  ← brand-colored button
> Airtek CRM · PT. Airtek Solusi Nusantara

**Cara kerja (sudah tersedia di kode):**
- `inviteMemberAction` (`lib/actions/crm.ts`) memanggil `admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL + "/auth/callback?next=/id/accept-invite", data: { full_name, invitation_id, invited_by, organization, role } })`.
- Link default Supabase membawa sesi di hash URL; `/auth/callback` meneruskan ke `/id/accept-invite` dan `components/accept-invite-form.tsx` memasang sesi dari hash, lalu meminta **nama + kata sandi** → `acceptInviteAction` → membership sesuai role → dashboard.
- `/auth/callback` juga mendukung `?token_hash=&type=invite` (lebih andal bila template memakai TokenHash).

**Yang harus dikerjakan:**
- [x] Template HTML `supabase/templates/invite.html` (English, tabel/inline CSS agar tampil baik di Gmail/Outlook): logo dari `https://airtek.my.id/brand/airtek-logo.png`, salam, isi seperti contoh di atas, tombol **Accept invitation** warna `#9a1b4b`, footer. Variabel Supabase: `{{ .Data.full_name }}`, `{{ .Data.invited_by }}`, `{{ .Data.organization }}`, `{{ .Data.role }}`, `{{ .Email }}`, `{{ .SiteURL }}`.
  - Tombol memakai: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/id/accept-invite`
  - Label role tampil sebagai "Administrator"/"Sales" (`role` berisi `admin`/`sales`; gunakan `{{ if eq .Data.role "admin" }}Administrator{{ else }}Sales{{ end }}`).
- [x] Template serupa untuk **Konfirmasi email** (`confirmation.html`, link `…/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/id/onboarding`) dan **Reset kata sandi** (`recovery.html`, `type=recovery&next=/id/reset-password`).
- [ ] Aktifkan di `supabase/config.toml` untuk lokal (`[auth.email.template.invite] subject=… content_path="./supabase/templates/invite.html"`, dst.) dan uji dengan Mailpit (`http://127.0.0.1:55424`).
- [ ] Produksi (dikerjakan user, dipandu): Supabase → Authentication → **Email Templates** → tempel subjek + HTML untuk Invite user, Confirm signup, Reset password.
- [ ] **SMTP gratis — Resend** (3.000 email/bulan, 100/hari): daftar resend.com → Domains → tambah `airtek.my.id` → masukkan record DNS (MX/TXT SPF/DKIM) di Domainesia → buat API key → Supabase → Authentication → **SMTP Settings**: host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender `noreply@airtek.my.id`, nama "Airtek CRM". Naikkan rate limit email di Authentication → Rate Limits.
- [x] Halaman `/accept-invite`: tampilkan juga nama organisasi & role dari `user_metadata`; tombol "Kirim ulang undangan" tidak ada di sisi penerima (hanya admin).

## 13. Sisa Pekerjaan (status 12 Okt 2026)

Sudah selesai & live: Supabase (data + auth, RLS read-only, server writes), multi-pipeline Sales/Presales, kanban + list + kalender + forecast, detail deal §7.1, kontak/perusahaan/aktivitas/produk/laporan, dashboard + Performa Sales, filter di Pipeline & Deal, level Boss/Administrator/Sales (Boss tersembunyi), undangan email + halaman buat kata sandi, logo & warna brand, mode terang/gelap (toggle, default mengikuti perangkat), domain `airtek.my.id`.

### 13.1 Kelola undangan
- Daftar undangan: status **Menunggu / Diterima / Kedaluwarsa**, tombol **Kirim ulang** (panggil ulang `inviteUserByEmail`, perpanjang `expires_at`) dan **Batalkan** (`cancelled_at`, hapus auth user yang belum aktif).
- Anggota: tombol **Nonaktifkan / Aktifkan kembali** (`memberships.disabled_at`), konfirmasi sebelum aksi.
- Administrator tidak boleh melihat/mengubah Boss (sudah di server; pastikan UI konsisten).

### 13.2 Filter seragam (§11.6)
- Pakai `components/filters/filter-bar.tsx` di Kontak, Perusahaan, Aktivitas, Produk (per kategori), Laporan.
- Tambah filter nilai min–maks, rentang tanggal (target closing/dibuat), prioritas, kota/provinsi, kondisi (terlambat/tanpa aktivitas/basi). Simpan di URL.

### 13.3 Salesperson
- Bulk action di daftar Deal: pilih beberapa → **Ganti salesperson** (admin/boss), audit + notifikasi.
- Ganti pemilik (salesperson) di detail Kontak & Perusahaan.

### 13.4 Lampiran
- Supabase Storage bucket `attachments` (private), policy baca per organisasi, upload lewat server action (signed upload URL). Tab **Lampiran** di detail deal/kontak/perusahaan: drag & drop, preview gambar/PDF, unduh, hapus. Tambahkan tabel `attachments` ke `TABLES` di `lib/supabase/store.ts`.

### 13.5 Realtime
- Supabase Realtime pada tabel `deals` (filter organization_id) → `router.refresh()` di kanban saat ada perubahan dari user lain.

### 13.6 Custom fields
- Tabel `custom_fields` + `custom_field_values` (lihat §4), pengaturan di Settings, tampil di tab "Info tambahan" detail deal/kontak/perusahaan.

### 13.7 Pengingat
- Vercel Cron harian (07.00 WIB) → route `/api/cron/reminders` (proteksi `CRON_SECRET`) → email ringkasan aktivitas hari ini & terlambat per user (via Resend API) + notifikasi in-app.

### 13.8 QA & polish
- Lighthouse desktop ≥ 90; label aksesibilitas; tidak ada hydration warning di console (jangan render atribut yang bergantung pada tema/waktu di server).
- Uji alur lengkap di produksi: Boss daftar → undang Administrator → Administrator undang Sales → Sales buat deal → Administrator lihat Performa Sales.
- Halaman `/register` hanya untuk Boss (email `BOOTSTRAP_ADMIN_EMAIL`); link "Daftar" di halaman login sudah dihapus.
- ✅ **Hasil 13 Okt 2026** (build produksi lokal, Lighthouse desktop, login `admin`): halaman depan perf 96 / a11y 100, login 100/100, dashboard 99/100, pipeline 97/100, daftar deal 100/100, detail deal 99/100, kontak/perusahaan/aktivitas/produk/laporan/anggota 99–100/100. Best-practices 96 hanya karena skrip Vercel Analytics tidak ada di lokal. Nol hydration warning di semua halaman (setelah `.next` bersih). Alur lokal lulus: admin undang `sales3` → email Mailpit (link `next=/accept-invite`) → buat kata sandi → dashboard English → quick-add deal tercatat milik Sales Tiga.
- Perbaikan QA: chip tag pakai kelas `.tag-chip` (warna tag digelapkan/diterangkan agar kontras ≥ 4.5), `--success-foreground` & `--destructive-foreground` gelap di mode gelap, avatar `bg-accent`, header tabel kosong diberi `sr-only`, logo sidebar tanpa `aria-label` saat lebar, target sentuh handle drag 24px, filter bar tidak lagi bertumpuk (filter utama satu baris + tombol **Filter lainnya**).

### 13.9 Sidebar ciut / lebar
- Tombol toggle di header sidebar (ikon `PanelLeftClose` / `PanelLeftOpen` dari lucide) + shortcut `[`.
- **Mode lebar** (default, `w-60`): logo + label CRM + nama menu.
- **Mode ciut** (`w-16`): hanya ikon menu (rata tengah) dan ikon logo `public/brand/airtek-mark.png`; nama menu muncul sebagai **tooltip** saat hover (Radix Tooltip sudah terpasang); item aktif tetap tersorot.
- Konten utama ikut bergeser: ganti `md:pl-60` di `components/shell.tsx` menjadi `md:pl-16` saat ciut, dengan transisi `transition-[width,padding] duration-200`.
- Simpan pilihan per user: cookie `airtek_sidebar=collapsed|expanded` (dibaca di server layout agar tidak ada lompatan tampilan saat load) — boleh juga disimpan di `profiles` lewat migration baru bila ingin sinkron antar perangkat.
- Halaman detail deal (`components/deal-workspace.tsx`) memakai lebar penuh; pastikan tetap rapi saat sidebar ciut maupun lebar (1280px & 1920px).
- Mobile (< 768px) tetap memakai drawer yang sudah ada; toggle ini khusus desktop.
- Sidebar mengikuti tema (token `--sidebar*` di `app/globals.css`): terang di mode terang, gelap di mode gelap — jangan dikunci gelap lagi.

### Tidak dikerjakan (keputusan user)
- Akun/organisasi demo di produksi (dihapus).
- Undangan lewat WhatsApp / salin tautan (dihapus — email saja).

## 14. Impor Data dari Odoo

Tujuan: memindahkan data CRM lama dari `pt-airtek-solusi-nusantara.odoo.com` ke Airtek CRM sekali jalan (bisa diulang tanpa duplikat), dikerjakan oleh **Boss/Administrator**.

### 14.0 Urutan wajib (keputusan user 12 Okt 2026)
1. Boss mendaftar → mengundang Administrator (direktur).
2. Boss/Administrator **mengundang semua sales** yang ada di Odoo, dan setiap sales **sudah menerima undangan & membuat kata sandi** (status anggota aktif, bukan "Menunggu").
3. **Baru setelah itu impor Odoo dijalankan**, supaya setiap proyek langsung terpasang ke akun salesperson yang benar (tag sales per proyek, §16.3).
- Halaman impor menampilkan **daftar cek sebelum mulai**: salesperson unik di file Odoo vs anggota aktif di CRM. Jika masih ada salesperson Odoo yang belum punya akun aktif → tampilkan peringatan + tombol ke Pengaturan → Anggota untuk mengundang; tombol **Impor** baru aktif setelah semua salesperson terpetakan ke anggota aktif (atau secara sadar dipetakan ke salesperson lain oleh Boss/Administrator).
- Undangan yang masih "Menunggu" tidak dihitung sebagai siap — data tidak boleh diimpor ke akun yang belum aktif.

### 14.1 Sumber data (ekspor dari Odoo, tanpa API)
Odoo Online paket standar tidak membuka API eksternal, jadi pakai fitur **Export** bawaan Odoo (list view → pilih semua → ⚙ Action → **Export** → format **XLSX** atau **CSV**, centang *"I want to update data (import-compatible export)"* agar kolom `id` / External ID ikut). File yang diekspor:

| File | Model Odoo | Kolom yang diekspor |
|---|---|---|
| `companies` | Contacts (`res.partner`, filter *Is a Company*) | id, name, vat, street, city, state_id, phone, email, website, user_id, category_id |
| `contacts` | Contacts (`res.partner`, individu) | id, name, parent_id (perusahaan), function, email, phone, mobile, street, city, user_id |
| `opportunities` | CRM → Pipeline (`crm.lead`, termasuk *Won* & *Lost*: hapus filter default, tambah filter *Archived/Lost*) | id, name, team_id, stage_id, expected_revenue, probability, date_deadline, priority, partner_id, contact_name, email_from, phone, user_id, tag_ids, description, lost_reason_id, active, date_closed, create_date |
| `activities` *(opsional)* | Activities (`mail.activity`) | res_name / res_id, activity_type_id, summary, note, date_deadline, user_id |
| `products` *(opsional)* | Sales → Products (`product.template`) | id, name, default_code, list_price, uom_id, categ_id |

### 14.2 Halaman impor
- **Pengaturan → Impor data** (`app/[locale]/(app)/settings/import`), hanya `owner`/`admin`.
- Wizard 4 langkah: **1. Unggah** (CSV/XLSX per jenis data, urutan: perusahaan → kontak → produk → deal → aktivitas) → **2. Petakan** → **3. Pratinjau & validasi** → **4. Impor + laporan**.
- Parser: **papaparse** (CSV, menangani koma/kutip/baris baru di dalam sel — `parseCsv` di `lib/csv.ts` saat ini TIDAK aman untuk itu) dan **read-excel-file** (XLSX). Deteksi delimiter `,`/`;` dan encoding UTF-8 (dengan/ tanpa BOM).
- Pemetaan kolom otomatis berdasarkan nama kolom Odoo (Inggris/Indonesia, mis. `Opportunity`/`Peluang`, `Expected Revenue`/`Pendapatan yang Diharapkan`), bisa diubah manual lewat dropdown; simpan preset pemetaan terakhir.

### 14.3 Aturan pemetaan
- **Tahap (stage):** daftar stage unik dari file → user memetakan ke stage pipeline Airtek (default by nama: Qualification→Kualifikasi, Needs Analysis→Analisa Kebutuhan, Quotation/Proposition→Penawaran, Negotiation→Negosiasi, Closing→Closing; *Won* → stage won). Odoo `team_id` → pilih pipeline tujuan (Sales/Presales/…).
- **Salesperson (`user_id`):** daftar nama unik → petakan ke anggota yang sudah ada (Administrator/Sales/Boss). Yang belum ada → opsi "undang via email" (pakai `inviteMemberAction`) atau "tetapkan ke saya".
- **Status:** `active = False` + `lost_reason_id` → **Lost** (buat lost reason baru bila belum ada); stage *Won* atau `probability = 100` → **Won** (`won_at` = `date_closed`); selain itu **Open**.
- **Nilai:** `expected_revenue` → `value` (bersihkan "Rp", titik/koma ribuan, desimal). `probability` → `probability_override` hanya jika berbeda dari default stage.
- **Tanggal:** `date_deadline` → `expected_close_date`; `create_date` → `created_at` (simpan tanggal asli Odoo).
- **Prioritas:** bintang Odoo 0–3 → `priority` 0–3.
- **Tag:** `tag_ids` (dipisah koma) → `tags` + `deal_tags`; nama tag Odoo (HVAC, PUMP, TDG, LIFT, …) dicocokkan tanpa beda huruf besar/kecil ke tag/kategori yang ada (PUMP→Pompa, LIFT→Lift), sisanya dibuat baru.
- **Pelanggan:** `partner_id` "PT NINDYA KARYA, Dwi Sulistyo" → perusahaan `PT NINDYA KARYA` + kontak `Dwi Sulistyo` (pisah di koma pertama); cocokkan dulu ke perusahaan/kontak yang sudah diimpor (by External ID, lalu nama/email).
- **Deskripsi/catatan:** `description` (HTML) → teks bersih di `deals.description`.
- **Aktivitas:** dihubungkan ke deal via `res_id`/`res_name`; tipe Odoo (Call, Meeting, Email, To-Do) → `call`/`meeting`/`email`/`task`.

### 14.4 Anti duplikat & bisa diulang
- Migration baru: kolom `external_ref text` di `companies`, `contacts`, `deals`, `products`, `activities` + unique index `(organization_id, external_ref)`; isi dengan External ID Odoo (mis. `__export__.crm_lead_21_abc123` atau `odoo:crm.lead:21`).
- Impor ulang file yang sama → **update** baris yang sudah ada, bukan membuat duplikat. Tambahkan field ke tipe di `types/crm.ts` dan ke `TABLES` (`lib/supabase/store.ts`) bila perlu.
- Tabel `import_batches` (id, organization_id, source, file_names, counts jsonb, created_by, created_at) + kolom `import_batch_id` di baris yang dibuat → tombol **Batalkan impor ini** (hapus baris dari batch tersebut).

### 14.5 Pratinjau, eksekusi, laporan
- Pratinjau: jumlah baris per jenis, **baru / diperbarui / dilewati / error**, 20 baris contoh hasil pemetaan, daftar error per baris (mis. tanggal tidak valid, stage belum dipetakan).
- Mode **uji coba (dry run)** default aktif: validasi penuh tanpa menulis.
- Eksekusi lewat server action dalam batch (±200 baris per panggilan) dengan progress bar; semua tulis lewat `runAction`/`mutate` (cek role, audit log `import`).
- Laporan akhir bisa diunduh (CSV baris error) untuk diperbaiki lalu diimpor ulang.

### 14.6 Uji
- Uji di Supabase lokal dulu dengan ekspor nyata dari Odoo (minimal 8 deal di screenshot awal: Gd Barak CPI, ADD Gd Sauraja CPI, Gd. Wisma Negara CPI (Pump), Mobile Fire Pump PTVI, AC Presisi UNAM, Gd. Bunker Wahidin, Lift IAIN Pare-pare, Gd. PA Mamuju) → cocokkan total "Negotiation Rp 18,463M" dan "Closing Rp 21,026M" dengan Odoo.
- Impor dua kali → jumlah data tidak bertambah. Batalkan batch → data hilang bersih.

## 15. Optimasi Kecepatan

### 15.0 MULAI DARI SINI — urutan kerja (prioritas user 13 Okt 2026: "website lambat saat baru dibuka, banyak forwarding")

**Kondisi terukur 13 Okt 2026 (belum login):**

| URL yang diketik | Rantai sekarang | Redirect | Waktu |
|---|---|---|---|
| `http://airtek.my.id/` | http→https → `/`→`/id` → `/id`→`/id/login` | 3 | ±1,6 s |
| `https://www.airtek.my.id/` | www→apex → `/`→`/id` → `/id`→`/id/login` | 3 | ±0,9 s |
| `https://airtek.my.id/` | `/`→`/id` → `/id`→`/id/login` | 2 | ±0,5 s |
| `https://airtek.my.id/id` | `/id`→`/id/login` | 1 | ±0,4 s |

**Sudah login (dari kode `middleware.ts`, lebih parah):** `/` → `/id` (next-intl) → `/id/onboarding` (middleware `rest === "/"` dan `GUEST_ONLY` mengarah ke onboarding) → halaman `/onboarding` memanggil `getSession()` (memuat SEMUA tabel) → redirect `/id/dashboard` → dashboard memuat semua tabel lagi. = **3 redirect + 2× muat data penuh** sebelum dashboard tampil.

**Langkah 1 — Redirect maksimal 1 lompatan** (file: `middleware.ts`, `lib/session.ts`, `app/[locale]/onboarding/page.tsx`, `components/auth-form.tsx`)
1. Di `middleware.ts`, tangani path **tanpa locale** sendiri sebelum `handleI18n`: `/` (dan path lain tanpa `/id` atau `/en`) → tentukan locale (cookie `NEXT_LOCALE` → default `id`) → **langsung** redirect ke tujuan akhir: `/{locale}/dashboard` bila login, `/{locale}/login` bila belum (path lain tanpa locale: `/{locale}{path}` sekali saja).
2. `/id` atau `/en` (`rest === "/"`): login → `/{locale}/dashboard`, belum login → `/{locale}/login`. **Jangan** ke `/onboarding`.
3. User login yang membuka `/login`, `/register`, `/forgot-password` (`GUEST_ONLY`) → `/{locale}/dashboard`, bukan `/onboarding`.
4. Onboarding hanya untuk user **tanpa membership**: biarkan `requireSession()` (`lib/session.ts`) yang mengarahkan ke `/onboarding` bila sesi ada tapi membership kosong. Halaman `/onboarding` jangan memuat semua tabel hanya untuk mengecek — cek membership dengan satu query ringan (`memberships` milik user, `select("organization_id").limit(1)`) lalu redirect.
5. Setelah login sukses (`components/auth-form.tsx`): `router.replace(next)` saja (tanpa `router.refresh()` tambahan yang memicu fetch kedua); hormati param `?next=` bila ada.
6. Semua link yang dibuat aplikasi (email template, `NEXT_PUBLIC_SITE_URL`, cron email, notifikasi) memakai URL lengkap `https://airtek.my.id/id/...` agar 0 redirect.
7. `http→https` dan `www→apex` ditangani Vercel (masing-masing 1 lompatan, tidak bisa dihilangkan); pastikan header **HSTS** aktif (`Strict-Transport-Security` via `next.config.ts` `headers()`) agar kunjungan berikutnya langsung https.

**Target setelah Langkah 1:** `https://airtek.my.id/` → 1 redirect; `http://airtek.my.id/` → 2 (http→https + 1); `/id` → 1; user login membuka `/` → 1 redirect langsung ke dashboard; tidak pernah lewat `/onboarding` bila sudah punya organisasi.

**Langkah 2 — Auth di middleware tanpa round-trip** (`middleware.ts`, `lib/session.ts`)
- Ganti `supabase.auth.getUser()` di middleware dengan `supabase.auth.getClaims()` (verifikasi JWT lokal; aktifkan **asymmetric JWT signing keys** di Supabase → Project Settings → JWT Keys bila belum). Tetap refresh cookie sesi seperti sekarang.
- Di server, `getUserId()` (sudah `cache`) memanggil `getUser()` hanya sekali per request.
- Halaman publik (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/accept-invite`) tidak perlu verifikasi apa pun selain cek "sudah login?" untuk redirect.

**Langkah 3 — Ukur & catat**
- Pasang `@vercel/speed-insights` (dan `@vercel/analytics`) di `app/[locale]/layout.tsx`; aktifkan di Vercel → project → Speed Insights.
- Catat sebelum/sesudah di tabel §15.1 dengan:
  `curl -sL -o /dev/null -w "%{num_redirects} redirect, %{time_total}s
" <url>` untuk semua URL di tabel atas, plus waktu buka dashboard setelah login (Chrome DevTools → Network, "Disable cache").

**Cara uji (lokal, §18):** `pnpm db:start` → `pnpm dev:seed` → `pnpm dev`; uji sebagai **belum login** dan sebagai `sales1@airtek.test` (Masuk cepat): buka `/`, `/id`, `/id/login`, `/en` — hitung redirect di DevTools Network. Pastikan alur undangan (`/accept-invite`), onboarding Boss baru, reset password, dan `/api/cron/reminders` (401 tanpa `CRON_SECRET`) tetap jalan. Lalu `pnpm lint && pnpm typecheck && pnpm build`, commit, push.

**Setelah langkah 1–3 selesai:** lanjut sisa Fase 9 (§16 jenis klien/pihak proyek/target, §13.8 QA, §14 impor Odoo setelah semua sales aktif). Langkah besar §15.3 (berhenti memuat semua tabel) & §15.5 (revalidasi sempit) dikerjakan setelah itu — dampaknya paling besar tapi perubahannya luas.


Aplikasi terasa berat. Kerjakan **setelah fitur stabil** (Fase 9 & 7), kecuali "quick win" redirect di §15.2 yang boleh lebih awal. Setiap langkah: ukur sebelum → ubah → ukur sesudah, catat angkanya di PR/commit.

### 15.1 Baseline & target
Baseline terukur 12 Okt 2026 (curl dari Indonesia, belum login):

| URL | Redirect | Waktu |
|---|---|---|
| `http://airtek.my.id/` | 3 (http→https → `/`→`/id` → `/id`→`/id/login`) | ±2,9 s |
| `https://www.airtek.my.id/` | 3 | ±1,9 s |
| `https://airtek.my.id/` | 2 | ±0,7 s |
| `https://airtek.my.id/id/login` | 0 | TTFB ±0,35–0,55 s |

Sesudah Langkah 1–2, terukur 13 Okt 2026 (curl, belum login). Rantai aplikasi tinggal satu lompatan; `http` dan `www` masih satu lompatan Vercel di depannya.

| URL | Redirect | Waktu |
|---|---|---|
| `http://airtek.my.id/` | 2 (http→https → `/`→`/id/login`) | 2,25 s |
| `https://www.airtek.my.id/` | 2 (www→apex → `/`→`/id/login`) | 1,68 s |
| `https://airtek.my.id/` | 1 (`/`→`/id/login`) | 0,37 s |
| `https://airtek.my.id/id` | 1 (`/id`→`/id/login`) | 0,40 s |
| `https://airtek.my.id/id/login` | 0 | TTFB 0,34 s |

Sesudah §19 (URL tanpa locale + halaman depan statis), terukur 13 Okt 2026 (curl, belum login):

| URL | Redirect | Waktu |
|---|---|---|
| `https://airtek.my.id/` | **0** (halaman depan statis) | 0,18 s |
| `https://airtek.my.id/login` | 0 | 1,0 s (cold start) |
| `https://airtek.my.id/dashboard` (belum login) | 1 (→ `/login?next=…`) | 0,87 s |
| `https://airtek.my.id/id/login` (URL lama) | 1 (→ `/login`) | 0,36 s |
| `http://airtek.my.id/` | 1 (Vercel http→https) | 0,53 s |
| `https://www.airtek.my.id/` | 1 (Vercel www→apex) | 0,44 s |

Ukuran JS: shared 103 kB; `/pipelines/[id]` 186 kB; `/deals/[id]` 192 kB; `/reports` 244 kB (first load).

Target: TTFB halaman setelah login **< 600 ms**, LCP **< 2,5 s**, INP **< 200 ms**, Lighthouse desktop **≥ 90**, maksimal **1 redirect** dari URL apa pun ke halaman tujuan.
- Aktifkan **Vercel Speed Insights** & **Web Analytics** (gratis di Hobby) untuk Web Vitals pengguna nyata.
- Tambah log durasi server (`console.time` sementara atau header `Server-Timing`) untuk `loadStore`, auth, dan render.

### 15.2 Redirect berantai (quick win)
- `/` dan `/id`: langsung satu redirect ke tujuan akhir (`/id/dashboard` bila login, `/id/login` bila belum) — gabungkan logika next-intl + auth di `middleware.ts` agar tidak `/`→`/id`→`/id/login`.
- User yang sudah login membuka `/login`/`/register`: redirect langsung ke `/id/dashboard` (bukan `/onboarding` → `/auth/onboarding` → `/dashboard`). Hanya user tanpa membership yang diarahkan ke onboarding.
- Setelah login sukses: navigasi langsung ke halaman tujuan (`next` param bila ada).
- `www`→apex dan `http`→`https` sudah 1 lompatan di Vercel; pastikan link/QR/email selalu memakai `https://airtek.my.id/id/...` (lengkap dengan locale) agar 0 redirect. `NEXT_PUBLIC_SITE_URL` sudah apex.
- Cek: `curl -sL -o /dev/null -w "%{num_redirects} %{time_total}
" <url>` untuk semua pola URL.

### 15.3 Data: hentikan "muat semua tabel" per request (dampak terbesar)
- Sekarang `loadStore()` (`lib/store.ts` → `loadSupabaseStore`) mengambil **±22 tabel penuh** untuk setiap halaman dan setiap server action. Makin banyak data (mis. setelah impor Odoo), makin lambat.
- Ganti bertahap dengan **query per halaman** (`lib/queries/*`), hanya kolom yang dipakai (`select("id,title,value,…")`), filter `organization_id` + filter halaman di database, **pagination server-side** untuk daftar (Deal, Kontak, Perusahaan, Aktivitas).
- Dashboard & laporan: agregasi di Postgres (view/RPC, mis. `pipeline_summary`, ringkasan per salesperson, forecast per bulan) alih-alih menghitung di JS dari semua deal.
- Server action: baca hanya baris yang diubah lalu tulis (pertahankan pengecekan role & org scope yang sekarang ada di `commitSupabaseStore`). Hapus pola snapshot-diff setelah semua halaman pindah.
- Detail deal: satu query dengan relasi yang dibutuhkan (deal + stage + kontak + aktivitas + catatan + riwayat).

### 15.4 Auth per request
- `middleware.ts` memanggil `supabase.auth.getUser()` (round-trip ke Supabase Auth) di setiap request, lalu `getSession()` di server memanggilnya lagi. Pakai **`getClaims()`** (verifikasi JWT lokal dengan signing key asimetris Supabase) di middleware, dan `getUser()` hanya sekali per request di server (sudah di-`cache`).
- Lewati middleware untuk aset statis (matcher sudah mengecualikan file bertitik; cek juga `/_vercel`, `/brand`).

### 15.5 Revalidasi & cache
- `runAction` memanggil `revalidatePath("/", "layout")` setelah setiap aksi → seluruh layout dirender ulang. Ganti dengan path spesifik (mis. hanya `/pipelines/[id]` & `/deals/[id]`) atau `revalidateTag`.
- Data referensi yang jarang berubah (pipelines, stages, tags, lost reasons, anggota) di-cache dengan `unstable_cache`/`"use cache"` + tag per organisasi, di-invalidate saat diubah.
- Kurangi `router.refresh()` beruntun di client (gabungkan atau pakai optimistic update yang sudah ada).
- Pertimbangkan `experimental.staleTimes` agar navigasi bolak-balik antar halaman tidak selalu fetch ulang.

### 15.6 Bundle & render
- Analisis dengan `@next/bundle-analyzer`.
- `recharts` (dashboard/laporan) dan `@dnd-kit` (kanban) di-load dinamis (`next/dynamic`, `ssr:false` bila perlu) hanya di halaman yang memakainya; command palette (`cmdk`) di-load saat dibuka.
- Komponen besar (`pipeline-board.tsx`, `deal-workspace.tsx`, `settings-screen.tsx`) dipecah; bagian non-interaktif tetap Server Component.
- Streaming: `loading.tsx`/`<Suspense>` per bagian (kartu KPI, grafik, timeline) agar kerangka halaman tampil cepat.
- Gambar via `next/image` dengan ukuran tepat (logo sudah); font sudah `next/font`.
- Hindari hydration warning (atribut yang bergantung tema/waktu jangan dirender di server).

### 15.7 Infrastruktur & database
- Pastikan project Supabase di **Southeast Asia (Singapore)**, sama dengan Vercel `sin1` (lihat `vercel.json`); jika beda region, setiap query bertambah ratusan ms — pertimbangkan pindah project.
- Index: `organization_id` di setiap tabel bisnis, `deals(organization_id, pipeline_id, stage_id, position)` (ada), `deals(owner_id)`, `activities(assigned_to, due_at)`, `activities(deal_id)` (ada), `notes(deal_id)` (ada), `stage_history(deal_id)` (ada), `audit_logs(entity, entity_id, created_at)` (ada). Cek `EXPLAIN ANALYZE` untuk query terlambat (Supabase → Query Performance).
- Kebijakan RLS memanggil `is_member()` per baris — pastikan fungsi `stable` dan index `memberships(user_id, organization_id)` ada.

### 15.9 Hasil (13 Okt 2026)
Diukur di build produksi lokal dengan data skala pasca-impor (1.537 deal, 1.520 kontak, 812 perusahaan, 6.000 aktivitas, 6.000 catatan, 7.500 riwayat tahap, 18.000 audit log, 2.400 notifikasi), login `admin`, median TTFB:

| Halaman | Sebelum | Sesudah |
|---|---|---|
| Dashboard | 4.552 ms | ±450–500 ms |
| Pipeline (kanban) | 6.401 ms (load 7,7 s) | ±380–650 ms (load ±0,8–0,9 s) |
| Daftar Deal | 3.906 ms | ±490–560 ms |
| Detail deal | 1.855 ms | ±450–550 ms |
| Kontak / Perusahaan / Aktivitas | 1,8–2,6 s | ±300–490 ms |
| Laporan / Pengaturan | ±2 s | ±240–410 ms |
| Aksi simpan catatan | 4.302 ms | ±255–325 ms |

Yang dikerjakan:
- **§15.3** `withStore`/`mutate` per tabel + cache per request, muat ulang otomatis bila tabel kurang, tabel tambah-saja tidak dimuat, paginasi 4 halaman paralel, `preload` tabel halaman selama cek sesi, bahasa (`i18n/request.ts`) memakai `profiles` yang sama. Builder memakai indeks Map; `Intl` formatter di-cache (Jakarta = UTC+7 tetap). Notifikasi dimuat 100 terbaru; "tandai semua dibaca" = satu `update`.
- **§15.5** `router.refresh()` ganda setelah aksi dihapus (satu POST, halaman tetap terbarui — diuji). `revalidatePath("/", "layout")` dipertahankan: biayanya kini satu render ringan. `unstable_cache`/`staleTimes` sengaja tidak dipakai agar data antar sales tidak basi.
- **§15.6** recharts lewat `next/dynamic` (dashboard 240 → 131 kB, laporan 241 → 160 kB first-load JS); command palette (cmdk) dimuat saat idle/dibuka; kolom kanban menampilkan 30 kartu + "Tampilkan N lagi".
- **§15.7** migration `0009_fast_rls_indexes.sql`: policy baca memakai `my_org_ids()`/`my_deal_ids()` (sekali per query, aturan akses sama — diuji: orang luar 0 baris), index `memberships(user_id, organization_id)`, `deals(owner_id)`, `activities(organization_id, due_at)`, `notes`, `notifications`, `audit_logs`, dll. Pembacaan tabel besar 4–10× lebih cepat. **Region:** Vercel `sin1` + Supabase Singapore (§8) — sudah sama.
- Bonus: service worker tidak lagi me-reload halaman saat pertama kali aktif.
- Diuji: 27 halaman × (admin, sales1) tanpa error, alur tulis (pindah tahap, won/restore, aktivitas, catatan, quick-add, drag, kontak, notifikasi, tag), undangan → terima → membership, cron 401/200.

### 15.8 Definition of done
- Tabel baseline di §15.1 diisi ulang dengan angka sesudah optimasi (dan halaman setelah login: Dashboard, Pipeline, Detail deal, Deal list).
- Semua target §15.1 tercapai di produksi `airtek.my.id`; tidak ada regresi fungsi (login, undangan, kanban, inline edit, impor).

## 16. Klien, Pihak Proyek, Visibilitas & Fitur dari Riset CRM

Prinsip: **sederhana, jangan over-engineering.** Hanya fitur yang langsung dipakai tim sales proyek MEP (HVAC, pompa, fire, lift).

### 16.1 Jenis klien — HANYA 3 label
- Setiap perusahaan punya **Jenis klien** wajib, nilai tetap (tidak bisa ditambah user): **Konsultan**, **Kontraktor**, **Owner**. Tidak boleh ada label lain.
- Migration: `companies.client_type text not null check (client_type in ('konsultan','kontraktor','owner'))`; isi data lama dari kolom `industry` (mengandung "konsultan" → konsultan, "kontraktor"/"konstruksi"/"MEP" → kontraktor, selain itu → owner), lalu **hapus kolom/field "Industri"** dari form, tabel, impor, dan seed.
- Tampil sebagai chip berwarna di daftar & detail perusahaan; filter di halaman Perusahaan, Kontak (lewat perusahaannya), dan Deal.
- i18n: ID "Konsultan / Kontraktor / Owner", EN "Consultant / Contractor / Owner".

### 16.2 Pihak proyek di setiap deal
Di proyek MEP biasanya ada tiga pihak: **Owner** (pemilik gedung), **Konsultan** (perencana/spesifikasi), **Kontraktor** (pelaksana/pembeli).
- Migration: kolom nullable di `deals`: `owner_company_id`, `consultant_company_id`, `contractor_company_id` (FK `companies`, `on delete set null`). Masing-masing hanya bisa memilih perusahaan dengan `client_type` yang sesuai.
- `deals.company_id` tetap ada sebagai klien utama untuk kompatibilitas: otomatis = kontraktor bila diisi, jika tidak owner, jika tidak konsultan (diatur di server action).
- Detail deal (§7.1 info grid): ganti field "Perusahaan" dengan tiga baris **Owner / Konsultan / Kontraktor** (inline select + link ke perusahaan); kontak utama tetap satu.
- Peran kontak di tab **Kontak terkait** (`deal_contacts.role`) dibatasi ke tiga nilai yang sama (bukan teks bebas).
- Kartu kanban: tampilkan nama kontraktor (atau owner) di bawah judul.
- Impor Odoo (§14): `partner_id` diisi ke slot sesuai jenis klien perusahaannya.

### 16.3 Setiap proyek punya salesperson, semua sales bisa saling melihat
- Setiap deal **wajib** punya salesperson (`owner_id`, sudah ada) — tampil di kartu kanban (nama depan), daftar Deal (kolom + group by), detail deal. Sudah dibuat.
- **Semua sales bisa melihat semua proyek** di organisasi (sudah: baca terbuka); **hanya bisa mengubah proyek miliknya** (sudah: `canEditOwned`). Saat melihat proyek sales lain, tampilkan badge kecil "Milik {nama}" dan sembunyikan tombol edit (sudah sebagian lewat `canEdit`; pastikan konsisten di kanban, daftar, detail). Sales tetap boleh **menambah catatan** di proyek orang lain.
- Boss tetap tersembunyi (§11.2) — proyek milik Boss tampil dengan salesperson "—"/tidak muncul di filter bagi non-owner.
- **Filter yang harus tersedia** (pakai `components/filters/filter-bar.tsx`, simpan di URL):

  | Filter | Kanban Pipeline | Daftar Deal | Status |
  |---|---|---|---|
  | Salesperson (multi, termasuk "Saya") | ✅ multi | ✅ multi | — |
  | Pipeline (Sales/Presales/…) | via dropdown judul | ✅ | — |
  | Tahap / stage proyek | kolom kanban | ✅ multi | — |
  | Status Open/Won/Lost | — | ✅ ada | — |
  | Tag / kategori (Lift, Pompa, AC, …) | ✅ ada | ✅ ada | — |
  | Jenis klien & nama Owner/Konsultan/Kontraktor | ✅ | ✅ | — |
  | Lokasi proyek (kota/provinsi) | ✅ | ✅ | — |
  | Target closing (bulan/kuartal/rentang) | ✅ | ✅ | — |
  | Nilai min–maks | ✅ | ✅ | — |

- Tombol cepat di daftar Deal: **"Proyek saya"**, **"Closing bulan ini"**, **"Tanpa aktivitas"** (preset filter).

### 16.4 Hasil riset CRM lain → yang diambil (sederhana)
Dibandingkan dengan Pipedrive, HubSpot CRM, Zoho CRM, dan Odoo CRM:

| Fitur di CRM lain | Keputusan | Catatan |
|---|---|---|
| Pipeline kanban, stage probability, weighted forecast | ✅ sudah ada | — |
| "Selalu ada aktivitas berikutnya" (Pipedrive) & deal basi/rotting | ✅ sudah ada | — |
| Alasan kalah wajib, laporan won/lost | ✅ sudah ada | — |
| Produk/line item di deal | ✅ sudah ada | — |
| Saved filters / views | ✅ ada (Pipeline) | perluas ke daftar Deal |
| **Target/goal per salesperson** (Pipedrive Goals, Zoho Targets) | ➕ **ambil** | Settings → Target: nilai target **won per bulan** per salesperson (tabel `sales_targets`: user_id, month, amount). Dashboard Performa Sales: kolom Target + progress bar. Hanya Boss/Administrator yang mengatur. |
| **Cek duplikat** perusahaan/kontak (HubSpot) | ➕ **ambil** | Saat membuat/impor: peringatkan bila nama perusahaan mirip (abaikan PT/CV/Tbk, huruf besar, spasi) atau email/telepon sama. Tidak ada merge otomatis. |
| **Lokasi proyek** (field custom umum di CRM konstruksi) | ➕ **ambil** | `deals.project_city`, `deals.project_province` (teks/pilihan provinsi Indonesia); tampil di detail & filter. |
| Riwayat perubahan per deal (audit) | ✅ sudah ada (timeline) | — |
| Kalender aktivitas mingguan | ➕ opsional | Tampilan minggu di halaman Aktivitas (tanpa sinkron Google Calendar). |
| Ekspor CSV/Excel | ✅ sebagian | pastikan daftar Deal & Perusahaan bisa ekspor sesuai filter. |
| Integrasi email/inbox, sekuens email, web form/lead capture, territory, AI scoring, chatbot | ❌ tidak | terlalu kompleks untuk kebutuhan sekarang. |
| Lead terpisah dari deal (Odoo/Salesforce) | ❌ tidak | pipeline **Presales** sudah menggantikan tahap lead. |
| Quote/penawaran PDF | ⏸ nanti | cukup lampiran PDF penawaran (§13.4) untuk saat ini. |

### 16.6 Referensi proyek Presales di deal Sales (keputusan user 14 Okt 2026)
- Kolom `deals.presales_deal_id` (migration `0012`, FK ke `deals`, `on delete set null`).
- Form deal baru/edit di pipeline Sales: kolom **Proyek presales** = kotak cari (`components/presales-picker.tsx`) yang hanya menampilkan proyek Presales (open/won) yang punya **minimal satu tag produk yang sama** dengan tag yang dipilih; tanpa tag → petunjuk "pilih produk dulu". Melepas tag sehingga tidak ada yang sama → referensi dikosongkan.
- Server (`assertPresalesRef` di `lib/actions/crm.ts`) menolak referensi bila deal bukan pipeline Sales, target bukan Presales, atau tidak ada tag yang sama.
- Detail deal Sales: baris **Proyek presales** (ubah/hapus + tautan). Detail deal Presales: baris **Proyek sales** berisi deal Sales yang merujuknya.

### 16.5 Definition of done
- Tidak ada label klien selain Konsultan/Kontraktor/Owner di seluruh aplikasi (form, filter, impor, seed, i18n).
- Sales A login → melihat proyek Sales B di kanban & daftar, bisa filter by salesperson/pipeline/tahap/jenis klien, tidak bisa mengedit proyek B, bisa menambah catatan.
- Dashboard menampilkan target vs realisasi per salesperson.

## 17. Integrasi AI (Google Gemini)

Prinsip: **AI memberi saran, manusia yang memutuskan.** AI tidak pernah menulis ke database tanpa konfirmasi user. Semua fitur memakai Bahasa Indonesia (atau EN sesuai locale user) dan konteks MEP: HVAC, pompa, fire, lift; pihak proyek Owner/Konsultan/Kontraktor.

### 17.1 Pilihan model & biaya
- SDK resmi `@google/genai` (server-only). Model default **Gemini Flash** versi stabil terbaru (mis. `gemini-2.5-flash`) untuk hampir semua fitur (murah & cepat); **Gemini Pro** hanya untuk analisis berat (ringkasan mingguan, analisis menang/kalah). Cek nama model terbaru di dokumentasi Google AI sebelum implementasi; simpan nama model di env agar mudah diganti.
- Env: `GEMINI_API_KEY` (server only, jangan `NEXT_PUBLIC_`), `GEMINI_MODEL_FAST`, `GEMINI_MODEL_SMART`, `AI_ENABLED=true|false`.
- **Privasi:** data klien dikirim ke Google. Untuk produksi gunakan **paid tier (pay-as-you-go)** — pada free tier, Google dapat memakai data untuk peningkatan produk. Free tier boleh untuk uji coba dengan data dummy.
- Kirim **seminimal mungkin**: hanya field deal/kontak yang dibutuhkan fitur itu, tanpa email/telepon kecuali memang diperlukan (draft pesan).

### 17.2 Fondasi teknis
- `lib/ai/gemini.ts` (`import "server-only"`): satu fungsi `generate({ feature, prompt, schema?, model })` dengan timeout (±20 s), retry 1×, dan **structured output** (`responseMimeType: "application/json"` + `responseSchema`) untuk fitur yang hasilnya diproses kode. Validasi ulang hasil dengan zod.
- Prompt terpusat di `lib/ai/prompts.ts` (versi diberi nomor), data konteks dirakit dari query yang sudah menghormati RLS/role — AI hanya melihat data yang boleh dilihat user tersebut (Boss tetap tersembunyi).
- Pemanggilan lewat **server action** atau route `app/api/ai/[feature]/route.ts` (streaming untuk teks panjang). Cek `AI_ENABLED`, sesi & role sebelum memanggil.
- Tabel `ai_usage` (organization_id, user_id, feature, model, input_tokens, output_tokens, ms, ok, created_at) — **tanpa** menyimpan isi prompt/jawaban. Kuota harian per user & per organisasi (mis. 100 panggilan/user/hari), pesan ramah bila habis.
- UI: tombol **✨ AI** konsisten (ikon `Sparkles` lucide), loading skeleton, tombol **Salin**, **Pakai** (mengisi form, belum menyimpan), **Buang**. Label kecil "Dibuat AI — periksa sebelum disimpan".
- Gagal/timeout → tampilkan pesan, fitur CRM lain tetap jalan.

### 17.3 Fitur (urut prioritas)

**Tahap 1 — paling berguna, paling sederhana**
- **A. Ringkasan deal** (panel kanan detail deal): 4–6 poin — kondisi terakhir, siapa Owner/Konsultan/Kontraktor, aktivitas & catatan penting, risiko, langkah berikutnya. Input: field deal, 20 timeline terakhir. Tombol "Perbarui ringkasan".
- **B. Catatan / chat → aksi**: tempel catatan rapat atau percakapan WhatsApp di composer → AI mengembalikan JSON: ringkasan catatan, **aktivitas berikutnya** (jenis, subjek, tanggal), usulan perubahan field (nilai, target closing, tahap, kontak baru). User mencentang yang mau dipakai → disimpan lewat server action biasa (`addNoteAction`, `saveActivityAction`, `updateDealAction`).
- **C. Draft follow-up**: tombol "Buat draft pesan" (pilih: WhatsApp / email; nada: formal / santai; tujuan: follow-up penawaran, konfirmasi meeting, ucapan terima kasih). Hasil bisa disalin atau dibuka via `wa.me`/`mailto:`. **Tidak mengirim otomatis.**

**Tahap 2 — membantu manajer & direktur**
- **D. Langkah berikutnya & sinyal risiko**: gabungan aturan (deal basi, target closing lewat, tanpa aktivitas, belum ada konsultan/kontraktor, nilai besar tapi probabilitas rendah) + kalimat saran dari AI. Tampil sebagai badge di kanban & daftar "Butuh perhatian".
- **E. Tanya data dengan bahasa biasa** di daftar Deal/kanban: "proyek Rani yang closing bulan ini di atas 1 M", "deal pompa di Makassar yang konsultannya PT X" → AI **hanya** mengubah kalimat menjadi JSON filter yang diizinkan (salesperson, pipeline, tahap, status, tag, jenis klien, pihak proyek, kota, rentang tanggal, nilai) → diterapkan ke filter URL yang sudah ada (§16.3). **Tidak ada SQL dari AI.**
- **F. Ringkasan mingguan** untuk Boss/Administrator: kartu di dashboard + (opsional) email Senin 07.00 via Vercel Cron & Resend — deal baru, pindah tahap, menang/kalah + alasan, deal macet, performa per salesperson vs target. Dihitung dulu dengan query, AI hanya menyusun narasi.

**Tahap 3 — lebih canggih, setelah tahap 1–2 stabil**
- **G. Bantu impor Odoo** (§14): usul pemetaan kolom, merapikan nama perusahaan (PT/CV, kapitalisasi), menebak **jenis klien** (Konsultan/Kontraktor/Owner) dan mendeteksi kemungkinan duplikat — semua sebagai saran di layar pratinjau.
- **H. Ekstraksi PDF penawaran / BOQ** (Gemini membaca PDF/gambar): unggah file → AI mengeluarkan daftar item (nama, qty, satuan, harga) → dicocokkan ke katalog produk → user konfirmasi menjadi line item deal. File disimpan sebagai lampiran (§13.4).
- **I. Analisis menang/kalah** bulanan: pola dari alasan kalah, catatan, durasi tahap, jenis klien → 3–5 insight dan saran perbaikan.
- *(Nanti, Fase 7 PWA)* **Catatan suara**: rekam di HP → transkrip + ringkasan → jadi catatan/aktivitas (alur seperti B).

### 17.4 Yang tidak dibuat
- Chatbot umum tanpa batas, AI yang mengirim email/WA otomatis, AI yang mengubah data tanpa konfirmasi, skor prediksi "AI" tanpa data historis yang cukup.

### 17.5 Definition of done
- Semua fitur bisa dimatikan dengan `AI_ENABLED=false` tanpa error.
- Uji dengan data demo lokal dulu (`lib/demo/seed.ts`), lalu produksi dengan paid tier.
- Tiap fitur: role & visibilitas dihormati, hasil divalidasi zod, pemakaian tercatat di `ai_usage`, kuota berjalan, teks dalam ID/EN sesuai locale.

## 18. Lingkungan Development Lokal (Docker) & Akun Testing — ✅ SUDAH ADA

Untuk Cursor/Claude/developer: database **lokal di Docker** (Supabase lokal), bisa login, melihat isi CRM, dan debug. **Tidak pernah** memakai atau membuat akun di produksi `airtek.my.id`.

### 18.1 Cara menjalankan (lihat juga README)
1. Docker Desktop menyala → `pnpm db:start` (Postgres, Auth, Storage, Realtime, Studio, Mailpit; port 554xx karena 543xx dipakai project lain). Semua `supabase/migrations` diterapkan otomatis.
2. `.env.local`: URL `http://127.0.0.1:55421`, publishable & secret key dari output `db:start`, `BOOTSTRAP_ADMIN_EMAIL=boss@airtek.test`, `DEV_TEST_PASSWORD=` (kosong = `airtek-dev-123`).
3. `pnpm dev:seed` → organisasi **PT. Airtek Solusi Nusantara (DEV)** dengan data contoh `lib/demo/seed.ts` (36 deal, 12 perusahaan, 20 kontak, produk, aktivitas) + akun:

   | Email | Level |
   |---|---|
   | `boss@airtek.test` | Boss (owner, tersembunyi) |
   | `admin@airtek.test` | Administrator |
   | `sales1@airtek.test` | Sales |
   | `sales2@airtek.test` | Sales |

4. `pnpm dev` → `/id/login` → tombol **Masuk cepat (dev)** (hanya muncul saat `next dev` + Supabase localhost; aksi `devLoginAction` menolak di luar itu, kata sandi tidak pernah dikirim ke browser).

### 18.2 Alat debug
- **Supabase Studio** `http://127.0.0.1:55423` — lihat/ubah isi tabel, SQL editor, storage.
- **Mailpit** `http://127.0.0.1:55424` — semua email (undangan, konfirmasi, reset) tertangkap di sini; klik link untuk menguji alur undangan.
- **psql** `postgresql://postgres:postgres@127.0.0.1:55422/postgres`.
- `pnpm db:reset` mengulang database dari migration, lalu `pnpm dev:seed` lagi. `pnpm db:stop` mematikan.

### 18.3 Aturan untuk AI agent
- Uji di lokal dengan akun §18.1 sesuai level (fitur visibilitas: masuk sebagai `sales1` lalu `sales2`; fitur admin: `admin`; Boss tersembunyi: cek dari `admin`/`sales`).
- `scripts/dev-seed.ts` **menolak** URL selain localhost — jangan dihapus pengamannya.
- Jangan menyimpan kredensial produksi di repo, jangan membuat akun di Supabase produksi, jangan login ke `airtek.my.id` untuk testing.
- Migration baru: tulis di `supabase/migrations/000N_*.sql`, uji dengan `pnpm db:reset` + `pnpm dev:seed`, baru minta user menjalankannya di produksi.

## 19. URL Tanpa Locale, Bahasa dari Pengaturan, Halaman Depan Statis

Keputusan user (13 Okt 2026): **website cepat, minim redirect, ringan.** (1) Tidak ada lagi `/id` atau `/en` di URL — bahasa diatur di Pengaturan, **default English**. (2) `https://airtek.my.id/` adalah **halaman depan statis** (bukan redirect ke login/dashboard) dengan tombol **Sign in** atau **Open dashboard** bila sesi masih aktif.

### 19.1 Target redirect (wajib tercapai)

| Buka | Hasil | Redirect |
|---|---|---|
| `https://airtek.my.id/` | halaman depan statis | **0** |
| `http://airtek.my.id/`, `https://www.airtek.my.id/` | → `https://airtek.my.id/` (Vercel, tidak bisa dihilangkan) | 1 |
| `/login` (belum login) / `/dashboard` (sudah login) | tampil langsung | **0** |
| `/dashboard` atau halaman app lain (belum login) | → `/login?next=/dashboard` | 1 |
| `/login`, `/register`, `/forgot-password` (sudah login) | → `/dashboard` | 1 |
| URL lama `/id/...` atau `/en/...` (bookmark, email lama) | → path yang sama tanpa prefix (308) + simpan cookie bahasa | 1 |

### 19.2 Bahasa tanpa routing (next-intl "without i18n routing")
- Pindahkan semua route dari `app/[locale]/...` ke `app/...` (grup `(app)`, `(auth)`, `onboarding`, `accept-invite`, `not-found` tetap). Hapus segmen `[locale]`, `generateStaticParams` locale, dan `setRequestLocale`.
- `i18n/request.ts` menentukan bahasa per request dengan urutan: **`profiles.locale`** (user login) → cookie **`NEXT_LOCALE`** → default **`en`**. Tidak ada deteksi `Accept-Language` (user minta default English).
- Ganti `Link`/`redirect`/`useRouter`/`usePathname` dari `@/i18n/navigation` dengan versi `next/link` & `next/navigation`; hapus `i18n/routing.ts` & `createMiddleware` next-intl.
- **Pengaturan → Profil → bagian Bahasa tersendiri** (keputusan user 13 Okt 2026): toggle **English | Bahasa Indonesia** (bukan dropdown), terpisah dari form profil, langsung tersimpan lewat `updateLocaleAction` (`profiles.locale` + cookie `NEXT_LOCALE` 1 tahun) lalu `router.refresh()`. Default English.
- **Tidak ada tombol bahasa** di topbar, halaman depan, login/register, maupun halaman undangan (keputusan user 13 Okt 2026): bahasa **hanya** diubah di Pengaturan → Profil. Pengunjung yang belum login selalu melihat English (kecuali cookie `NEXT_LOCALE` dari login sebelumnya).
- Migration baru: `alter table public.profiles alter column locale set default 'en';` (baris lama tidak diubah — user yang sudah memilih ID tetap ID). Sesuaikan `provisionOrganization`/seed agar user baru `locale = 'en'`.
- `<html lang>` mengikuti bahasa aktif; format tanggal/uang (`lib/format.ts`) mengikuti bahasa aktif (Rupiah tetap).

### 19.3 Halaman depan statis `/`
- `app/page.tsx` **statis penuh** (`export const dynamic = "force-static"`, tanpa `cookies()`/`headers()`/query DB) → disajikan dari CDN Vercel, tanpa middleware.
- Isi ringkas & ringan: logo Airtek, judul (EN default, ID via cookie di client — atau teks EN saja + tombol bahasa), 1–2 kalimat nilai CRM, satu tombol utama, footer "PT. Airtek Solusi Nusantara". Tanpa gambar besar, tanpa library grafik, JS seminimal mungkin (satu komponen client kecil untuk tombol).
- Tombol: default **Sign in** → `/login`. Bila browser punya cookie penanda sesi (lihat 19.4) → **Open dashboard** → `/dashboard` (prefetch saat hover). Bila sesi ternyata sudah kedaluwarsa, middleware mengarahkan `/dashboard` → `/login` (1 redirect, dapat diterima).
- Tidak ada redirect otomatis dari `/`.

### 19.4 Penanda sesi ringan (tanpa query di halaman depan)
- Saat login sukses (semua jalur: password, undangan, onboarding, dev quick login): set cookie **`airtek_signed_in=1`** (bukan httpOnly, tanpa data rahasia, `SameSite=Lax`, `Secure`, umur = umur sesi). Hapus saat logout/sign-out/hapus akun.
- Halaman depan membaca cookie ini di client (`document.cookie`) hanya untuk memilih label/tujuan tombol. Keamanan tetap di middleware & server (cookie ini bukan bukti login).

### 19.5 Middleware & link
- `middleware.ts` hanya untuk halaman app & auth: matcher mengecualikan `/` (landing), `/_next`, `/api`, `/auth`, aset bertitik, `/brand`. Tidak ada lagi logika locale kecuali **redirect 308 URL lama `/id|/en/...`** ke path tanpa prefix (+ set `NEXT_LOCALE`).
- Cek login tetap `getClaims()` (§15.0 Langkah 2), hanya untuk path yang butuh keputusan (app = wajib login; `/login`,`/register`,`/forgot-password` = kirim ke dashboard bila sudah login). `/reset-password`, `/accept-invite` publik tanpa cek.
- Ganti semua path ber-prefix di kode: `/auth/callback` default & error (`/id/onboarding`, `/id/login`), `/auth/sign-out`, `/auth/onboarding`, `next=` di `inviteMemberAction`/`forgotAction`/`resendConfirmation`, cron email (`https://airtek.my.id/activities`), notifikasi `href`, `revalidatePath`.
- **Template email** (`supabase/templates/*.html`): `next=/accept-invite`, `next=/onboarding`, `next=/reset-password`. ⚠️ Ini kondisi berhenti: user harus menempel ulang 3 template di Supabase → Email Templates (link lama `/id/...` tetap jalan berkat redirect 308).
- Supabase Redirect URLs tidak berubah (tetap `/auth/callback`).

### 19.6 Uji & definisi selesai
- Lokal (§18) sebagai belum login dan `sales1`: `/` = 0 redirect & tombol benar; `/dashboard` belum login = 1 redirect; `/id/login` lama = 1 redirect ke `/login`; ganti bahasa di Pengaturan → teks berubah tanpa URL berubah; login page EN default, toggle ID bekerja; undangan (Mailpit), onboarding Boss, reset password, cron 401 tetap jalan.
- `curl -sL -o /dev/null -w "%{num_redirects} %{time_total}
"` untuk tabel 19.1 di produksi setelah deploy; catat di §15.1.
- Lighthouse desktop halaman depan ≥ 95 (statis), halaman login ≥ 90.

## 20. Mobile-friendly & PWA

Tujuan: sales di lapangan bisa membuka CRM dari HP dengan nyaman (cek proyek, telepon/WA klien, catat aktivitas, pindah tahap) dan **memasangnya di layar utama** seperti aplikasi. Desktop tetap tampilan utama — perubahan mobile **tidak boleh** merusak tampilan 1280–1920px.

### 20.1 Yang sudah ada (Cursor, 13 Okt 2026) — pertahankan
- `app/manifest.ts`: nama "Airtek CRM", `start_url: "/dashboard"`, `scope: "/"`, `display: "standalone"`, theme `#9a1b4b`, ikon 192/512 + maskable 512 (`public/icons`). Setelah §19, pastikan tidak ada path ber-prefix `/id`.
- `public/sw.js` + `components/pwa-register.tsx`: hanya cache **aset statis** (`/_next/static`, `/brand`, `/icons`), didaftarkan **hanya di produksi**; `/api`, `/auth`, halaman, dan data user **tidak** di-cache (aman untuk HP bersama & logout).
- Menu bawah (layar < 768px) dengan `env(safe-area-inset-bottom)`; tabel produk di detail deal bisa digeser horizontal.

### 20.2 Audit semua halaman di lebar kecil (wajib)
Uji di 360, 390, 414 dan 768px (Chrome DevTools device mode: iPhone SE, iPhone 14, Pixel 7, iPad Mini):
- **Tidak ada scroll horizontal di level halaman**; elemen lebar (tabel, kanban) scroll di wadahnya sendiri.
- **Target sentuh ≥ 44×44px**; jarak antar tombol cukup; teks minimal 14px.
- **Input font-size ≥ 16px di mobile** (cegah zoom otomatis iOS).
- **Daftar → kartu** di < 768px: Deal, Kontak, Perusahaan, Aktivitas, Produk, Anggota. Kartu berisi judul, nilai/subjudul, chip status/tag, salesperson, 1–2 aksi cepat. Desktop tetap tabel.
- **Filter bar → tombol "Filter" + panel bawah (bottom sheet)** di mobile; chip filter aktif tetap terlihat di atas daftar.
- **Dialog/form → sheet layar penuh** di mobile (tombol simpan menempel di bawah, tidak tertutup keyboard).
- **Topbar mobile ringkas**: logo kecil, ikon cari (membuka command palette layar penuh), notifikasi, avatar. Sidebar desktop disembunyikan (menu bawah dipakai).
- **Dashboard**: KPI 2 kolom, grafik tinggi menyesuaikan (min 220px), tabel Performa Sales → kartu per salesperson.
- **Pengaturan**: menu samping jadi daftar/tab horizontal yang bisa digeser.
- Halaman auth & halaman depan (§19): satu kolom, panel hero disembunyikan di < 1024px (sudah), tombol penuh lebar.

### 20.3 Kanban di HP
- < 768px: **satu kolom per layar** — tab/chip tahap di atas (nama + jumlah + total) yang bisa digeser; geser kiri/kanan konten pakai CSS `scroll-snap` (tanpa library baru).
- **Pindah tahap tanpa drag**: menu "⋯" di kartu → "Pindah ke…" (daftar tahap) + Menang/Kalah. Drag & drop hanya desktop (atau sensor sentuh @dnd-kit dengan delay ≥ 250ms bila tetap diaktifkan).
- Quick-add deal tetap ada di atas kolom aktif.
- Header pipeline: pemilih pipeline + tombol Filter (sheet) + "Deal baru".

### 20.4 Detail deal di HP
- Satu kolom: header ringkas (judul, nilai, status, tahap) → kartu KPI 2×2 → info (pihak proyek, kontak, salesperson) → tab: **Timeline** | Catatan | Produk | Kontak | Lampiran.
- **Bar aksi menempel di bawah**: **Telepon**, **WhatsApp**, **+ Aktivitas**, **+ Catatan** (membuka sheet). Telepon/WA memakai nomor kontak utama.
- Stage bar → dropdown/segmented yang bisa digeser; Won/Lost di menu "⋯".
- Inline edit tetap bisa (tap field → editor layar penuh bila perlu).

### 20.5 Fitur aplikasi (PWA)
- **Ajakan pasang**: Android/Chrome — tangkap `beforeinstallprompt`, tampilkan banner kecil "Pasang Airtek CRM" (sekali, bisa ditutup, simpan di `localStorage`). iOS Safari — tampilkan petunjuk "Bagikan → Tambahkan ke Layar Utama" bila belum standalone. Jangan muncul di desktop.
- **Halaman offline** `/offline` (statis, dipre-cache): "Anda sedang offline — sambungkan internet untuk membuka data CRM." SW menampilkannya saat navigasi gagal. **Tetap tidak meng-cache halaman/data user.**
- **Versi baru**: saat SW baru terpasang, toast "Versi baru tersedia" + tombol **Muat ulang** (`skipWaiting` lalu reload). Naikkan nama cache (`airtek-static-vN`) setiap perubahan daftar precache.
- `apple-touch-icon`, `theme-color` per tema (terang/gelap) lewat `viewport` export Next.js, `apple-mobile-web-app-capable`/status bar style.
- 🔒 **Web push** (aktivitas jatuh tempo): butuh kunci VAPID di env + tabel `push_subscriptions` + izin user; iOS hanya untuk PWA terpasang (iOS 16.4+). **Tunggu keputusan user** — sementara cukup notifikasi in-app + email harian (§13.7).

### 20.6 Uji & definisi selesai
- Lokal (§18): login sebagai `sales1` di DevTools device mode — buka pipeline (geser antar tahap, pindah tahap via menu), detail deal (bar aksi, tambah aktivitas), daftar Deal/Kontak (kartu + filter sheet), dashboard, pengaturan. Tidak ada scroll horizontal halaman.
- Produksi (setelah push): Chrome DevTools → Application → Manifest "Installable" tanpa error; Lighthouse **mobile** ≥ 85 untuk halaman depan & login; uji pasang di HP Android (Chrome) & iPhone (Safari) bila memungkinkan — minta user mencoba dan melapor.
- Desktop 1280 & 1920px tidak berubah (cek ulang kanban, detail deal, dashboard).

### 20.7 Hasil (13 Okt 2026)
- **Komponen bersama:** `Dialog` = layar penuh di < 640px; input 16px di HP; `DataTable` = kartu di < 768px (kolom pertama jadi judul, sisanya label/nilai); `TabsList` bisa digeser; topbar HP: logo kecil + ikon cari (command palette layar penuh dengan tombol Batal).
- **Filter:** HP = kotak cari + tombol **Filter (n)** → sheet berisi semua filter + Reset / Tampilkan hasil. Desktop = satu baris + **Filter lainnya**.
- **Kanban:** satu kolom selebar layar (scroll-snap), chip tahap di atas (nama · jumlah) yang mengikuti posisi geser. **Seluruh kartu bisa di-drag** (bukan hanya ikon grip): mouse setelah bergeser 6px, layar sentuh dengan tekan-tahan 250ms (geser biasa tetap menggulir). Menu **Pindah ke…** di kartu tetap ada sebagai alternatif; keduanya memakai alur yang sama (Kalah → dialog alasan).
- **Detail deal:** satu halaman bergulir di < 1024px (panel aktivitas di bawah), header ringkas (kembali, ‹ n/N ›, ⋯ berisi Menang/Kalah), stage bar bisa digeser, **bar aksi bawah**: Telepon · WhatsApp · Aktivitas · Catatan (membuka & memfokuskan composer).
- **PWA:** `components/pwa-register.tsx` (`PwaSupport` di `AppShell`): daftar `public/sw.js` hanya di produksi; toast **Versi baru tersedia → Muat ulang** (SW menunggu `SKIP_WAITING`); banner pasang sekali di HP (Android `beforeinstallprompt`, iOS petunjuk Bagikan → Tambahkan ke Layar Utama; ditutup = `localStorage airtek_install_dismissed`). Halaman offline = `public/offline.html` (HTML statis tanpa JS, dipre-cache; navigasi gagal → halaman ini). `theme-color` terang/gelap lewat `viewport`. Cache `airtek-static-v2`.
- **Diuji lokal:** 390px tanpa scroll horizontal di dashboard, pipeline, deal, detail deal, aktivitas; pindah tahap via menu tersimpan di DB; Chrome headless: SW aktif & mengontrol halaman, server dimatikan → halaman offline tampil. Lighthouse mobile: halaman depan 87–88 (halaman depan kini Server Component, hanya tombol tema & Sign in yang client), login 91, a11y 100. Halaman setelah login mobile 56–65 (dibatasi §15.3 muat-semua-tabel & §15.6 bundle — dikerjakan di item 8).
- **Belum:** uji pasang di HP sungguhan (user), 🔒 web push.

