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
- [x] Script `pnpm seed:demo` + akun dummy (§11.3) — `scripts/seed-demo.ts`, isi dari `lib/demo/seed.ts`
- [ ] Isi data demo disesuaikan §11.3: pipeline Sales/Presales, tag Lift/Pompa/AC, ±35 deal (sekarang masih pipeline lama "Proyek HVAC", 15 deal), akun `presales.demo`
- [x] Kategori produk berbasis tag: Lift, Pompa, AC + custom (§11.4)
- [x] Pipeline default Sales & Presales + custom (§11.5)
- [ ] Filter bar seragam di semua daftar (§11.6)
- [ ] "Salesnya siapa" terlihat & bisa difilter di mana-mana (§11.7)
- [x] Mode Terang / Gelap / Sistem, tersimpan per user (§11.8)

### Fase 7 — Mobile PWA (menyusul, JANGAN dikerjakan sebelum Fase 0–6 dan Fase 8 selesai)
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
4. Vercel → New Project → import repo → Environment Variables (Production & Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://airtek.my.id`, `BOOTSTRAP_ADMIN_EMAIL=wahyusetiawanblog9999@gmail.com` (setelah Fase 8) → Deploy. `DEMO_PASSWORD` hanya di mesin lokal saat menjalankan `pnpm seed:demo`.
5. Vercel → Project → Settings → Domains → tambah `airtek.my.id` (+ `www.airtek.my.id` redirect). Di DNS registrar `.my.id`: record `A @ 76.76.21.21` dan `CNAME www cname.vercel-dns.com` (ikuti nilai yang ditampilkan Vercel).
6. Email reset password: Supabase default SMTP sangat terbatas → pasang custom SMTP (mis. Resend) di Authentication → SMTP Settings.
7. Setiap push ke `main` → auto deploy production; branch/PR → preview deploy.

## 9. Seed Data (dev)
Lihat §11.3 — dataset demo yang sama dipakai untuk mode demo lokal (`lib/demo/seed.ts`) dan organisasi DEMO di Supabase (`pnpm seed:demo`).

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

### 11.3 Data dummy untuk demo ke direksi
- Script **`pnpm seed:demo`** (`scripts/seed-demo.ts`, jalan lokal dengan env service role yang menunjuk ke Supabase produksi). Idempotent: jika organisasi demo sudah ada, hapus lalu buat ulang.
- Buat organisasi terpisah **"PT. Airtek Solusi Nusantara (DEMO)"** supaya data asli tetap bersih. Main administrator otomatis jadi `owner` di org demo → bisa pindah data asli ↔ demo lewat org switcher. Saat org demo aktif tampilkan badge **DEMO** kuning di topbar.
- Akun dummy dibuat via `admin.auth.admin.createUser({ email_confirm: true })` (pengecualian khusus demo). Kata sandi dari env **`DEMO_PASSWORD`** — JANGAN di-commit:

  | Email | Nama | Role |
  |---|---|---|
  | `admin.demo@airtek.my.id` | Admin Demo | `admin` |
  | `direksi.demo@airtek.my.id` | Direksi Demo | `viewer` |
  | `manager.demo@airtek.my.id` | Fajrul | `manager` |
  | `sales1.demo@airtek.my.id` | Dwi Sulistyo | `sales` |
  | `sales2.demo@airtek.my.id` | Safar | `sales` |
  | `presales.demo@airtek.my.id` | Syahdi | `presales` |

- Isi data (tanggal relatif terhadap hari ini agar selalu terlihat baru):
  - Pipeline Sales & Presales (§11.5) + 1 custom contoh "Maintenance"; tag Lift, Pompa, AC + "HVAC" sebagai contoh custom.
  - ±12 perusahaan (PT NINDYA KARYA, PT. Palindo Inti Nusantara, PT. Poleanro Arta Konstruksi, CV BINTANG LEO JAYA, IAIN Pare-pare, PT Vale Indonesia, RS Wahidin, UNAM, dll) dan ±20 kontak lengkap (jabatan, email, telepon/WA).
  - ±35 deal tersebar di semua stage & salesperson, termasuk data dari Odoo: Gd Barak CPI Rp 850 jt, ADD Gd Sauraja CPI Rp 7,3 M, Gd. Wisma Negara CPI (Pump) Rp 496.759.721, Mobile Fire Pump PTVI Rp 7,9 M, AC Presisi UNAM Rp 530,8 jt, Gd. Bunker Wahidin Rp 330 jt, Lift IAIN Pare-pare Rp 910,2 jt, Gd. PA Mamuju Rp 1,4 M. Sebagian Won/Lost (dengan alasan) dalam 6 bulan terakhir agar grafik dashboard & laporan terisi.
  - Line item produk, aktivitas (terlambat / hari ini / mendatang), catatan, riwayat stage, beberapa deal basi.
- Tombol **Hapus data demo** di Pengaturan → Organisasi (hanya owner, hanya di org demo).
- Mode demo lokal tanpa Supabase (`lib/demo/seed.ts`) memakai dataset yang sama.

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
- Ganti toggle 2 state di topbar dengan menu 3 opsi: **Terang**, **Gelap**, **Sistem** (ikon matahari/bulan/monitor); juga tersedia di Pengaturan → Profil.
- Simpan per user di `profiles.theme` (`light` | `dark` | `system`, default `system`) dan terapkan setelah login. Halaman login/register mengikuti tema sistem.
- Cek kontras semua komponen (kanban, chart Recharts, dialog, tabel, badge DEMO) di kedua mode pada 1280px dan 1920px.
