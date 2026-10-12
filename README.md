# Airtek CRM

CRM web untuk PT. Airtek Solusi Nusantara — multi-pipeline, kanban, forecast, kontak, aktivitas, laporan.
Produksi: **https://airtek.my.id** · Stack: Next.js 15, Supabase (Postgres + Auth), Vercel.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

- **Tanpa `.env.local`** → mode demo: data contoh di `.data/crm.json`, akun demo kata sandi `airtek123`
  (`adi@airtek.co.id` owner, `budi@airtek.co.id` manager, `sari@airtek.co.id` sales, `rina@airtek.co.id` viewer).
- **Dengan Supabase lokal** (butuh Docker): `npx supabase start`, lalu salin URL + publishable/secret key yang
  ditampilkan ke `.env.local` (lihat `.env.example`). Migration di `supabase/migrations` diterapkan otomatis.

## Deploy (GitHub → Vercel + Supabase)

1. **Supabase**: buat project (region Singapore). Di SQL Editor jalankan berurutan
   `supabase/migrations/0001_init.sql` dan `0002_server_writes.sql`.
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

4. **Vercel → Settings → Domains** → tambah `airtek.my.id` dan `www.airtek.my.id`, lalu di DNS domain:
   `A  @  76.76.21.21` dan `CNAME  www  cname.vercel-dns.com` (pakai nilai yang ditampilkan Vercel).
5. Buka https://airtek.my.id/id/register → akun pertama otomatis membuat organisasi + pipeline default.
   Anggota lain diundang dari **Pengaturan → Anggota**.

Reset kata sandi via email butuh SMTP: Supabase → Authentication → SMTP Settings (mis. Resend).

## Cek kualitas

```bash
pnpm lint && pnpm typecheck && pnpm build
```

Panduan lengkap untuk AI agent / kontributor: [AGENTS.md](AGENTS.md).
