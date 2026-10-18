import io
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

app = FastAPI(title="Smart Logistics AI Service — Tim SANNIN")

MODELS_DIR = Path(__file__).parent / "models"

# --- Load data VRP (selalu ada) ---
with open(MODELS_DIR / "data_vrp.json") as f:
    data_vrp = json.load(f)

df_lokasi = pd.DataFrame(data_vrp["lokasi"])
jarak_matrix = data_vrp["jarak_matrix"]

# --- Load model Prophet (opsional saat startup, wajib ada saat dipakai) ---
model_harga = None
model_path = MODELS_DIR / "model_harga.pkl"
if model_path.exists():
    with open(model_path, "rb") as f:
        model_harga = pickle.load(f)

# --- Load model deteksi penyakit daun cabai (opsional saat startup) ---
IMG_HEIGHT, IMG_WIDTH = 224, 224

model_penyakit = None
model_penyakit_path = MODELS_DIR / "saved_model"
if model_penyakit_path.exists():
    loaded_model = tf.saved_model.load(str(model_penyakit_path))
    model_penyakit = loaded_model.signatures["serving_default"]

class_indices_penyakit = {}
class_indices_path = MODELS_DIR / "class_indices.json"
if class_indices_path.exists():
    with open(class_indices_path) as f:
        class_indices_penyakit = json.load(f)


class PrediksiRequest(BaseModel):
    periode_ke_depan: int = 2


@app.post("/predict/harga")
def predict_harga(req: PrediksiRequest):
    if model_harga is None:
        raise HTTPException(
            status_code=500,
            detail="model_harga.pkl belum ditemukan di folder ai-service/models/. "
                   "Lihat ai-service/models/BACA_INI.md",
        )
    future = model_harga.make_future_dataframe(periods=req.periode_ke_depan, freq="MS")
    forecast = model_harga.predict(future)
    hasil = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(req.periode_ke_depan)
    hasil["ds"] = hasil["ds"].dt.strftime("%Y-%m-%d")
    return hasil.to_dict(orient="records")


class RuteRequest(BaseModel):
    demand: list[int]
    kapasitas_truk: int = 1200
    jumlah_truk: int = 3


@app.post("/optimize/rute")
def optimize_rute(req: RuteRequest):
    n = len(jarak_matrix)
    if len(req.demand) != n:
        raise HTTPException(
            status_code=400,
            detail=f"Panjang 'demand' harus {n} (sesuai jumlah lokasi di data_vrp.json)",
        )

    manager = pywrapcp.RoutingIndexManager(n, req.jumlah_truk, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        i, j = manager.IndexToNode(from_index), manager.IndexToNode(to_index)
        return int(jarak_matrix[i][j] * 1000)

    transit_idx = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

    def demand_callback(from_index):
        return req.demand[manager.IndexToNode(from_index)]

    demand_idx = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_idx, 0, [req.kapasitas_truk] * req.jumlah_truk, True, "Kapasitas"
    )

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.FromSeconds(5)

    solution = routing.SolveWithParameters(params)
    if not solution:
        raise HTTPException(
            status_code=422,
            detail="Tidak ditemukan solusi. Coba naikkan kapasitas truk atau jumlah truk.",
        )

    hasil_rute = []
    for v in range(req.jumlah_truk):
        index = routing.Start(v)
        rute, muatan = [], 0
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            rute.append(df_lokasi.iloc[node]["nama"])
            muatan += req.demand[node]
            index = solution.Value(routing.NextVar(index))
        rute.append(df_lokasi.iloc[manager.IndexToNode(index)]["nama"])
        if muatan > 0:  # skip truk yang nggak dapat tugas
            hasil_rute.append({"truk": v + 1, "rute": rute, "muatan_kg": muatan})

    return hasil_rute


@app.post("/predict/penyakit")
async def predict_penyakit(file: UploadFile = File(...)):
    if model_penyakit is None:
        raise HTTPException(
            status_code=500,
            detail="Model deteksi penyakit belum ditemukan di folder ai-service/models/saved_model",
        )

    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB").resize((IMG_WIDTH, IMG_HEIGHT))
    arr = np.array(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)

    input_tensor = tf.convert_to_tensor(arr, dtype=tf.float32)
    output_dict = model_penyakit(input_tensor)
    predictions = list(output_dict.values())[0].numpy()[0]
    idx = int(np.argmax(predictions))

    kelas = class_indices_penyakit.get(str(idx), "Tidak diketahui")
    confidence = float(predictions[idx])

    all_scores = {
        class_indices_penyakit.get(str(i), f"kelas_{i}"): float(p)
        for i, p in enumerate(predictions)
    }

    return {
        "kelas": kelas,
        "confidence": round(confidence * 100, 2),
        "all_scores": all_scores,
    }

    return {
        "kelas": kelas,
        "confidence": round(confidence * 100, 2),
        "all_scores": all_scores,
    }


@app.get("/lokasi")
def get_lokasi():
    return df_lokasi.to_dict(orient="records")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_harga_loaded": model_harga is not None,
        "model_penyakit_loaded": model_penyakit is not None,
    }