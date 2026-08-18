# Google Sheets schema

## 1. Buat database

Buat satu Google Sheet khusus aplikasi, idealnya di akun perusahaan atau Shared Drive.

Buka Extensions > Apps Script, salin isi `gas/Code.gs`, lalu jalankan `setupDatabase()` satu kali dari editor Apps Script.

Buat Script Properties berikut:

- `SPREADSHEET_ID`: otomatis diisi oleh `setupDatabase()`.
- `API_SECRET`: buat secret acak yang hanya disimpan di Script Properties dan Cloudflare Pages secret.

Contoh secret bisa dibuat dengan password manager. Jangan commit secret ke GitHub.

## 2. Sheet yang dibuat

| Sheet | Kegunaan |
| --- | --- |
| `MASTER_PART` | Master part, lokasi, warehouse type, MIN/MAX, dan stok awal |
| `OUTBOUND` | Request dan supply part keluar |
| `INBOUND` | Qty Matdoc, Qty Actual, dan status GR |
| `STOCK_ADJUSTMENT` | Koreksi setelah stock opname atau investigasi selisih |

Header dibuat otomatis oleh `setupDatabase()`.

## 3. Seed data

Import data awal dari:

- `docs/seed/master_part_seed.csv`
- `docs/seed/outbound_seed.csv`

Untuk tahap pertama, semua seed menggunakan warehouse type `Consignment` dan site `Jambi/Mendalo` sesuai workbook existing.

## 4. Deploy Apps Script

1. Deploy > New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: sesuai kebijakan akun perusahaan. Untuk proxy server, endpoint perlu dapat dipanggil oleh Cloudflare Pages Function.
5. Salin URL deployment ke secret Cloudflare `GAS_WEB_APP_URL`.
6. Isi secret yang sama dengan Script Property `API_SECRET` ke Cloudflare `GAS_API_SECRET`.

Pages Function menambahkan secret ke request server-to-server. Browser hanya memanggil `/api/*` dari custom domain aplikasi.

## 5. Aturan kalkulasi

- `Inbound Posted`: hanya `Qty Matdoc` dengan status `Done GR`.
- `SOH Fisik`: stok awal + Inbound Posted - Qty Supply + adjustment variance.
- `SOH Available`: stok awal + Inbound Posted - Qty Request + adjustment variance.
- `Outstanding`: `max(0, Qty Request - Qty Supply)`.
- `READY`: SOH Available >= MIN.
- `NOT READY`: SOH Available < MIN.
- `Refill`: `max(0, MAX - SOH Available)` jika status `NOT READY`.

SOH Fisik dan SOH Available sengaja dipisah karena user menjelaskan Qty Request mengurangi stok available sebelum Qty Supply selesai.
