require('dotenv').config()

const express = require('express')
const axios = require('axios')
const cors = require('cors')
const pool = require('./db')
const multer = require('multer')
const FormData = require('form-data')
const upload = multer({ storage: multer.memoryStorage() })

const app = express()
app.use(cors())
app.use(express.json())

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000'

app.get('/api/lokasi', async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/lokasi`)
    res.json(data)
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Gagal mengambil data lokasi' })
  }
})

app.post('/api/predict/harga', async (req, res) => {
  try {
    const { periode_ke_depan = 2 } = req.body
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict/harga`, { periode_ke_depan })

    await pool.query(
      'INSERT INTO riwayat_prediksi (komoditas, periode_ke_depan, hasil_json) VALUES (?, ?, ?)',
      ['cabai_rawit_merah', periode_ke_depan, JSON.stringify(data)]
    )

    res.json(data)
  } catch (err) {
    console.error(err.message)
    const status = err.response?.status || 500
    const detail = err.response?.data?.detail || 'Gagal memproses prediksi'
    res.status(status).json({ error: detail })
  }
})

app.post('/api/optimize/rute', async (req, res) => {
  try {
    const { demand, kapasitas_truk = 1200, jumlah_truk = 3 } = req.body
    const { data } = await axios.post(`${AI_SERVICE_URL}/optimize/rute`, {
      demand, kapasitas_truk, jumlah_truk,
    })

    await pool.query(
      'INSERT INTO riwayat_rute (jumlah_truk, kapasitas_truk, hasil_json) VALUES (?, ?, ?)',
      [jumlah_truk, kapasitas_truk, JSON.stringify(data)]
    )

    res.json(data)
  } catch (err) {
    console.error(err.message)
    const status = err.response?.status || 500
    const detail = err.response?.data?.detail || 'Gagal memproses rute'
    res.status(status).json({ error: detail })
  }
})

app.get('/api/riwayat', async (req, res) => {
  try {
    const [prediksi] = await pool.query('SELECT * FROM riwayat_prediksi ORDER BY created_at DESC LIMIT 10')
    const [rute] = await pool.query('SELECT * FROM riwayat_rute ORDER BY created_at DESC LIMIT 10')
    res.json({ prediksi, rute })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Gagal mengambil riwayat' })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah asisten AI untuk sistem Smart Logistics pertanian di Sulawesi Selatan. Bantu jawab pertanyaan seputar prediksi harga cabai rawit dan optimasi rute distribusi hasil tani secara singkat dan jelas dalam Bahasa Indonesia.',
          },
          { role: 'user', content: message },
        ],
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
    )
    res.json({ reply: data.choices[0].message.content })
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: 'Gagal memproses chat' })
  }
})
app.post('/api/predict/penyakit', upload.single('file'), async (req, res) => {
  try {
    const formData = new FormData()
    formData.append('file', req.file.buffer, req.file.originalname)

    const { data } = await axios.post(`${AI_SERVICE_URL}/predict/penyakit`, formData, {
      headers: formData.getHeaders(),
    })

    res.json(data)
  } catch (err) {
    console.error(err.message)
    const status = err.response?.status || 500
    const detail = err.response?.data?.detail || 'Gagal memproses deteksi penyakit'
    res.status(status).json({ error: detail })
  }
})

app.listen(5000, () => console.log('Backend Node.js jalan di port 5000'))
