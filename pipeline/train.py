from pathlib import Path
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss, brier_score_loss

PROCESSED_DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "models"

FEATURE_COL = [
    "home_win_avg_last5",
    "home_pts_avg_last5",
    "home_reb_avg_last5",
    "home_ast_avg_last5",
    "home_stl_avg_last5",
    "home_blk_avg_last5",
    "home_tov_avg_last5",
    "home_pf_avg_last5",
    "home_rest_days",
    "away_win_avg_last5",
    "away_pts_avg_last5",
    "away_reb_avg_last5",
    "away_ast_avg_last5",
    "away_stl_avg_last5",
    "away_blk_avg_last5",
    "away_tov_avg_last5",
    "away_pf_avg_last5",
    "away_rest_days",
]

TARGET_COL = "home_win"


def time_based_split(df: pd.DataFrame, test_frac: float = 0.2):
    # Sorting chronologcally. games later in the season reserved for test
    df = df.sort_values("GAME_DATE").reset_index(drop=True)
    split_idx = int(len(df) * (1 - test_frac))
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    return train_df, test_df


def evaluate(y_true, y_pred_proba, label: str):
    y_pred = (y_pred_proba >= 0.5).astype(int)
    acc = accuracy_score(y_true, y_pred)
    ll = log_loss(y_true, y_pred_proba)
    brier = brier_score_loss(y_true, y_pred_proba)

    print(f"{label:20s}  accuracy={acc:.3f}  log_loss={ll:.3f}  brier={brier:.3f}")
    return {"accuracy": acc, "log_loss": ll, "brier": brier}


if __name__ == "__main__":
    df = pd.read_csv(PROCESSED_DATA_DIR / "features.csv", parse_dates=["GAME_DATE"])
    train_df, test_df = time_based_split(df)

    X_train, y_train = train_df[FEATURE_COL], train_df[TARGET_COL]
    X_test, y_test = test_df[FEATURE_COL], test_df[TARGET_COL]

    naive_prob = pd.Series(1.0, index=y_test.index)
    print("\nNaive")
    evaluate(y_test, naive_prob.clip(0.001, 0.999), "Naive, home team always wins")

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)
    model_proba = model.predict_proba(X_test)[:, 1]
    coefs = pd.Series(model.coef_[0], index=FEATURE_COL)
    print(coefs.sort_values(key=abs, ascending=False))
    print("\n Logistic")
    evaluate(y_test, model_proba, "Logistic regression")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "model.pkl")
    print(f"\nSaved model to {MODELS_DIR / 'model.pkl'}")
