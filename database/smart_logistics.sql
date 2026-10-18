CREATE DATABASE IF NOT EXISTS smart_logistics;
USE smart_logistics;

CREATE TABLE IF NOT EXISTS riwayat_prediksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    komoditas VARCHAR(100) NOT NULL,
    periode_ke_depan INT NOT NULL,
    hasil_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riwayat_rute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jumlah_truk INT NOT NULL,
    kapasitas_truk INT NOT NULL,
    hasil_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
