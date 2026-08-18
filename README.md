# SOH Command Center

Aplikasi monitoring stok Consignment berbasis React dengan Google Apps Script + Google Sheets sebagai database. Frontend memakai hosting statis; production dapat memakai bridge GAS langsung atau proxy serverless Netlify.

## Link demo

- GitHub Pages: `https://rickopra.github.io/soh-consignment-app/`
- Deployment GitHub Pages memakai login GAS dan database Google Sheets bersama. Build tanpa environment variable tetap tersedia sebagai mode demo lokal.

## Jalankan lokal

```bash
npm install
npm run dev
```

Tanpa environment variable, aplikasi berjalan dalam mode demo.

## Validasi

```bash
npm run build
npm run build:demo
npm run lint
npx tsc -p tsconfig.functions.json
```

## Mode production

Arsitektur production:

```text
GitHub Pages atau custom domain
        -> GAS Bridge melalui iframe postMessage
        -> Google Apps Script Web App
        -> Google Sheets

Alternatif proxy:
Custom domain atau subdomain Netlify
        -> Netlify Function `/api/*`
        -> Google Apps Script Web App
        -> Google Sheets
```

1. Deploy seluruh isi folder `gas/` ke project Apps Script.
2. Jalankan `setupDatabase()` satu kali. Fungsi ini membuat database, tab operasional, tab autentikasi, `API_SECRET`, dan seed awal.
3. Jalankan `provisionInitialAdmin()` satu kali. Simpan hasil credential sementara secara privat.
4. Deploy sebagai Web app dengan `Execute as: Me` dan akses anonymous.
5. Atur `ALLOWED_ORIGINS` melalui `configureAllowedOrigins([...])` jika memakai domain selain default.
6. Untuk GitHub Pages, isi repository variable `GAS_BRIDGE_URL` dengan URL Web App yang berakhiran `/exec`, lalu push ke branch `main`.
7. Untuk Netlify, import repository dengan build command `npm run build` dan publish directory `dist`, lalu tambahkan:
   - `GAS_WEB_APP_URL`
   - `GAS_API_SECRET`
8. Redeploy setelah environment variables tersimpan.

GitHub Pages gratis memakai URL project `rickopra.github.io/soh-consignment-app/`. Custom domain tidak dapat dibuat tanpa domain yang dimiliki. Netlify memberikan subdomain gratis `*.netlify.app` jika opsi proxy dipakai.

## Data dan aturan

- `MASTER_PART`: master part, MIN/MAX, lokasi, dan stok awal.
- `OUTBOUND`: Qty Request, Qty Supply, requester, dan dokumen transaksi.
- `INBOUND`: Qty Matdoc, Qty Actual, dan status GR.
- `STOCK_ADJUSTMENT`: koreksi stock opname atau selisih fisik.
- `USERS`, `AUTH_SESSIONS`, `AUTH_AUDIT`: akun, session, dan audit autentikasi.
- Inbound hanya menambah stok saat `Done GR`.
- SOH Available menggunakan Qty Request untuk membaca kebutuhan readiness lebih awal.
- Outstanding = `max(0, Qty Request - Qty Supply)`.
- Refill = `max(0, MAX - SOH Available)` saat stok di bawah MIN.

Detail skema ada di `docs/google-sheets-schema.md`.

## Branding

Source logo disimpan di `media/`. Jalankan `npm run assets:brand` setelah mengganti source untuk membuat favicon, logo UI, icon manifest, dan social card teroptimasi di `public/brand/`.
## Keamanan

Jangan commit `API_SECRET`, `.clasp.json`, file environment production, atau credential administrator sementara. Browser memakai bridge nonce atau endpoint proxy; API secret tetap di Script Properties Apps Script dan environment variable Netlify.
