import pandas as pd

# Load dataset
df = pd.read_csv("data.csv")

# Display first 5 records
print("PATIENT DATASET")
print(df.head())

# Display dataset information
print("\nDATASET INFORMATION")
print(df.info())

# Check dataset dimensions
print("\nDATASET SHAPE:", df.shape)

# Check missing values
print("\nMISSING VALUES")
print(df.isnull().sum())

# Check disease distribution
print("\nDISEASE DISTRIBUTION")
print(df["disease"].value_counts())