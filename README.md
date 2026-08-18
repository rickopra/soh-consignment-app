# SOH Command Center

Akses kontrol stok Consignment berbasis React + Netlify + Google Apps Script + Google Sheets.

## Status

- Frontend polished dengan responsive layout, dark mode, keyboard focus state, skip link, semantic tables, modal custom, toast, dan reduced-motion support.
- Mode demo menggunakan data dari workbook `DAILY MONITORING SOH CONSIGMENT.xlsx` dan disimpan ke `localStorage`.
- Mode production menggunakan Netlify Function sebagai proxy ke GAS. Browser tidak pernah memanggil URL GAS secara langsung.

## Jalankan lokal

```bash
npm install
npm run dev
```

Tanpa environment variable, aplikasi berjalan dalam mode demo lokal.

## Validasi

```bash
npm run build
npm run build:demo
npm run lint
```

## Deploy gratis dengan custom subdomain

1. Push folder `soh-consignment-app` ke repository GitHub.
2. Buat akun Netlify menggunakan GitHub.
3. Pilih `Add new project` > `Import an existing project` > GitHub.
4. Build command: `npm run build`.
5. Publish directory: `dist`.
6. Netlify membaca `netlify.toml` dan otomatis memakai `netlify/functions/api.ts`.
7. Tambahkan environment variables di Netlify:
   - `GAS_WEB_APP_URL`
   - `GAS_API_SECRET`
8. Deploy ulang.
9. Gunakan subdomain gratis seperti `soh-command-center.netlify.app`, atau tambahkan custom domain sendiri dari menu Domain management.

Paket Netlify Free sudah cukup untuk prototype dan aplikasi internal dengan trafik rendah.

## Google Sheets dan GAS

Ikuti `docs/google-sheets-schema.md`. Source Apps Script ada di `gas/Code.gs`.

Data operasional tidak disimpan di repository GitHub.
