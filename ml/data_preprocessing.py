import pandas as pd
from pathlib import Path


# =====================================
# STEP 1: DEFINE DATASET LOCATION
# =====================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_PATH = BASE_DIR / "data.csv"


# =====================================
# STEP 2: LOAD DATASET
# =====================================

def load_dataset():

    print("\n========== DATASET LOADING ==========")

    df = pd.read_csv(DATASET_PATH)

    print("Dataset loaded successfully!")

    print("Total Records:", df.shape[0])
    print("Total Columns:", df.shape[1])

    return df


# =====================================
# STEP 3: CHECK DATA QUALITY
# =====================================

def check_data_quality(df):

    print("\n========== DATA QUALITY CHECK ==========")

    # Check missing values
    print("\nMissing Values:")

    print(df.isnull().sum())

    # Total missing values
    print("\nTotal Missing Values:",
          df.isnull().sum().sum())

    # Check duplicate records
    print("\nDuplicate Records:",
          df.duplicated().sum())

    # Check duplicate patient IDs
    print("\nDuplicate Patient IDs:",
          df["patient_id"].duplicated().sum())

    # Check target distribution
    print("\nDisease Distribution:")

    print(df["disease"].value_counts())


# =====================================
# STEP 4: DEFINE FEATURES
# =====================================

def prepare_features(df):

    print("\n========== FEATURE PREPARATION ==========")

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

    # Input features
    X = df[numerical_features + categorical_features]

    # Target variable
    y = df["disease"]

    print("\nNumerical Features:")
    print(numerical_features)

    print("\nCategorical Features:")
    print(categorical_features)

    print("\nInput Shape:", X.shape)

    print("Target Shape:", y.shape)

    return X, y, numerical_features, categorical_features


# =====================================
# STEP 5: MAIN EXECUTION
# =====================================

if __name__ == "__main__":

    df = load_dataset()

    check_data_quality(df)

    X, y, numerical_features, categorical_features = (
        prepare_features(df)
    )

    print("\n========== PREPROCESSING COMPLETED ==========")

    print("Total Training Candidates:", len(X))

    print("Input Features:", X.shape[1])

    print("Target Classes:", y.unique())