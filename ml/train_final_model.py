import pandas as pd
import joblib

from pathlib import Path

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier


# =====================================
# STEP 1: PROJECT PATHS
# =====================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_PATH = BASE_DIR / "data.csv"

MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "best_model.pkl"


# Create models directory if it doesn't exist
MODEL_DIR.mkdir(exist_ok=True)


# =====================================
# STEP 2: LOAD DATASET
# =====================================

df = pd.read_csv(DATASET_PATH)

print("Dataset Loaded Successfully")

print("Total Records:", len(df))


# =====================================
# STEP 3: PREPARE FEATURES
# =====================================

X = df.drop(["patient_id", "disease"], axis=1)

y = df["disease"]


# =====================================
# STEP 4: DEFINE FEATURES
# =====================================

numerical_features = [
    "age",
    "glucose_mg_dl",
    "cholesterol_mg_dl",
    "systolic_bp",
    "diastolic_bp",
    "bmi",
    "heart_rate"
]

categorical_features = [
    "gender",
    "smoking",
    "alcohol_consumption",
    "physical_activity",
    "family_history"
]


# =====================================
# STEP 5: PREPROCESSING
# =====================================

preprocessor = ColumnTransformer(

    transformers=[

        ("cat",
         OneHotEncoder(handle_unknown="ignore"),
         categorical_features)

    ],

    remainder="passthrough"

)


# =====================================
# STEP 6: CREATE RANDOM FOREST
# =====================================

model = Pipeline(steps=[

    ("preprocessor", preprocessor),

    ("classifier", RandomForestClassifier(

        n_estimators=300,

        random_state=42,

        class_weight="balanced",

        n_jobs=-1

    ))

])


# =====================================
# STEP 7: TRAIN USING ALL RECORDS
# =====================================

print("\nTraining Final Random Forest Model...")

model.fit(X, y)


# =====================================
# STEP 8: SAVE MODEL
# =====================================

joblib.dump(model, MODEL_PATH)


# =====================================
# STEP 9: DISPLAY RESULTS
# =====================================

print("\n================================")

print("FINAL MODEL TRAINED SUCCESSFULLY")

print("================================")

print("Algorithm: Random Forest")

print("Training Records:", len(X))

print("Features:", X.shape[1])

print("Model Saved At:", MODEL_PATH)

print("\nModel Ready for Web Integration!")