from pathlib import Path
import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from .constants import WIN_MODEL_STATS
from .train import time_based_split, FEATURE_COL

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "models"

TARGET_COL = "point_diff"


def evaluate_spread(y_true, y_pred, label: str):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    print(f"{label:20s} MAE={mae:.2f} pts RMSE={rmse:.2f} pts")


if __name__ == "__main__":
    df = pd.read_csv(PROCESSED_DATA_DIR / "features.csv", parse_dates=["game_date"])
    games = pd.read_csv(
        PROCESSED_DATA_DIR / "games_clean.csv", parse_dates=["game_date"]
    )
    games["point_diff"] = games["home_pts"] - games["away_pts"]

    df = df.merge(games[["game_id", "point_diff"]], on="game_id")
    train_df, test_df = time_based_split(df)
    X_train, y_train = train_df[FEATURE_COL], train_df[TARGET_COL]
    X_test, y_test = test_df[FEATURE_COL], test_df[TARGET_COL]

    naive_pred = pd.Series(y_train.mean(), index=y_test.index)
    print("\nNaive")
    evaluate_spread(y_test, naive_pred, "Naive, average margin")

    spread_model = LinearRegression()
    spread_model.fit(X_train, y_train)
    spread_pred = spread_model.predict(X_test)

    coefs = pd.Series(spread_model.coef_, index=FEATURE_COL)
    print("\nCoeff")
    print(coefs.sort_values(key=abs, ascending=False))
    print("\n Linear Regression")
    evaluate_spread(y_test, spread_pred, "Linear Regression")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(spread_model, MODELS_DIR / "spread_model.pkl")
    print(f"\n Saved spread model to {MODELS_DIR /'spread_model.pkl'}")
