# 🏥 Alpro Intelligence Hub 🎯

Alpro Intelligence Hub adalah pusat kendali dan analitik data untuk memantau pergerakan pasar, strategi kompetitor, dan analisis ulasan pelanggan secara otomatis. Sistem ini dirancang untuk memberikan wawasan operasional (actionable insights) secara harian bagi manajemen Apotek Alpro Indonesia (Dept. OASIS).

## 🌟 Fitur Utama

### 1. Market Radar & Smart Alerts
Alpro Intelligence Hub secara otomatis memantau berbagai sumber berita dan regulasi setiap hari, termasuk:
- **BPOM** (Siaran Pers & Penjelasan Publik)
- **Kemenkes** (Rilis Berita & Info Krisis)
- **Kompetitor** (Apotek K-24, Kimia Farma, Guardian, Watson, Roxy)

Semua berita yang masuk disaring dan dianalisis menggunakan **Groq AI (Llama 3.3 70B)** untuk menentukan:
- Kategori isu (Regular, Public Health, Product Safety, Competitor Move).
- Skor Dampak (Impact Score: 0-10).
- Rekomendasi/Tindakan strategis.

**Email Alert**: Jika ditemukan berita strategis dengan Skor Dampak Tinggi (>7), sistem akan otomatis mengirimkan email peringatan ke `hendri@apotekalpro.id`.

### 2. Customer Pulse
Dashboard menganalisis ulasan pelanggan secara real-time untuk memecah sentimen menjadi tiga kategori utama:
- 🟢 **Positif**: Pujian terhadap layanan atau kelengkapan stok.
- 🔴 **Isu Stok**: Keluhan pelanggan mengenai obat/produk yang kosong.
- 🟠 **Isu Layanan**: Keluhan pelayanan, antrean panjang, atau masalah staf ringan.

*(Catatan: Anda dapat mengklik baris sentimen di dashboard untuk membuka rincian teks ulasan, serta mengklik teksnya langsung untuk membuka tautan sumber ulasan aslinya)*.

### 3. Interactive Dashboard
Antarmuka pengguna (frontend) yang responsif untuk memvisualisasikan data dan metrik operasional secara bersih dan cepat.

## 🛠️ Arsitektur & Teknologi

Aplikasi ini dibagi menjadi dua bagian pekerjaan yang saling melengkapi:

1. **Backend / ETL (Extract, Transform, Load)**
   Script Node.js (`market-radar.js` dan `review-analyzer.js`) bertugas menarik raw data dari internet/tabel mentah, mengirimkannya ke Groq AI untuk dianalisis, lalu menyimpan hasil bersihnya ke Supabase dan mengirim Email (Nodemailer).
   *Proses ini berjalan otomatis pada 08:00 WIB melalui **GitHub Actions**.*

2. **Frontend (Dashboard UI)**
   Aplikasi React + Vite yang di-*host* di Vercel. Bertugas semata-mata membaca data matang dari Supabase untuk menampilkannya ke pengguna. Tailwind CSS digunakan untuk styling.

**Database**: Supabase (PostgreSQL)

## 📂 Struktur Repositori

Berikut adalah peta direktori utama dalam proyek ini:

```bash
alpro-intelligence-hub/
├── .github/workflows/    # Pengaturan otomatisasi harian (Radar Pasar & Strategi)
├── database/             # Skema SQL untuk tabel Supabase (reviews, schema, dsb)
├── frontend/             # Aplikasi web React/Vite (Dashboard Antarmuka)
├── mailer.js             # Skrip pengirim email laporan otomatis
├── market-radar.js       # Mesin utama untuk analitik pasar
├── review-analyzer.js    # Mesin analisis ulasan pelanggan
├── test-connection.js    # Utilitas untuk mengecek koneksi database
└── package.json          # Konfigurasi dependensi Node.js (Backend)
```

## ⚙️ Panduan Konfigurasi (User Manual)

### 1. Hosting Vercel (Tampilan Frontend)
Setiap kali Anda mengubah tampilan (file di dalam folder `frontend/`), dan melakukan *push* (unggah) ke GitHub, Vercel akan otomatis memperbarui tampilan webnya di [alpro-intelligence-hub.vercel.app](https://alpro-intelligence-hub.vercel.app/).

Agar Vercel bisa mengakses data, pastikan Anda telah memasang Variable ini pada opsi `Settings > Environment Variables` di Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 2. Memastikan Update Harian / Email (GitHub Actions)
Agar robot di GitHub bisa berjalan mengambil data setiap pagi, menganalisisnya menggunakan AI, dan mengirim email ke Anda, periksa pengaturan rahasia di repositori GitHub Anda (**Settings > Secrets and variables > Actions > Repository secrets**).

Pastikan hal-hal berikut telah diisi:
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` (Untuk akses penulisan database).
- `GROQ_API_KEY` (Sangat krusial untuk kecerdasan analisis AI!).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` (Kredensial email Anda untuk mengirim log notifikasi/alerts).

### 3. Mengoperasikan Lokakarya Ulasan (Customer Reviews)
Saat ini sistem di-*setup* untuk membaca ulasan baru dari tabel `raw_reviews` (jika Anda membuatnya) atau integrasi lainnya, lalu skrip `review-analyzer.js` akan menganalisisnya menggunakan AI dan memasukkannya ke tabel akhir `review_sentiments`.

Anda bebas menyambungkan "kran air" apa pun (misal form google, import CSV bulanan, atau bot Google Maps) ke database mentah Anda. Intelligence Hub akan memprosesnya otomatis di gelombang pemindaian berikutnya!

## 🚀 Panduan Instalasi Lokal (Setup Guide)

Ikuti langkah-langkah berikut untuk menjalankan proyek ini secara lokal:

1. Clone Repositori
```bash
git clone https://github.com/apotekalpromaster/alpro-intelligence-hub.git
cd alpro-intelligence-hub
```

2. Instalasi Dependensi Backend (Skrip Utama)
```bash
npm install
```

3. Instalasi Dependensi Frontend (Dashboard)
```bash
cd frontend
npm install
cd ..
```

4. Konfigurasi Environment (Variabel Lingkungan)
Buat file `.env` di root folder dan di dalam folder `frontend/`.
```bash
# Root .env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
SMTP_SECURE=false

# frontend/.env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Cara Menjalankan Aplikasi
Menjalankan Frontend (Dashboard Interaktif):
```bash
cd frontend
npm run dev
```
*(Dashboard akan dapat diakses melalui http://localhost:5173)*

Menjalankan Skrip Analitik (Manual):
```bash
node market-radar.js
node review-analyzer.js
```

---
*(c) 2026 Developed for Apotek Alpro Indonesia, Dept. OASIS.*
