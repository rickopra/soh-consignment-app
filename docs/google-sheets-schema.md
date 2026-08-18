# Google Sheets schema

## Setup database

1. Buka project Apps Script yang akan dipakai sebagai backend.
2. Salin isi `gas/Code.gs` dan konfigurasi `gas/appsscript.json` ke project tersebut.
3. Jalankan `setupDatabase()` satu kali dari editor Apps Script.
4. Simpan `apiSecret` dari hasil fungsi ke tempat aman. Jangan commit secret ke GitHub.
5. Jalankan `provisionInitialAdmin()` satu kali. Simpan username dan password sementara di password manager atau file lokal yang di-ignore. Password itu wajib diganti saat login pertama.
6. Deploy project sebagai Web app dengan `Execute as: Me` dan akses anonymous agar bridge dari hosting statis dapat dimuat.
7. Pastikan origin hosting sudah ada di `ALLOWED_ORIGINS`. Untuk GitHub Pages gunakan `https://rickopra.github.io`; untuk domain lain jalankan `configureAllowedOrigins([...])` dari editor Apps Script.

`setupDatabase()` akan:

- memakai spreadsheet yang sudah ada jika `SPREADSHEET_ID` sudah tersedia;
- membuat spreadsheet baru bernama `SOH Command Center DB` jika belum ada;
- membuat Script Properties `SPREADSHEET_ID` dan `API_SECRET`;
- membuat empat tab operasional dan tiga tab autentikasi;
- mengisi seed awal 33 master part dan 9 transaksi outbound jika tab masih kosong.

## Sheet yang dibuat

| Sheet | Kegunaan |
| --- | --- |
| `MASTER_PART` | Master part, lokasi, warehouse type, MIN/MAX, dan stok awal |
| `OUTBOUND` | Request dan supply part keluar |
| `INBOUND` | Qty Matdoc, Qty Actual, dan status GR |
| `STOCK_ADJUSTMENT` | Koreksi setelah stock opname atau investigasi selisih |
| `USERS` | Akun, role, hash password, status first-login, dan lockout |
| `AUTH_SESSIONS` | Hash token session, tujuan session, masa berlaku, revoke, dan client |
| `AUTH_AUDIT` | Catatan login, perubahan password, lockout, dan aksi administrator |

## Alur autentikasi

- `provisionInitialAdmin()` membuat username administrator acak dan password sementara tanpa credential hardcode.
- Login pertama hanya membuka halaman ganti password. Endpoint operasional tetap menolak session dengan `PASSWORD_CHANGE_REQUIRED`.
- Password disimpan sebagai HMAC-SHA-256 berulang dengan salt per pengguna dan pepper di Script Properties. Token session yang masuk ke browser tidak disimpan mentah di Sheet.
- Lima percobaan login gagal mengunci akun selama 15 menit. Administrator dapat membuka lock atau reset password dari menu `Administrasi`.
- Password reset dari administrator juga menghasilkan credential sementara satu kali dan mewajibkan first-login kembali.

## Hosting statis dan bridge

GitHub Pages memakai `VITE_GAS_BRIDGE_URL` sebagai URL Web App GAS. Frontend memuat bridge tersembunyi, lalu berkomunikasi melalui `postMessage` dengan nonce. API secret tetap berada di Script Properties dan tidak dikirim ke browser.

GitHub Pages gratis memakai URL project `rickopra.github.io/soh-consignment-app/`. Custom domain hanya dapat dipakai jika domain tersebut dimiliki dan diarahkan ke GitHub Pages. Netlify tetap tersedia sebagai opsi proxy serverless melalui environment variables di bawah.

## Netlify proxy

Tambahkan environment variables berikut di Netlify:

- `GAS_WEB_APP_URL`: URL deployment Apps Script yang berakhiran `/exec`.
- `GAS_API_SECRET`: nilai `API_SECRET` dari Script Properties Apps Script.

Netlify Function meneruskan request server-to-server. Browser tidak menerima URL GAS atau secret secara langsung.

## Seed data

Seed data juga tersedia dalam bentuk CSV:

- `docs/seed/master_part_seed.csv`
- `docs/seed/outbound_seed.csv`

## Aturan kalkulasi

- Inbound Posted: hanya `Qty Matdoc` dengan status `Done GR`.
- SOH Fisik: stok awal + Inbound Posted - Qty Supply + adjustment variance.
- SOH Available: stok awal + Inbound Posted - Qty Request + adjustment variance.
- Outstanding: `max(0, Qty Request - Qty Supply)`.
- `READY`: SOH Available >= MIN.
- `NOT READY`: SOH Available < MIN.
- Refill: `max(0, MAX - SOH Available)` jika status `NOT READY`.

SOH Fisik dan SOH Available dipisah karena Qty Request dapat mengurangi stok available sebelum Qty Supply selesai.
