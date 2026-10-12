# AGENTS.md — Airtek CRM

Panduan untuk AI agent (Cursor, Claude, dll) yang membangun project ini. Baca seluruh file ini sebelum menulis kode. Kerjakan per fase, centang checklist saat selesai.

## 1. Tujuan
CRM web untuk PT. Airtek Solusi Nusantara (kontraktor HVAC, Pump, TDG, Lift) — menggantikan Odoo CRM dengan UX lebih cepat, multi-pipeline, forecast yang jelas. **Desktop-first** (PC/laptop); versi mobile menyusul sebagai PWA (Fase 7).

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
- [ ] Lighthouse desktop ≥ 90, aksesibilitas (label, fokus, kontras)

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
- [ ] Kelola undangan: kirim ulang, batalkan, status Menunggu/Diterima/Kedaluwarsa (§13.1)
- [ ] Filter seragam di Kontak, Perusahaan, Aktivitas, Produk, Laporan (§13.2)
- [ ] Bulk ganti salesperson + ganti pemilik kontak/perusahaan (§13.3)
- [ ] Lampiran file via Supabase Storage (§13.4)
- [ ] Realtime kanban (§13.5)
- [ ] Custom fields (§13.6)
- [ ] Pengingat aktivitas via email harian (§13.7)
- [ ] QA: Lighthouse ≥ 90, aksesibilitas, hydration warning (§13.8)
- [ ] Sidebar bisa diciutkan (mode ikon) / dimunculkan (§13.9)
- [ ] Impor data dari Odoo CRM (§14) — **hanya setelah semua sales sudah diundang & aktif** (§14.0)
- [ ] Jenis klien Konsultan/Kontraktor/Owner + pihak proyek (§16.1–16.2)
- [ ] Visibilitas & filter proyek lintas sales (§16.3)
- [ ] Fitur sederhana dari riset CRM lain: target sales, cek duplikat, lokasi proyek (§16.4)

### Fase 7 — Mobile PWA (menyusul, JANGAN dikerjakan sebelum Fase 0–6, 8, dan 9 selesai)
- [ ] Web App Manifest (nama, ikon 192/512, theme color), installable di Android/iOS
- [ ] Service worker (Serwist) — cache aset + data baca terakhir (offline read-only)
- [ ] Layout mobile ≤ 768px: bottom nav, kanban 1 kolom dengan swipe antar stage, detail deal satu kolom (timeline jadi tab)
- [ ] Tombol telepon/WA besar, quick-add aktivitas sekali tap
- [ ] Web push notification untuk aktivitas jatuh tempo

### Fase 10 — Optimasi kecepatan (FASE TERAKHIR, setelah Fase 9 dan Fase 7) — detail di §15
- [ ] Ukur baseline (Vercel Speed Insights, Lighthouse, waktu server per halaman) (§15.1)
- [ ] Kurangi redirect berantai menjadi maksimal 1 lompatan (§15.2)
- [ ] Ganti snapshot "muat semua tabel" dengan query per halaman (§15.3)
- [ ] Kurangi panggilan auth per request (§15.4)
- [ ] Revalidasi & cache yang lebih sempit (§15.5)
- [ ] Perkecil bundle JavaScript (§15.6)
- [ ] Cek region & index database (§15.7)

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
- Template email Supabase (Konfirmasi, Undangan, Reset password) dalam Bahasa Indonesia dengan nama "Airtek CRM".

### 11.2 Undangan oleh administrator
- **Level yang dipakai (keputusan user 12 Okt 2026):**
  1. **Boss** = `owner` = main administrator (`BOOTSTRAP_ADMIN_EMAIL`). Akses penuh dan **tersembunyi**: tidak muncul di daftar anggota, pilihan salesperson, maupun Performa Sales bagi non-owner (`orgPeople()` di `lib/queries.ts`). Hanya owner yang bisa mengubah/mengeluarkan baris owner atau memberi role owner.
  2. **Administrator** = `admin` (direktur). Bisa semua hal termasuk mengundang & mengatur sales. Boss menaikkan seseorang ke Administrator di Pengaturan → Anggota.
  3. **Sales** = `sales`, diundang via email oleh Administrator/Boss.
  - Form undangan dan pemilih role hanya menawarkan Administrator & Sales. Role `manager`/`presales`/`viewer` masih ada di DB/izin tapi tidak ditawarkan di UI.
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
  - **Presales**: Lead Masuk 10% → Survey Lokasi 25% → Desain & BOQ 40% → Estimasi Biaya 60% → Serah ke Sales 80% → Won → Lost.
- Pipeline custom tetap bisa ditambah di Pengaturan → Pipeline; tambahkan tombol **Duplikat pipeline** (salin stage).
- Aksi **Kirim ke pipeline Sales** di detail deal Presales: pindah ke stage pertama pipeline Sales, catat riwayat, opsional ganti salesperson.
- Pipeline default per role: `presales` → Presales, lainnya → Sales.

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
- Satu tombol Terang/Gelap di topbar dan halaman login (tanpa opsi "Sistem"). Sebelum user memilih, tema mengikuti perangkat (`profiles.theme = system`).
- Simpan per user di `profiles.theme` (`light` | `dark` | `system`, default `system`) dan terapkan setelah login. Halaman login/register mengikuti tema sistem.
- Cek kontras semua komponen (kanban, chart Recharts, dialog, tabel, badge DEMO) di kedua mode pada 1280px dan 1920px.

## 12. Email Undangan Custom (gratis)

Tujuan: email undangan seperti Odoo — penerima klik **Terima undangan**, langsung ke halaman buat kata sandi, lalu masuk. **Hanya lewat email** (tidak ada link undangan via WhatsApp / salin tautan).

**Contoh isi (Bahasa Indonesia):**
> **Subjek:** {invited_by} dari {organization} mengundang Anda ke Airtek CRM
>
> Halo {full_name},
> *Tautan ini berlaku 7 hari.*
> **{organization}** menggunakan **Airtek CRM** untuk mengelola pipeline penjualan. Anda diundang oleh **{invited_by}** sebagai **{role}**.
> Setelah diterima, Anda dapat masuk melalui:
> • Login: {email}
> • Tautan: https://airtek.my.id
> [ Terima undangan ]  ← tombol warna brand
> Airtek CRM · PT. Airtek Solusi Nusantara

**Cara kerja (sudah tersedia di kode):**
- `inviteMemberAction` (`lib/actions/crm.ts`) memanggil `admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL + "/auth/callback?next=/id/accept-invite", data: { full_name, invitation_id, invited_by, organization, role } })`.
- Link default Supabase membawa sesi di hash URL; `/auth/callback` meneruskan ke `/id/accept-invite` dan `components/accept-invite-form.tsx` memasang sesi dari hash, lalu meminta **nama + kata sandi** → `acceptInviteAction` → membership sesuai role → dashboard.
- `/auth/callback` juga mendukung `?token_hash=&type=invite` (lebih andal bila template memakai TokenHash).

**Yang harus dikerjakan:**
- [ ] Template HTML `supabase/templates/invite.html` (ID, tabel/inline CSS agar tampil baik di Gmail/Outlook): logo dari `https://airtek.my.id/brand/airtek-logo.png`, salam, isi seperti contoh di atas, tombol **Terima undangan** warna `#9a1b4b`, footer. Variabel Supabase: `{{ .Data.full_name }}`, `{{ .Data.invited_by }}`, `{{ .Data.organization }}`, `{{ .Data.role }}`, `{{ .Email }}`, `{{ .SiteURL }}`.
  - Tombol memakai: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/id/accept-invite`
  - Label role tampil sebagai "Administrator"/"Sales" (`role` berisi `admin`/`sales`; gunakan `{{ if eq .Data.role "admin" }}Administrator{{ else }}Sales{{ end }}`).
- [ ] Template serupa untuk **Konfirmasi email** (`confirmation.html`, link `…/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/id/onboarding`) dan **Reset kata sandi** (`recovery.html`, `type=recovery&next=/id/reset-password`).
- [ ] Aktifkan di `supabase/config.toml` untuk lokal (`[auth.email.template.invite] subject=… content_path="./supabase/templates/invite.html"`, dst.) dan uji dengan Mailpit (`http://127.0.0.1:55424`).
- [ ] Produksi (dikerjakan user, dipandu): Supabase → Authentication → **Email Templates** → tempel subjek + HTML untuk Invite user, Confirm signup, Reset password.
- [ ] **SMTP gratis — Resend** (3.000 email/bulan, 100/hari): daftar resend.com → Domains → tambah `airtek.my.id` → masukkan record DNS (MX/TXT SPF/DKIM) di Domainesia → buat API key → Supabase → Authentication → **SMTP Settings**: host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender `noreply@airtek.my.id`, nama "Airtek CRM". Naikkan rate limit email di Authentication → Rate Limits.
- [ ] Halaman `/accept-invite`: tampilkan juga nama organisasi & role dari `user_metadata`; tombol "Kirim ulang undangan" tidak ada di sisi penerima (hanya admin).

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
- Opsi tema "Sistem" di UI (otomatis mengikuti perangkat sampai user memilih Terang/Gelap).

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

## 15. Optimasi Kecepatan (fase akhir)

Aplikasi terasa berat. Kerjakan **setelah fitur stabil** (Fase 9 & 7), kecuali "quick win" redirect di §15.2 yang boleh lebih awal. Setiap langkah: ukur sebelum → ubah → ukur sesudah, catat angkanya di PR/commit.

### 15.1 Baseline & target
Baseline terukur 12 Okt 2026 (curl dari Indonesia, belum login):

| URL | Redirect | Waktu |
|---|---|---|
| `http://airtek.my.id/` | 3 (http→https → `/`→`/id` → `/id`→`/id/login`) | ±2,9 s |
| `https://www.airtek.my.id/` | 3 | ±1,9 s |
| `https://airtek.my.id/` | 2 | ±0,7 s |
| `https://airtek.my.id/id/login` | 0 | TTFB ±0,35–0,55 s |

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
  | Salesperson (multi, termasuk "Saya") | ✅ ada | ✅ ada | ubah ke multi-select |
  | Pipeline (Sales/Presales/…) | via dropdown judul | ❌ **belum** | tambah |
  | Tahap / stage proyek | kolom kanban | ❌ **belum** | tambah (multi) |
  | Status Open/Won/Lost | — | ✅ ada | — |
  | Tag / kategori (Lift, Pompa, AC, …) | ✅ ada | ✅ ada | — |
  | Jenis klien & nama Owner/Konsultan/Kontraktor | ❌ | ❌ | tambah |
  | Lokasi proyek (kota/provinsi) | ❌ | ❌ | tambah (§16.4) |
  | Target closing (bulan/kuartal/rentang) | ❌ | ❌ | tambah |
  | Nilai min–maks | ❌ | ❌ | tambah |

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

