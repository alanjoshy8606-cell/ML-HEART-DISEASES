from flask import Flask, render_template, jsonify, request
from pathlib import Path
from datetime import datetime, timedelta
import csv
import json
import math
import sqlite3

import joblib
import pandas as pd

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data.csv"
MODEL_PATH = BASE_DIR / "models" / "best_model.pkl"
METRICS_PATH = BASE_DIR / "models" / "model_comparison.json"
INSTANCE_DIR = BASE_DIR / "instance"
LEGACY_HISTORY_PATH = INSTANCE_DIR / "prediction_history.csv"
DATABASE_PATH = INSTANCE_DIR / "heart01.db"

NUMERICAL_FEATURES = [
    "age", "glucose_mg_dl", "cholesterol_mg_dl", "systolic_bp",
    "diastolic_bp", "bmi", "heart_rate",
]
CATEGORICAL_FEATURES = [
    "gender", "smoking", "alcohol_consumption",
    "physical_activity", "family_history",
]
FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES
HISTORY_COLUMNS = [
    "id", "created_at", "status", "prediction", "algorithm",
    "age", "gender", "glucose_mg_dl", "cholesterol_mg_dl",
    "systolic_bp", "diastolic_bp", "bmi", "heart_rate",
    "smoking", "alcohol_consumption", "physical_activity", "family_history",
]
_model = None


def get_db():
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_database():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                prediction TEXT,
                algorithm TEXT,
                age REAL,
                gender TEXT,
                glucose_mg_dl REAL,
                cholesterol_mg_dl REAL,
                systolic_bp REAL,
                diastolic_bp REAL,
                bmi REAL,
                heart_rate REAL,
                smoking TEXT,
                alcohol_consumption TEXT,
                physical_activity TEXT,
                family_history TEXT
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS app_migrations (
                migration_key TEXT PRIMARY KEY,
                completed_at TEXT NOT NULL
            )
        """)
        migrated = db.execute(
            "SELECT 1 FROM app_migrations WHERE migration_key = ?",
            ("legacy_csv_to_sqlite_v1",)
        ).fetchone()
        if not migrated and LEGACY_HISTORY_PATH.exists():
            try:
                with LEGACY_HISTORY_PATH.open("r", newline="", encoding="utf-8-sig") as file:
                    for row in csv.DictReader(file):
                        db.execute("""
                            INSERT INTO prediction_history
                            (created_at, status, prediction, algorithm)
                            VALUES (?, ?, ?, ?)
                        """, (
                            row.get("created_at") or datetime.now().astimezone().isoformat(timespec="seconds"),
                            row.get("status") or "unknown",
                            row.get("prediction") or None,
                            row.get("algorithm") or None,
                        ))
                db.execute(
                    "INSERT INTO app_migrations (migration_key, completed_at) VALUES (?, ?)",
                    ("legacy_csv_to_sqlite_v1", datetime.now().astimezone().isoformat(timespec="seconds"))
                )
            except (OSError, csv.Error):
                app.logger.exception("Could not import legacy prediction history CSV")


def read_dataset():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")
    return pd.read_csv(DATASET_PATH)


def get_category_options():
    df = read_dataset()
    options = {}
    for column in CATEGORICAL_FEATURES:
        if column not in df.columns:
            options[column] = []
        else:
            values = df[column].dropna().astype(str).unique().tolist()
            options[column] = sorted(values, key=str.casefold)
    return options


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError("Trained model not found. Run: python ml/train_final_model.py")
        _model = joblib.load(MODEL_PATH)
    return _model


def save_prediction_record(status, prediction=None, algorithm="Random Forest", values=None):
    values = values or {}
    record = {
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "status": status,
        "prediction": prediction,
        "algorithm": algorithm,
    }
    for column in FEATURES:
        record[column] = values.get(column)
    columns = list(record.keys())
    placeholders = ", ".join("?" for _ in columns)
    with get_db() as db:
        cursor = db.execute(
            f"INSERT INTO prediction_history ({', '.join(columns)}) VALUES ({placeholders})",
            [record[column] for column in columns]
        )
        return cursor.lastrowid


def row_to_dict(row):
    return {key: row[key] for key in row.keys()}


def load_dashboard_data():
    result = {
        "dataset": {
            "total_records": 0, "feature_count": 0, "missing_values": 0,
            "duplicate_records": 0, "positive_cases": 0, "negative_cases": 0,
        },
        "predictions": {
            "successful": 0, "unsuccessful": 0, "total": 0, "recent": [],
            "daily_labels": [], "daily_success": [],
        },
        "model": {
            "selected": "Random Forest", "metrics": {},
            "status": "Evaluation results not loaded",
        },
        "dataset_status": "Dataset not found",
    }

    if DATASET_PATH.exists():
        df = read_dataset()
        result["dataset"].update({
            "total_records": int(len(df)),
            "feature_count": int(max(len(df.columns) - int("patient_id" in df.columns) - int("disease" in df.columns), 0)),
            "missing_values": int(df.isnull().sum().sum()),
            "duplicate_records": int(df.duplicated().sum()),
        })
        if "disease" in df.columns:
            counts = df["disease"].astype(str).str.strip().str.lower().value_counts()
            result["dataset"]["positive_cases"] = int(counts.get("yes", 0))
            result["dataset"]["negative_cases"] = int(counts.get("no", 0))
        result["dataset_status"] = "Dataset connected"

    if METRICS_PATH.exists():
        try:
            with METRICS_PATH.open("r", encoding="utf-8") as file:
                saved = json.load(file)
            result["model"]["selected"] = saved.get("best_model_name", "Random Forest")
            result["model"]["metrics"] = saved.get("results", {})
            result["model"]["status"] = "Evaluation results loaded"
        except (json.JSONDecodeError, OSError):
            result["model"]["status"] = "Could not read evaluation results"

    with get_db() as db:
        rows = db.execute("SELECT * FROM prediction_history ORDER BY id DESC").fetchall()
    successful = sum(str(row["status"]).lower() in ("success", "successful", "completed") for row in rows)
    unsuccessful = sum(str(row["status"]).lower() in ("failed", "failure", "unsuccessful", "error") for row in rows)
    result["predictions"]["successful"] = successful
    result["predictions"]["unsuccessful"] = unsuccessful
    result["predictions"]["total"] = successful + unsuccessful
    result["predictions"]["recent"] = [
        {"created_at": row["created_at"], "prediction": row["prediction"],
         "algorithm": row["algorithm"], "status": row["status"], "id": row["id"]}
        for row in rows[:6]
    ]

    parsed = []
    for row in rows:
        try:
            parsed.append(datetime.fromisoformat(row["created_at"]))
        except (TypeError, ValueError):
            continue
    if parsed:
        counts_by_date = {}
        for dt in parsed:
            key = dt.strftime("%d %b")
            counts_by_date[key] = counts_by_date.get(key, 0) + 1
        last_seven = list(counts_by_date.items())[-7:]
        result["predictions"]["daily_labels"] = [item[0] for item in last_seven]
        result["predictions"]["daily_success"] = [item[1] for item in last_seven]
    return result


@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@app.route("/prediction")
def prediction():
    try:
        categories = get_category_options()
        page_error = None
    except Exception as error:
        categories = {column: [] for column in CATEGORICAL_FEATURES}
        page_error = str(error)
    return render_template("prediction.html", categories=categories, page_error=page_error)


@app.route("/history")
def history():
    return render_template("history.html")


@app.route("/api/dashboard-data")
def dashboard_data():
    return jsonify(load_dashboard_data())


@app.route("/api/history")
def api_history():
    search = request.args.get("q", "").strip()
    status = request.args.get("status", "").strip().lower()
    prediction = request.args.get("prediction", "").strip().lower()
    date_from = request.args.get("from", "").strip()
    date_to = request.args.get("to", "").strip()
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 15, type=int), 1), 100)

    clauses, params = [], []
    if search:
        like = f"%{search}%"
        clauses.append("""(
            CAST(id AS TEXT) LIKE ? OR COALESCE(prediction,'') LIKE ?
            OR COALESCE(algorithm,'') LIKE ? OR COALESCE(gender,'') LIKE ?
            OR COALESCE(status,'') LIKE ?
        )""")
        params.extend([like] * 5)
    if status:
        clauses.append("LOWER(status) = ?")
        params.append(status)
    if prediction:
        clauses.append("LOWER(COALESCE(prediction,'')) = ?")
        params.append(prediction)
    if date_from:
        clauses.append("date(created_at) >= date(?)")
        params.append(date_from)
    if date_to:
        clauses.append("date(created_at) <= date(?)")
        params.append(date_to)

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM prediction_history" + where, params).fetchone()[0]
        rows = db.execute(
            "SELECT * FROM prediction_history" + where +
            " ORDER BY id DESC LIMIT ? OFFSET ?",
            params + [per_page, (page - 1) * per_page]
        ).fetchall()
    return jsonify({
        "success": True, "items": [row_to_dict(row) for row in rows],
        "total": total, "page": page, "per_page": per_page,
        "pages": max((total + per_page - 1) // per_page, 1),
    })


@app.route("/api/history/<int:record_id>", methods=["GET", "DELETE"])
def api_history_detail(record_id):
    with get_db() as db:
        if request.method == "DELETE":
            cursor = db.execute("DELETE FROM prediction_history WHERE id = ?", (record_id,))
            if cursor.rowcount == 0:
                return jsonify({"success": False, "message": "History record not found."}), 404
            return jsonify({"success": True, "message": "History record deleted."})
        row = db.execute("SELECT * FROM prediction_history WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        return jsonify({"success": False, "message": "History record not found."}), 404
    return jsonify({"success": True, "item": row_to_dict(row)})


@app.route("/api/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    input_values = {}
    try:
        training_df = read_dataset()
        feature_columns = [column for column in training_df.columns if column not in ["patient_id", "disease"]]
        missing_columns = [column for column in FEATURES if column not in feature_columns]
        if missing_columns:
            return jsonify({"success": False, "message": "The dataset is missing required model features: " + ", ".join(missing_columns)}), 500

        for column in NUMERICAL_FEATURES:
            raw_value = payload.get(column)
            if raw_value is None or str(raw_value).strip() == "":
                return jsonify({"success": False, "message": f"Please enter {column.replace('_', ' ')}."}), 400
            try:
                value = float(raw_value)
            except (TypeError, ValueError):
                return jsonify({"success": False, "message": f"{column.replace('_', ' ').title()} must be a number."}), 400
            if not math.isfinite(value) or value <= 0:
                return jsonify({"success": False, "message": f"{column.replace('_', ' ').title()} must be a valid number greater than zero."}), 400
            if column == "age" and (value < 1 or value > 120):
                return jsonify({"success": False, "message": "Age must be between 1 and 120."}), 400
            input_values[column] = value

        for column in CATEGORICAL_FEATURES:
            raw_value = payload.get(column)
            if raw_value is None or str(raw_value).strip() == "":
                return jsonify({"success": False, "message": f"Please select {column.replace('_', ' ')}."}), 400
            value = str(raw_value).strip()
            allowed_values = set(training_df[column].dropna().astype(str).unique())
            if value not in allowed_values:
                return jsonify({"success": False, "message": f"Invalid selection for {column.replace('_', ' ')}."}), 400
            input_values[column] = value

        input_frame = pd.DataFrame([[input_values[column] for column in feature_columns]], columns=feature_columns)
        predicted_value = str(get_model().predict(input_frame)[0])
        record_id = save_prediction_record("success", predicted_value, "Random Forest", input_values)

        normalized = predicted_value.strip().lower()
        if normalized == "yes":
            result_label = "Potential heart disease detected"
            explanation = ("Based on patterns learned from the training dataset, the model classified this health profile in the 'Yes' (heart disease) class. This is a model prediction, not a confirmed diagnosis.")
        elif normalized == "no":
            result_label = "No heart disease predicted"
            explanation = ("Based on patterns learned from the training dataset, the model classified this health profile in the 'No' (no heart disease) class. This result cannot rule out heart disease or replace medical evaluation.")
        else:
            result_label = f"Predicted class: {predicted_value}"
            explanation = "The model returned a class from its training labels."

        return jsonify({
            "success": True, "history_id": record_id, "prediction": predicted_value,
            "headline": "Prediction completed", "result_label": result_label,
            "explanation": explanation, "algorithm": "Random Forest",
            "disclaimer": ("HEART / 01 is an educational research prototype. Its output is not a diagnosis, medical advice, or a substitute for evaluation by a qualified healthcare professional."),
        })
    except FileNotFoundError as error:
        return jsonify({"success": False, "message": str(error)}), 500
    except Exception:
        try:
            save_prediction_record("failed", "Prediction error", "Random Forest", input_values)
        except Exception:
            app.logger.exception("Could not save failed prediction event")
        app.logger.exception("Prediction request failed")
        return jsonify({"success": False, "message": "The prediction could not be completed. Check the server terminal for details."}), 500


init_database()

if __name__ == "__main__":
    app.run(debug=True)
