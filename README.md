# Airtek CRM

CRM web untuk PT. Airtek Solusi Nusantara — multi-pipeline, kanban, forecast, kontak, aktivitas, laporan.
Produksi: **https://airtek.my.id** · Stack: Next.js 15, Supabase (Postgres + Auth), Vercel.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

- **Tanpa `.env.local`** → mode demo lokal: data contoh di `.data/crm.json`, kata sandi `airtek123`
  (`admin.demo@airtek.my.id`, `sales1.demo@airtek.my.id`, `direksi.demo@airtek.my.id`). Hanya untuk development.
- **Dengan Supabase lokal** (butuh Docker): `npx supabase start`, lalu salin URL + publishable/secret key yang
  ditampilkan ke `.env.local` (lihat `.env.example`). Migration di `supabase/migrations` diterapkan otomatis.

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
