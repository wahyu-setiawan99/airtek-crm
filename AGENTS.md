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

### Fase 7 — Mobile PWA (menyusul, JANGAN dikerjakan sebelum Fase 0–6, 8, dan 9 selesai)
- [ ] Web App Manifest (nama, ikon 192/512, theme color), installable di Android/iOS
- [ ] Service worker (Serwist) — cache aset + data baca terakhir (offline read-only)
- [ ] Layout mobile ≤ 768px: bottom nav, kanban 1 kolom dengan swipe antar stage, detail deal satu kolom (timeline jadi tab)
- [ ] Tombol telepon/WA besar, quick-add aktivitas sekali tap
- [ ] Web push notification untuk aktivitas jatuh tempo

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
