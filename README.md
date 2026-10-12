# Airtek CRM

CRM web untuk PT. Airtek Solusi Nusantara — multi-pipeline, kanban, forecast, kontak, aktivitas, laporan.
Produksi: **https://airtek.my.id** · Stack: Next.js 15, Supabase (Postgres + Auth), Vercel.

## Jalankan lokal (database lokal di Docker)

Butuh Docker Desktop yang sedang berjalan.

```bash
pnpm install
pnpm db:start
```

`db:start` menyalakan Supabase lokal (Postgres, Auth, Storage, Realtime, Studio, Mailpit) dan menerapkan semua
`supabase/migrations`. Salin **API URL**, **Publishable key**, dan **Secret key** yang tampil ke `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<secret key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BOOTSTRAP_ADMIN_EMAIL=boss@airtek.test
DEV_TEST_PASSWORD=
```

```bash
pnpm dev:seed
pnpm dev
```

`dev:seed` membuat organisasi **PT. Airtek Solusi Nusantara (DEV)** berisi data contoh dan 4 akun (kata sandi
`DEV_TEST_PASSWORD`, default `airtek-dev-123`): `boss@airtek.test` (Boss), `admin@airtek.test` (Administrator),
`sales1@airtek.test`, `sales2@airtek.test` (Sales). Di halaman login muncul tombol **Masuk cepat (dev)**.
Script menolak berjalan jika URL Supabase bukan localhost.

| Alat lokal | Alamat |
|---|---|
| Aplikasi | http://localhost:3000 |
| Supabase Studio (lihat isi tabel) | http://127.0.0.1:55423 |
| Mailpit (email undangan/konfirmasi) | http://127.0.0.1:55424 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:55422/postgres` |

`pnpm db:stop` mematikan, `pnpm db:reset` mengulang database dari migration (lalu jalankan `pnpm dev:seed` lagi).
Tanpa `.env.local` aplikasi jalan di mode demo (file JSON, kata sandi `airtek123`).

## Deploy (GitHub → Vercel + Supabase)

1. **Supabase**: buat project (region Singapore). Di SQL Editor jalankan berurutan
   semua file di `supabase/migrations/` (0001, 0002, 0003, …).
2. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://airtek.my.id`
   - Redirect URLs: `https://airtek.my.id/auth/callback`, `https://*.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
3. **Vercel → Add New Project** → import `wahyu-setiawan99/airtek-crm` → Environment Variables:

   | Nama | Nilai |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (rahasia) |
   | `NEXT_PUBLIC_SITE_URL` | `https://airtek.my.id` |
   | `BOOTSTRAP_ADMIN_EMAIL` | email owner (satu-satunya yang boleh daftar sendiri) |

4. **Vercel → Settings → Domains** → `airtek.my.id` (utama) dan `www.airtek.my.id` (redirect 308 ke utama), lalu di DNS domain:
   `A  @  76.76.21.21` dan `CNAME  www  cname.vercel-dns.com` (pakai nilai yang ditampilkan Vercel).
5. Buka https://airtek.my.id/id/register dengan email `BOOTSTRAP_ADMIN_EMAIL` → konfirmasi email → organisasi + pipeline default
   dibuat dengan Anda sebagai owner. Akun lain (direksi, administrator, sales) diundang dari **Pengaturan → Anggota**
   dengan role yang dipilih; role bisa diubah kapan saja.

Email konfirmasi, undangan, dan reset kata sandi ke alamat selain anggota tim Supabase butuh SMTP sendiri:
Supabase → Authentication → SMTP Settings (mis. Resend dengan domain `airtek.my.id`).

## Cek kualitas

```bash
pnpm lint && pnpm typecheck && pnpm build
```

Panduan lengkap untuk AI agent / kontributor: [AGENTS.md](AGENTS.md).
