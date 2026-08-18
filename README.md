# SOH Command Center

Aplikasi monitoring stok Consignment berbasis React dengan Google Apps Script + Google Sheets sebagai database. Frontend memakai hosting statis dan proxy serverless sehingga URL GAS serta API secret tidak dikirim ke browser.

## Link demo

- GitHub Pages: `https://rickopra.github.io/soh-consignment-app/`
- Demo memakai seed data Excel dan `localStorage` browser. Data demo tidak menjadi database bersama.

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
Custom domain atau subdomain Netlify
        -> Netlify Function `/api/*`
        -> Google Apps Script Web App
        -> Google Sheets
```

1. Deploy isi `gas/Code.gs` dan `gas/appsscript.json` ke project Apps Script.
2. Jalankan `setupDatabase()` satu kali dari editor Apps Script. Fungsi ini membuat Google Sheet database jika belum ada, membuat tab operasional, membuat `API_SECRET`, dan menanam seed data awal.
3. Deploy Apps Script sebagai Web app. Gunakan `Execute as: Me`; akses publik mengikuti kebijakan Google Workspace.
4. Import repository ini ke Netlify dengan build command `npm run build` dan publish directory `dist`.
5. Tambahkan environment variables Netlify:
   - `GAS_WEB_APP_URL`
   - `GAS_API_SECRET`
6. Redeploy setelah environment variables tersimpan.

Netlify memberikan subdomain gratis `*.netlify.app`. Jika memiliki domain sendiri, domain tersebut dapat diarahkan ke Netlify. GitHub Pages tetap dipakai sebagai demo statis.

## Data dan aturan

- `MASTER_PART`: master part, MIN/MAX, lokasi, dan stok awal.
- `OUTBOUND`: Qty Request, Qty Supply, requester, dan dokumen transaksi.
- `INBOUND`: Qty Matdoc, Qty Actual, dan status GR.
- `STOCK_ADJUSTMENT`: koreksi stock opname atau selisih fisik.
- Inbound hanya menambah stok saat `Done GR`.
- SOH Available menggunakan Qty Request untuk membaca kebutuhan readiness lebih awal.
- Outstanding = `max(0, Qty Request - Qty Supply)`.
- Refill = `max(0, MAX - SOH Available)` saat stok di bawah MIN.

Detail skema ada di `docs/google-sheets-schema.md`.

## Keamanan

Jangan commit `API_SECRET`, `.clasp.json`, atau file environment production. Browser hanya mengakses endpoint `/api/*`; secret disimpan di environment variable Netlify dan Script Properties Apps Script.
