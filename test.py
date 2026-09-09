from pipeline.fetch import fetch_season

df = fetch_season('2023-24')
print(df.shape)
print(df.head())
print(df.columns.tolist())