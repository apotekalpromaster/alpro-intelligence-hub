🏥 Alpro Intelligence Hub

Alpro Intelligence Hub adalah pusat kendali dan analitik data untuk memantau pergerakan pasar, strategi kompetitor, dan analisis ulasan pelanggan secara otomatis. Sistem ini dirancang untuk memberikan wawasan operasional (actionable insights) secara harian bagi manajemen apotek.

🌟 Fitur Utama

Daily Market & Strategic Radar: Skrip otomatis yang mengumpulkan dan menganalisis data pasar dan strategi terkini.

Review Analyzer: Sistem cerdas untuk mengevaluasi ulasan pelanggan dan sentimen pasar.

Automated Email Reports: Laporan intelijen harian yang dikirim langsung ke email (mailer).

Interactive Dashboard: Antarmuka pengguna (frontend) yang responsif untuk memvisualisasikan data dan metrik operasional.

Automated Workflows: Menjalankan radar analisis secara otomatis setiap hari menggunakan GitHub Actions.

💻 Teknologi yang Digunakan

Frontend: React.js, Vite, Tailwind CSS

Backend/Skrip: Node.js

Database: Supabase (PostgreSQL)

Otomatisasi: GitHub Actions (CI/CD)

📂 Struktur Repositori

Berikut adalah peta direktori utama dalam proyek ini:

alpro-intelligence-hub/

├── .github/workflows/    # Pengaturan otomatisasi harian (Radar Pasar & Strategi)

├── database/             # Skema SQL untuk tabel Supabase (reviews, schema, dsb)

├── frontend/             # Aplikasi web React/Vite (Dashboard Antarmuka)

├── mailer.js             # Skrip pengirim email laporan otomatis

├── market-radar.js       # Mesin utama untuk analitik pasar

├── review-analyzer.js    # Mesin analisis ulasan pelanggan

├── seed-data.js          # Skrip untuk mengisi data awal ke database

├── test-connection.js    # Utilitas untuk mengecek koneksi database


└── package.json          # Konfigurasi dependensi Node.js (Backend)

🚀 Panduan Instalasi (Setup Guide)

Ikuti langkah-langkah berikut untuk menjalankan proyek ini secara lokal:

1. Clone Repositori

git clone https://github.com/username/alpro-intelligence-hub.git

cd alpro-intelligence-hub

2. Instalasi Dependensi Backend (Skrip Utama)

npm install

3. Instalasi Dependensi Frontend (Dashboard)

cd frontend

npm install

cd ..

⚙️ Konfigurasi Environment (Variabel Lingkungan)

Kamu perlu menyiapkan file konfigurasi agar aplikasi bisa terhubung ke database dan layanan lainnya.

Buat file .env di root folder (dan di dalam folder frontend/).

Masukkan credentials berikut (pastikan file ini masuk ke dalam .gitignore agar aman):

# Contoh isi .env

SUPABASE_URL=your_supabase_project_url

SUPABASE_ANON_KEY=your_supabase_anon_key

EMAIL_USER=your_email@domain.com

EMAIL_PASS=your_email_password

🏃‍♂️ Cara Menjalankan Aplikasi

Menjalankan Frontend (Dashboard Interaktif):

cd frontend

npm run dev

Dashboard akan dapat diakses melalui http://localhost:5173.

Menjalankan Skrip Analitik (Manual):

Kamu bisa menjalankan skrip secara manual melalui terminal untuk pengujian:

Cek koneksi database: node test-connection.js

Jalankan radar pasar: node market-radar.js

Kirim laporan email: node mailer.js

🔄 Otomatisasi (Automated Workflows)

Proyek ini sudah terintegrasi dengan GitHub Actions. Skrip analisis (seperti daily-market-radar.yml dan daily-strategic-radar.yml) diatur untuk berjalan secara otomatis sesuai jadwal (CRON job) tanpa perlu dijalankan manual setiap hari.
