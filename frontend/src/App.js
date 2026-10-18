import React, { useState, useEffect, useRef } from 'react'
import { TrendingUp, Truck, Bot, Sprout, MapPinned, Leaf, Upload } from 'lucide-react'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'

function PrediksiHarga() {
  const [periode, setPeriode] = useState(2)
  const [hasil, setHasil] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setHasil(null)
    try {
      const res = await fetch(`${API_URL}/api/predict/harga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periode_ke_depan: Number(periode) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memproses prediksi')
      setHasil(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">
        <span className="icon-box"><TrendingUp size={16} /></span>
        Prediksi Harga — Cabai Rawit Merah (Sulsel)
      </h2>
      <form onSubmit={handleSubmit} className="grid-2" style={{ alignItems: 'end' }}>
        <div className="field">
          <label>Berapa bulan setelah Januari 2026 (data terakhir)?</label>
          <input type="number" min="1" max="12" value={periode} onChange={(e) => setPeriode(e.target.value)} />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Memprediksi...' : 'Prediksi Harga'}</button>
      </form>

      {error && <div className="error">{error}</div>}

      {hasil && (
        <table>
          <thead>
            <tr><th>Periode</th><th>Prediksi (Rp)</th><th>Rentang Bawah</th><th>Rentang Atas</th></tr>
          </thead>
          <tbody>
            {hasil.map((row, i) => (
              <tr key={i}>
                <td>{row.ds}</td>
                <td>Rp {Math.round(row.yhat).toLocaleString('id-ID')}</td>
                <td>Rp {Math.round(row.yhat_lower).toLocaleString('id-ID')}</td>
                <td>Rp {Math.round(row.yhat_upper).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hasil && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
          *Prediksi dihitung dari data resmi terakhir yang tersedia publik (Badan Pangan Nasional, Januari 2026).
        </p>
      )}
    </div>
  )
}


function PetaRute({ lokasi, hasil }) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)

  useEffect(() => {
    if (!window.L || lokasi.length === 0 || !mapRef.current) return

    if (!leafletMapRef.current) {
      const newMap = window.L.map(mapRef.current, {
        zoomControl: true,
      }).setView([-5.25, 119.6], 9)

      window.L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }
      ).addTo(newMap)

      leafletMapRef.current = newMap
    }

    const currentMap = leafletMapRef.current

    currentMap.eachLayer((layer) => {
      if (
        layer instanceof window.L.Marker ||
        layer instanceof window.L.Polyline
      ) {
        currentMap.removeLayer(layer)
      }
    })

    lokasi.forEach((loc, i) => {
      const icon = window.L.divIcon({
        className: '',
        html: `<div class="${i === 0 ? 'beacon-depot' : 'beacon-farm'}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      window.L.marker([loc.lat, loc.lon], { icon })
        .addTo(currentMap)
        .bindPopup(loc.nama)
    })

    if (hasil) {
      const warna = ['#d8432a', '#7cb668', '#4f8fbf', '#e3a73e']

      hasil.forEach((truk, i) => {
        const koordinat = truk.rute
          .map((nama) => {
            const loc = lokasi.find((l) => l.nama === nama)
            return loc ? [loc.lat, loc.lon] : null
          })
          .filter(Boolean)

        if (koordinat.length > 1) {
          window.L.polyline(koordinat, {
            color: warna[i % warna.length],
            weight: 4,
            className: 'route-line',
          }).addTo(currentMap)
        }
      })
    }

    currentMap.invalidateSize()
  }, [lokasi, hasil])

  return <div ref={mapRef} className="map-hero" />
}


function OptimasiRute() {
  const [lokasi, setLokasi] = useState([])
  const [demand, setDemand] = useState({})
  const [kapasitas, setKapasitas] = useState(1200)
  const [jumlahTruk, setJumlahTruk] = useState(3)
  const [hasil, setHasil] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
  let attempts = 0

  const ambilLokasi = () => {
    fetch(`${API_URL}/api/lokasi`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('belum siap')
        }
        setLokasi(data)
        const initialDemand = {}
        data.forEach((loc, i) => { initialDemand[i] = loc.demand })
        setDemand(initialDemand)
        setError('')
      })
      .catch(() => {
        attempts += 1
        if (attempts < 5) {
          setTimeout(ambilLokasi, 2000)
        } else {
          setError('Gagal memuat data lokasi. Pastikan backend & ai-service jalan.')
        }
      })
  }

  ambilLokasi()
}, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setHasil(null)
    try {
      const demandArray = lokasi.map((_, i) => Number(demand[i] || 0))
      const res = await fetch(`${API_URL}/api/optimize/rute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demand: demandArray,
          kapasitas_truk: Number(kapasitas),
          jumlah_truk: Number(jumlahTruk),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memproses rute')
      setHasil(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">
        <span className="icon-box"><Truck size={16} /></span>
        Optimasi Rute Distribusi — Sulsel
      </h2>

      <div className="rute-split">
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="field">
              <label>Kapasitas truk (kg)</label>
              <input type="number" value={kapasitas} onChange={(e) => setKapasitas(e.target.value)} />
            </div>
            <div className="field">
              <label>Jumlah truk</label>
              <input type="number" min="1" value={jumlahTruk} onChange={(e) => setJumlahTruk(e.target.value)} />
            </div>
          </div>

          {lokasi.map((loc, i) => (
            i > 0 ? (
              <div className="field" key={i}>
                <label>{loc.nama} (kg panen)</label>
                <input
                  type="number"
                  value={demand[i] ?? 0}
                  onChange={(e) => setDemand({ ...demand, [i]: e.target.value })}
                />
              </div>
            ) : null
          ))}

          <button type="submit" disabled={loading || lokasi.length === 0} style={{ width: '100%', marginTop: 6 }}>
            {loading ? 'Menghitung...' : 'Hitung Rute Optimal'}
          </button>

          {error && <div className="error">{error}</div>}
        </form>

        <PetaRute lokasi={lokasi} hasil={hasil} />
      </div>

      {hasil && (
        <div className="rute-hasil">
          {hasil.map((truk) => (
            <div className="rute-box" key={truk.truk}>
              <b>Truk {truk.truk}</b> · {truk.muatan_kg} kg
              <div className="rute-path">{truk.rute.join(' → ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Tanya apa aja soal prediksi harga cabai atau rute distribusi ya 🌾' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || data.error }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">
        <span className="icon-box"><Bot size={16} /></span>
        Tanya AI Assistant
      </h2>
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`chat-row ${m.role === 'user' ? 'user' : ''}`}>
            <span className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}>{m.content}</span>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ketik pertanyaan..."
        />
        <button onClick={sendMessage} disabled={loading}>{loading ? '...' : 'Kirim'}</button>
      </div>
    </div>
  )
}

function DeteksiPenyakit() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [hasil, setHasil] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setHasil(null)
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/api/predict/penyakit`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mendeteksi penyakit')
      setHasil(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">
        <span className="icon-box"><Leaf size={16} /></span>
        Deteksi Penyakit Daun Cabai
      </h2>

      <div className="field">
        <label>Upload foto daun cabai</label>
        <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {preview && (
        <img
          src={preview}
          alt="preview"
          style={{ maxWidth: 240, borderRadius: 10, marginTop: 10, marginBottom: 10, display: 'block' }}
        />
      )}

      <button onClick={handleSubmit} disabled={loading || !file}>
        {loading ? 'Mendeteksi...' : 'Deteksi Penyakit'}
      </button>

      {error && <div className="error">{error}</div>}

      {hasil && (
        <div className="rute-box" style={{ marginTop: 16 }}>
          <b>{hasil.kelas}</b> · {hasil.confidence}% yakin
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sprout size={20} /></div>
          <div>
            <h1>Smart Logistics AI</h1>
            <p>Tim Sannin — AI Innovation Challenge, COMPFEST 18</p>
          </div>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          Sistem Aktif
        </div>
      </div>

      <div className="hero">
        <p className="eyebrow">Rantai Pasok Cabai Rawit · Sulawesi Selatan</p>
        <h2>Dari ladang ke gudang, <span>dioptimalkan AI</span></h2>
        <p className="hero-sub">
          Prediksi harga komoditas dan optimasi rute distribusi berbasis
          Prophet dan Google OR-Tools, untuk 5 sentra tani di Sulawesi Selatan.
        </p>
      </div>

      <div className="main">
        <PrediksiHarga />
        <DeteksiPenyakit />
        <OptimasiRute />
        <Chatbot />
      </div>
    </div>
  )
}
