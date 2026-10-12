# Airtek CRM

CRM web untuk PT. Airtek Solusi Nusantara. Mode demo berjalan tanpa Supabase: data contoh disimpan di `.data/crm.json`.

```bash
pnpm install
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

Akun demo, kata sandi `airtek123`:

- `adi@airtek.co.id` — owner
- `sari@airtek.co.id` — sales
- `budi@airtek.co.id` — manager
- `rina@airtek.co.id` — viewer

Skema Postgres ada di `supabase/migrations`. Sambungkan proyek Supabase lewat `.env.local` (lihat `.env.example`), lalu `pnpm db:push`.
