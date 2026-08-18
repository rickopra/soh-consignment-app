# Google Sheets schema

## Setup database

1. Buka project Apps Script yang akan dipakai sebagai backend.
2. Salin isi gas/Code.gs dan konfigurasi gas/appsscript.json ke project tersebut.
3. Jalankan setupDatabase() satu kali dari editor Apps Script.
4. Simpan piSecret dari hasil fungsi ke tempat aman. Jangan commit secret ke GitHub.
5. Deploy project sebagai Web app dengan Execute as: Me. Pilihan akses publik mengikuti kebijakan akun Google Workspace.

setupDatabase() akan:

- memakai spreadsheet yang sudah ada jika SPREADSHEET_ID sudah tersedia;
- membuat spreadsheet baru bernama SOH Command Center DB jika belum ada;
- membuat Script Properties SPREADSHEET_ID dan API_SECRET;
- membuat empat tab operasional;
- mengisi seed awal 33 master part dan 9 transaksi outbound jika tab masih kosong.

## Sheet yang dibuat

| Sheet | Kegunaan |
| --- | --- |
| MASTER_PART | Master part, lokasi, warehouse type, MIN/MAX, dan stok awal |
| OUTBOUND | Request dan supply part keluar |
| INBOUND | Qty Matdoc, Qty Actual, dan status GR |
| STOCK_ADJUSTMENT | Koreksi setelah stock opname atau investigasi selisih |

## Netlify proxy

Tambahkan environment variables berikut di Netlify:

- GAS_WEB_APP_URL: URL deployment Apps Script yang berakhiran /exec.
- GAS_API_SECRET: nilai API_SECRET dari Script Properties Apps Script.

Netlify Function meneruskan request server-to-server. Browser tidak menerima URL GAS atau secret secara langsung.

## Seed data

Seed data juga tersedia dalam bentuk CSV:

- docs/seed/master_part_seed.csv
- docs/seed/outbound_seed.csv

## Aturan kalkulasi

- Inbound Posted: hanya Qty Matdoc dengan status Done GR.
- SOH Fisik: stok awal + Inbound Posted - Qty Supply + adjustment variance.
- SOH Available: stok awal + Inbound Posted - Qty Request + adjustment variance.
- Outstanding: max(0, Qty Request - Qty Supply).
- READY: SOH Available >= MIN.
- NOT READY: SOH Available < MIN.
- Refill: max(0, MAX - SOH Available) jika status NOT READY.

SOH Fisik dan SOH Available dipisah karena Qty Request dapat mengurangi stok available sebelum Qty Supply selesai.
