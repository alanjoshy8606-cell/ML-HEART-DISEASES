import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import make_scorer, precision_score, recall_score, f1_score


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "data.csv"
OUTPUT_PATH = BASE_DIR / "models" / "model_comparison.json"

df = pd.read_csv(DATASET_PATH)
X = df.drop(["patient_id", "disease"], axis=1)
y = df["disease"]

numerical_features = [
    "age", "glucose_mg_dl", "cholesterol_mg_dl",
    "systolic_bp", "diastolic_bp", "bmi", "heart_rate"
]
categorical_features = [
    "gender", "smoking", "alcohol_consumption",
    "physical_activity", "family_history"
]

lr_preprocessor = ColumnTransformer(transformers=[
    ("num", StandardScaler(), numerical_features),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
])

rf_preprocessor = ColumnTransformer(transformers=[
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
], remainder="passthrough")

logistic_model = Pipeline(steps=[
    ("preprocessor", lr_preprocessor),
    ("classifier", LogisticRegression(max_iter=1000))
])

random_forest_model = Pipeline(steps=[
    ("preprocessor", rf_preprocessor),
    ("classifier", RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    ))
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

scoring = {
    "accuracy": "accuracy",
    "precision": make_scorer(precision_score, pos_label="Yes", zero_division=0),
    "recall": make_scorer(recall_score, pos_label="Yes", zero_division=0),
    "f1": make_scorer(f1_score, pos_label="Yes", zero_division=0),
    "roc_auc": "roc_auc"
}

models = {
    "Logistic Regression": logistic_model,
    "Random Forest": random_forest_model
}

results = {}

print("\\n======================================")
print("       HEART / 01 MODEL COMPARISON")
print("======================================")

for name, model in models.items():
    print(f"\\nEvaluating {name}...")
    scores = cross_validate(model, X, y, cv=cv, scoring=scoring, n_jobs=-1)
    results[name] = {
        metric: float(scores[f"test_{metric}"].mean())
        for metric in scoring
    }

results_df = pd.DataFrame(results).T
print("\\n========== MODEL PERFORMANCE ==========")
print(results_df.round(4))

best_model_name = results_df["f1"].idxmax()
print("\\nBEST PERFORMING MODEL:", best_model_name)
print("Selection Metric: Mean Cross-Validated F1 Score")

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with OUTPUT_PATH.open("w", encoding="utf-8") as file:
    json.dump({
        "best_model_name": best_model_name,
        "selection_metric": "Mean Cross-Validated F1 Score",
        "results": results
    }, file, indent=4)

print("\\nDashboard metrics saved to:", OUTPUT_PATH)
