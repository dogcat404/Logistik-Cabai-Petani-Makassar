<<<<<<< HEAD
```markdown
# Smart Logistics AI — Tim SANNIN (AIC COMPFEST 18)

Sistem prediksi harga komoditas, deteksi penyakit daun cabai, dan
optimasi rute distribusi pertanian di Sulawesi Selatan, berbasis AI.
Dikembangkan untuk kompetisi AI Innovation Challenge (AIC) —
COMPFEST 18, kategori Smart Logistics.

## Arsitektur

```
React (frontend, port 3001)
        |
Node.js / Express (backend, port 5000) --- MySQL (port 3307)
        |
Python / FastAPI (ai-service, port 8000) --- Groq API, OSRM
```

Backend Node.js menangani request dari frontend dan mencatat riwayat
ke MySQL, lalu meneruskan proses AI (prediksi harga, deteksi penyakit,
dan optimasi rute) ke ai-service Python.

## Cara Menjalankan

1. Pastikan Docker & Docker Compose sudah terinstall.
2. **PENTING**: sebelum menjalankan, salin file model hasil training ke
   folder `ai-service/models/`:
   - `model_harga.pkl` (model prediksi harga)
   - `saved_model/` (folder model deteksi penyakit daun)
   - `class_indices.json` (mapping kelas deteksi penyakit)

   File `data_vrp.json` sudah disediakan dengan data 6 lokasi di
   Sulawesi Selatan.
3. Buat file `backend/.env` berisi API key Groq:
   ```
   GROQ_API_KEY=isi_api_key_anda
   ```
4. Dari folder root project, jalankan:
   ```bash
   docker compose up --build
   ```
5. Buka `http://localhost:3001` untuk tampilan web.
6. API backend tersedia di `http://localhost:5000`.
7. AI service (opsional, untuk cek langsung) di `http://localhost:8000/docs`.

## Endpoint API (lewat backend Node.js)

- `POST /api/predict/harga` — body: `{ "periode_ke_depan": 2 }`
  → prediksi harga komoditas N bulan ke depan
- `POST /api/predict/penyakit` — body: form-data dengan field `file` (foto daun)
  → deteksi kondisi/penyakit daun cabai
- `POST /api/optimize/rute` — body: `{ "demand": [0,600,450,800,350,500], "kapasitas_truk": 1200, "jumlah_truk": 3 }`
  → hitung rute distribusi optimal
- `POST /api/chat` — body: `{ "message": "..." }`
  → tanya jawab dengan asisten AI

## Model AI

- **Prediksi harga**: Prophet (time-series forecasting), dilatih dari data
  Rata-rata Harga Pangan Bulanan Tingkat Produsen — Badan Pangan Nasional
  (2023–2026), komoditas cabai rawit merah tingkat petani, Sulawesi Selatan.
- **Deteksi penyakit daun**: CNN dengan transfer learning, mengklasifikasi
  6 kondisi daun cabai (Healthy Leaf, Bacterial Spot, Cercospora Leaf Spot,
  Curl Virus, Nutrition Deficiency, White Spot).
- **Optimasi rute**: Google OR-Tools (Vehicle Routing Problem dengan
  batasan kapasitas), jarak & waktu tempuh dihitung dari OSRM berdasarkan
  koordinat riil 6 lokasi di Sulawesi Selatan (1 gudang distribusi + 5
  sentra pertanian).
- **Asisten AI**: Large language model via Groq API, menjawab pertanyaan
  seputar hasil prediksi dan cara kerja sistem.

## Struktur Data

Data lokasi & matrix jarak (`ai-service/models/data_vrp.json`) mencakup:
- Gudang Distribusi Makassar (depot)
- Sentra Tani Gowa, Maros, Jeneponto, Bantaeng, Takalar

Koordinat bersifat riil (dapat diverifikasi di peta), sedangkan nilai
demand/volume panen bersifat simulasi karena data volume transaksi
logistik pertanian per lokasi tidak tersedia secara publik.

## Tim

Tim SANNIN
```
=======
# Logistik-Cabai-Petani-Makassar
AI-powered chili logistics project to support distribution planning, route optimization, and data-driven decision-making for farmers in Makassar, Indonesia.
>>>>>>> 84edfb19b3e11aaa951f5b4b48d93a4e880dbfba
