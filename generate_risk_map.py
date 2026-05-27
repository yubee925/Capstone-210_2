import json
import math
import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import matplotlib

matplotlib.use("Agg")

import matplotlib.font_manager as fm
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import Polygon as MplPolygon
from matplotlib.collections import PatchCollection
from shapely.geometry import shape


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "outputs"
OUT_DIR.mkdir(exist_ok=True)

GEOJSON_PATH = ROOT / "HangJeongDong_ver20241001.geojson"
POPULATION_PATH = ROOT / "성동구_인구.xlsx"
INCOME_PATH = ROOT / "성동구_소비비율_2024 (1).xlsx"
FLOW_PATH = ROOT / "유동인구.xlsx"
TURNOVER_PATH = ROOT / "성동구_상권_회전율.xlsx"
OP_PERIOD_PATH = ROOT / "성동구_상권_영업기간(년).xlsx"
FRANCHISE_PATH = ROOT / "성동구_2024_연평균_프랜차이즈비율 (1).xlsx"
POPUP_RATIO_PATH = ROOT / "팝업_비율.xlsx"
POPUP_INTENSITY_PATH = ROOT / "팝업_강도.xlsx"

PNG_PATH = OUT_DIR / "seongdong_gentrification_risk_map.png"
CSV_PATH = OUT_DIR / "seongdong_gentrification_scores.csv"
XLSX_PATH = OUT_DIR / "seongdong_gentrification_scores.xlsx"
DASHBOARD_JS_PATH = OUT_DIR / "dashboard_data.js"


GENERAL_WEIGHTS = {
    "population_norm": 0.137,
    "income_ratio_norm": 0.133,
    "turnover_rate_norm": 0.170,
    "operating_period_risk": 0.154,
    "franchise_ratio_norm": 0.175,
    "floating_population_norm": 0.231,
}

SEONGSU_POPUP_DONGS = {
    "성수1가1동",
    "성수1가2동",
    "성수2가1동",
    "성수2가3동",
}

POPUP_WEIGHTS = {
    "population_norm": 0.137,
    "income_ratio_norm": 0.133,
    "turnover_rate_norm": 0.120,
    "operating_period_risk": 0.154,
    "franchise_ratio_norm": 0.110,
    "floating_population_norm": 0.231,
    "popup_ratio_norm": 0.045,
    "popup_intensity_norm": 0.070,
}


def configure_font():
    candidates = [
        Path("/mnt/c/Windows/Fonts/malgun.ttf"),
        Path("/mnt/c/Windows/Fonts/malgunbd.ttf"),
    ]
    for path in candidates:
        if path.exists():
            fm.fontManager.addfont(str(path))
            font_name = fm.FontProperties(fname=str(path)).get_name()
            plt.rcParams["font.family"] = font_name
            break
    plt.rcParams["axes.unicode_minus"] = False


def normalize_name(name: str) -> str:
    if name is None:
        return ""
    cleaned = str(name).strip()
    replacements = {
        "서울특별시 성동구 ": "",
        "금호2?3가동": "금호2·3가동",
        "금호2ㆍ3가동": "금호2·3가동",
        "금호2.3가동": "금호2·3가동",
        "왕십리도선동 ": "왕십리도선동",
        "성수 1가 1동": "성수1가1동",
        "성수 1가 2동": "성수1가2동",
        "성수 2가 1동": "성수2가1동",
        "성수2가2동": "성수2가3동",
        "성수 2가 2동": "성수2가3동",
        "성수 2가 3동": "성수2가3동",
    }
    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)
    return cleaned


def minmax(series: pd.Series) -> pd.Series:
    series = series.astype(float)
    min_val = series.min()
    max_val = series.max()
    if math.isclose(min_val, max_val):
        return pd.Series(0.5, index=series.index)
    return (series - min_val) / (max_val - min_val)


def log_minmax(series: pd.Series) -> pd.Series:
    series = series.astype(float)
    logged = np.log1p(series)
    return minmax(logged)


def quantile_rank(series: pd.Series) -> pd.Series:
    series = series.astype(float)
    valid = series.dropna()
    if valid.empty:
        return pd.Series(np.nan, index=series.index)
    ranks = valid.rank(method="average", ascending=True)
    normalized = ranks / len(valid)
    return normalized.reindex(series.index)


def log_quantile_rank(series: pd.Series) -> pd.Series:
    series = series.astype(float)
    logged = np.log1p(series)
    return quantile_rank(logged)


def load_geojson():
    with GEOJSON_PATH.open(encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for feature in data["features"]:
        props = feature["properties"]
        if props.get("sggnm") != "성동구":
            continue
        dong_name = normalize_name(props["adm_nm"])
        geom = shape(feature["geometry"])
        rows.append(
            {
                "dong": dong_name,
                "adm_cd2": str(props["adm_cd2"]),
                "geometry": geom,
                "centroid_x": geom.centroid.x,
                "centroid_y": geom.centroid.y,
            }
        )

    geo_df = pd.DataFrame(rows)
    return geo_df


def load_population():
    df = pd.read_excel(POPULATION_PATH)
    df["dong"] = df["동별(2)"].map(normalize_name)
    df["population"] = pd.to_numeric(df["2024"], errors="coerce")
    return df[["dong", "population"]]


def load_income_ratio():
    df = pd.read_excel(INCOME_PATH)
    df["dong"] = df["행정동_코드_명"].map(normalize_name)
    df["income_ratio"] = pd.to_numeric(df["비율"], errors="coerce")
    return df[["dong", "income_ratio"]]


def load_floating_population():
    df = pd.read_excel(FLOW_PATH)
    df["dong"] = df["행정동별"].map(normalize_name)
    df["floating_population"] = pd.to_numeric(df["총유동인구수"], errors="coerce")
    return df[["dong", "floating_population"]]


def load_turnover():
    df = pd.read_excel(TURNOVER_PATH)
    df["dong"] = df["행정동"].map(normalize_name)
    df["turnover_rate"] = pd.to_numeric(df["2024년 평균 회전율"], errors="coerce")
    return df[["dong", "turnover_rate"]]


def load_operating_period():
    df = pd.read_excel(OP_PERIOD_PATH)
    df["dong"] = df["행정구역"].map(normalize_name)
    df = df[df["dong"] != "성동구"].copy()
    df["operating_period_10y_avg"] = pd.to_numeric(df["2024년 기준 최근10년"], errors="coerce")
    return df[["dong", "operating_period_10y_avg"]]


def load_franchise_ratio():
    df = pd.read_excel(FRANCHISE_PATH)
    df["dong"] = df["행정동"].map(normalize_name)
    df["franchise_ratio"] = pd.to_numeric(df["24년도 프랜차이즈 비율"], errors="coerce")
    return df[["dong", "franchise_ratio"]]


def load_popup_ratio():
    df = pd.read_excel(POPUP_RATIO_PATH)
    df["dong"] = df["행정동"].map(normalize_name)
    df["popup_ratio"] = pd.to_numeric(df["팝업 비율(팝업 수/ 전체 점포 수)"], errors="coerce")
    return df[["dong", "popup_ratio"]]


def load_popup_intensity():
    df = pd.read_excel(POPUP_INTENSITY_PATH)
    df["dong"] = df["행정동"].map(normalize_name)
    df["popup_intensity"] = pd.to_numeric(df["팝업 강도(팝업 수 x 평균 영업 일수)"], errors="coerce")
    return df[["dong", "popup_intensity"]]


VARIABLE_LABELS = {
    "population_risk_norm": "인구(A)",
    "income_ratio_risk_norm": "소비성향(B)",
    "turnover_rate_risk_norm": "회전율(C)",
    "operating_period_risk_norm": "영업기간 역지표(D)",
    "franchise_ratio_risk_norm": "프랜차이즈(E)",
    "floating_population_risk_norm": "유동인구(F)",
    "popup_ratio_risk_norm": "팝업비율(G1)",
    "popup_intensity_risk_norm": "팝업강도(G2)",
}

WEIGHT_LABELS = {
    "population_norm": "인구(A)",
    "income_ratio_norm": "소비성향(B)",
    "turnover_rate_norm": "회전율(C)",
    "operating_period_risk": "영업기간 역지표(D)",
    "franchise_ratio_norm": "프랜차이즈(E)",
    "floating_population_norm": "유동인구(F)",
    "popup_ratio_norm": "팝업비율(G1)",
    "popup_intensity_norm": "팝업강도(G2)",
}


def score_to_color(level: str) -> str:
    if level == "데이터부족":
        return "#bdbdbd"
    if level == "상":
        return "#c0392b"
    if level == "중":
        return "#f39c12"
    return "#2e8b57"


def assign_exact_quantile_levels(scores: pd.Series) -> pd.Series:
    valid = scores.dropna().sort_values(ascending=False)
    n = len(valid)
    if n == 0:
        return pd.Series(np.nan, index=scores.index)

    top_n = int(n * 0.25)
    bottom_n = int(n * 0.25)
    middle_n = n - top_n - bottom_n

    ordered_levels = (["상"] * top_n) + (["중"] * middle_n) + (["하"] * bottom_n)
    level_map = pd.Series(ordered_levels, index=valid.index)
    return level_map.reindex(scores.index).fillna("데이터부족")


def resolve_writable_path(path: Path) -> Path:
    if not path.exists():
        return path
    try:
        with path.open("ab"):
            return path
    except PermissionError:
        stem = path.stem
        suffix = path.suffix
        for idx in range(1, 100):
            candidate = path.with_name(f"{stem}_{idx}{suffix}")
            if not candidate.exists():
                return candidate
            try:
                with candidate.open("ab"):
                    return candidate
            except PermissionError:
                continue
        raise PermissionError(f"no writable output path available for {path}")


def build_dataset():
    geo_df = load_geojson()
    population_df = load_population()
    income_df = load_income_ratio()
    flow_df = load_floating_population()
    turnover_df = load_turnover()
    op_df = load_operating_period()
    franchise_df = load_franchise_ratio()
    popup_ratio_df = load_popup_ratio()
    popup_intensity_df = load_popup_intensity()

    df = geo_df.merge(population_df, on="dong", how="left")
    df = df.merge(income_df, on="dong", how="left")
    df = df.merge(flow_df, on="dong", how="left")
    df = df.merge(turnover_df, on="dong", how="left")
    df = df.merge(op_df, on="dong", how="left")
    df = df.merge(franchise_df, on="dong", how="left")
    df = df.merge(popup_ratio_df, on="dong", how="left")
    df = df.merge(popup_intensity_df, on="dong", how="left")

    df["population_risk_norm"] = log_quantile_rank(df["population"])
    df["income_ratio_risk_norm"] = log_quantile_rank(df["income_ratio"])
    df["floating_population_risk_norm"] = log_quantile_rank(df["floating_population"])
    df["turnover_rate_risk_norm"] = quantile_rank(df["turnover_rate"])
    df["operating_period_rank_norm"] = quantile_rank(df["operating_period_10y_avg"])
    df["operating_period_risk_norm"] = 1.0 - df["operating_period_rank_norm"]
    df["franchise_ratio_risk_norm"] = quantile_rank(df["franchise_ratio"])
    df["popup_ratio_risk_norm"] = quantile_rank(df["popup_ratio"])
    df["popup_intensity_risk_norm"] = quantile_rank(df["popup_intensity"])

    df["population_intensity_norm"] = log_minmax(df["population"])
    df["income_ratio_intensity_norm"] = log_minmax(df["income_ratio"])
    df["floating_population_intensity_norm"] = log_minmax(df["floating_population"])
    df["turnover_rate_intensity_norm"] = minmax(df["turnover_rate"])
    df["operating_period_minmax_norm"] = minmax(df["operating_period_10y_avg"])
    df["operating_period_intensity_norm"] = 1.0 - df["operating_period_minmax_norm"]
    df["franchise_ratio_intensity_norm"] = minmax(df["franchise_ratio"])
    df["popup_ratio_intensity_norm"] = minmax(df["popup_ratio"])
    df["popup_intensity_intensity_norm"] = minmax(df["popup_intensity"])
    df["has_popup_formula"] = df["dong"].isin(SEONGSU_POPUP_DONGS)

    risk_weight_map = {
        "population_norm": "population_risk_norm",
        "income_ratio_norm": "income_ratio_risk_norm",
        "turnover_rate_norm": "turnover_rate_risk_norm",
        "operating_period_risk": "operating_period_risk_norm",
        "franchise_ratio_norm": "franchise_ratio_risk_norm",
        "floating_population_norm": "floating_population_risk_norm",
        "popup_ratio_norm": "popup_ratio_risk_norm",
        "popup_intensity_norm": "popup_intensity_risk_norm",
    }
    intensity_weight_map = {
        "population_norm": "population_intensity_norm",
        "income_ratio_norm": "income_ratio_intensity_norm",
        "turnover_rate_norm": "turnover_rate_intensity_norm",
        "operating_period_risk": "operating_period_intensity_norm",
        "franchise_ratio_norm": "franchise_ratio_intensity_norm",
        "floating_population_norm": "floating_population_intensity_norm",
        "popup_ratio_norm": "popup_ratio_intensity_norm",
        "popup_intensity_norm": "popup_intensity_intensity_norm",
    }

    def calc_score(row, metric_map):
        weights = POPUP_WEIGHTS if row["has_popup_formula"] else GENERAL_WEIGHTS
        return sum(row[metric_map[col]] * weight for col, weight in weights.items()) * 100

    df["risk_score"] = df.apply(calc_score, axis=1, metric_map=risk_weight_map)
    df["intensity_score"] = df.apply(calc_score, axis=1, metric_map=intensity_weight_map)
    df["risk_percentile"] = quantile_rank(df["risk_score"])
    df["intensity_percentile"] = quantile_rank(df["intensity_score"])
    df["risk_level"] = assign_exact_quantile_levels(df["risk_score"])
    df["intensity_level"] = assign_exact_quantile_levels(df["intensity_score"])
    df["color"] = df["risk_level"].map(score_to_color)

    def summarize_top_contributions(row, metric_map):
        weights = POPUP_WEIGHTS if row["has_popup_formula"] else GENERAL_WEIGHTS
        contributions = []
        for weight_key, weight in weights.items():
            metric_col = metric_map[weight_key]
            contributions.append((WEIGHT_LABELS[weight_key], row[metric_col] * weight))
        contributions.sort(key=lambda x: x[1], reverse=True)
        return contributions[:2]

    def contribution_summary(row):
        risk_top_two = summarize_top_contributions(row, risk_weight_map)
        intensity_top_two = summarize_top_contributions(row, intensity_weight_map)
        risk_top_labels = [name for name, _ in risk_top_two]
        intensity_top_labels = [name for name, _ in intensity_top_two]
        return pd.Series(
            {
                "top1_driver": risk_top_labels[0],
                "top2_driver": risk_top_labels[1],
                "top2_drivers": ", ".join(risk_top_labels),
                "intensity_top1_driver": intensity_top_labels[0],
                "intensity_top2_driver": intensity_top_labels[1],
                "intensity_top2_drivers": ", ".join(intensity_top_labels),
            }
        )

    def interpret_row(row):
        return (
            f"해당 지역은 성동구 내에서 상대적으로 높은 {row['top1_driver']}와 "
            f"{row['top2_driver']} 수준을 보여 젠트리피케이션 전조 위험이 "
            f"{row['risk_level']}으로 산출되었습니다."
        )

    df = pd.concat([df, df.apply(contribution_summary, axis=1)], axis=1)
    df["interpretation"] = df.apply(interpret_row, axis=1)
    return df.sort_values("risk_score", ascending=False).reset_index(drop=True)


def add_geom_patches(ax, geom, facecolor, edgecolor="#ffffff", linewidth=0.9):
    patches = []
    if geom.geom_type == "Polygon":
        patches.append(MplPolygon(np.asarray(geom.exterior.coords), closed=True))
    elif geom.geom_type == "MultiPolygon":
        for poly in geom.geoms:
            patches.append(MplPolygon(np.asarray(poly.exterior.coords), closed=True))

    if patches:
        collection = PatchCollection(
            patches,
            facecolor=facecolor,
            edgecolor=edgecolor,
            linewidth=linewidth,
            zorder=2,
        )
        ax.add_collection(collection)


def render_map(df: pd.DataFrame):
    configure_font()

    fig = plt.figure(figsize=(13.5, 11), dpi=220)
    ax = fig.add_axes([0.04, 0.10, 0.70, 0.84])
    side = fig.add_axes([0.77, 0.12, 0.20, 0.80])
    side.axis("off")

    for _, row in df.iterrows():
        add_geom_patches(ax, row["geometry"], row["color"])

    minx = min(geom.bounds[0] for geom in df["geometry"])
    miny = min(geom.bounds[1] for geom in df["geometry"])
    maxx = max(geom.bounds[2] for geom in df["geometry"])
    maxy = max(geom.bounds[3] for geom in df["geometry"])
    padx = (maxx - minx) * 0.05
    pady = (maxy - miny) * 0.05
    ax.set_xlim(minx - padx, maxx + padx)
    ax.set_ylim(miny - pady, maxy + pady)
    ax.set_aspect("equal")
    ax.axis("off")

    for _, row in df.iterrows():
        label_score = "N/A" if pd.isna(row["risk_score"]) else f"{row['risk_score']:.1f}"
        ax.text(
            row["centroid_x"],
            row["centroid_y"],
            f"{row['dong']}\n{label_score}",
            ha="center",
            va="center",
            fontsize=8,
            weight="bold",
            color="#1f1f1f",
            bbox={
                "boxstyle": "round,pad=0.20",
                "facecolor": "#ffffffcc",
                "edgecolor": "#666666",
                "linewidth": 0.6,
            },
            zorder=5,
        )

    fig.text(0.04, 0.965, "성동구 젠트리피케이션 위험도 지도", fontsize=22, weight="bold")
    fig.text(
        0.04,
        0.935,
        "2024년 기준 순위 기반 위험도 점수와 보조 강도 점수 동시 산출",
        fontsize=11,
        color="#555555",
    )
    fig.text(
        0.04,
        0.055,
        "사용 지표: 인구(A) · 소득(B) · 창폐업(C) · 영업기간 역지표(D) · 프랜차이즈(E) · 유동인구(F)"
        " · 팝업 비율(G1) · 팝업 강도(G2)",
        fontsize=10,
        color="#555555",
    )

    side.text(0.0, 0.98, "위험도 해석", fontsize=15, weight="bold", va="top")
    side.text(0.0, 0.92, "상: 상위 25%", fontsize=12, color="#c0392b", weight="bold")
    side.text(0.0, 0.88, "중: 중위 50%", fontsize=12, color="#f39c12", weight="bold")
    side.text(0.0, 0.84, "하: 하위 25%", fontsize=12, color="#2e8b57", weight="bold")

    side.text(0.0, 0.76, "상위 위험 지역", fontsize=15, weight="bold")
    for idx, (_, row) in enumerate(df.nlargest(10, "risk_score").iterrows(), start=1):
        side.text(
            0.0,
            0.76 - idx * 0.055,
            f"{idx}. {row['dong']}  {row['risk_score']:.1f}점  ({row['risk_level']})",
            fontsize=11,
            color="#222222",
        )

    side.text(0.0, 0.10, "산식", fontsize=15, weight="bold")
    side.text(
        0.0,
        0.02,
        "최종 점수는 분위수 정규화,\n보조 강도는 별도 Min-Max로 계산했습니다.",
        fontsize=11,
        color="#444444",
        linespacing=1.5,
    )

    output_path = resolve_writable_path(PNG_PATH)
    fig.savefig(output_path, dpi=220, bbox_inches="tight", facecolor="#f7f4ef")
    plt.close(fig)
    return output_path


def export_table(df: pd.DataFrame):
    out = df[
        [
            "dong",
            "adm_cd2",
            "risk_score",
            "risk_level",
            "intensity_score",
            "intensity_level",
            "population_risk_norm",
            "income_ratio_risk_norm",
            "turnover_rate_risk_norm",
            "operating_period_risk_norm",
            "franchise_ratio_risk_norm",
            "floating_population_risk_norm",
            "popup_ratio_risk_norm",
            "popup_intensity_risk_norm",
            "top2_drivers",
            "interpretation",
        ]
    ].copy()
    out.columns = [
        "행정동",
        "행정동코드",
        "위험도점수",
        "위험등급",
        "보조강도점수",
        "보조강도등급",
        "인구_정규화값",
        "소비성향_정규화값",
        "회전율_정규화값",
        "영업기간 역지표_정규화값",
        "프랜차이즈비율_정규화값",
        "유동인구_정규화값",
        "팝업비율_정규화값",
        "팝업강도_정규화값",
        "위험기여_TOP2",
        "해석문장",
    ]

    calc_notes = pd.DataFrame(
        {
            "항목": [
                "최종 위험도 점수",
                "보조 강도 점수",
                "성수 4개 동 공식",
                "그 외 행정동 공식",
                "정규화 규칙 1",
                "정규화 규칙 2",
                "역지표 처리",
                "등급 기준",
                "B 변수 해석",
                "행정동명 보정",
            ],
            "내용": [
                "분위수 정규화 기반 가중합 점수, 0~100 환산",
                "Min-Max 정규화 기반 가중합 점수, 0~100 환산",
                "P = 0.137A + 0.133B + 0.120C + 0.154D + 0.110E + 0.231F + 0.045G1 + 0.070G2",
                "P = 0.137A + 0.133B + 0.170C + 0.154D + 0.175E + 0.231F",
                "인구(A), 소비성향(B), 유동인구(F)는 log1p 후 분위수 정규화",
                "회전율(C), 프랜차이즈(E), 팝업비율(G1), 팝업강도(G2)는 분위수 정규화",
                "영업기간(D)은 분위수 정규화 후 1 - D로 위험 방향 통일",
                "17개 동 기준 상 4개, 중 9개, 하 4개로 정확 분할",
                "B는 소득 자체가 아니라 소비비율 기반 소비성향 프록시",
                "원자료의 성수2가2동 표기는 성수2가3동으로 통일",
            ],
        }
    )

    csv_path = resolve_writable_path(CSV_PATH)
    out.to_csv(csv_path, index=False, encoding="utf-8-sig")

    xlsx_path = resolve_writable_path(XLSX_PATH)
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        out.to_excel(writer, sheet_name="risk_scores", index=False)
        calc_notes.to_excel(writer, sheet_name="calculation_notes", index=False)

    return csv_path, xlsx_path


def export_dashboard_data(df: pd.DataFrame):
    records = []
    for _, row in df.iterrows():
        geom = row["geometry"]
        records.append(
            {
                "dong": row["dong"],
                "adm_cd2": row["adm_cd2"],
                "risk_score": round(float(row["risk_score"]), 6),
                "risk_level": row["risk_level"],
                "risk_percentile": round(float(row["risk_percentile"]), 6),
                "intensity_score": round(float(row["intensity_score"]), 6),
                "intensity_level": row["intensity_level"],
                "top2_drivers": row["top2_drivers"],
                "intensity_top2_drivers": row["intensity_top2_drivers"],
                "interpretation": row["interpretation"],
                "metrics": {
                    "인구": round(float(row["population_risk_norm"]), 6),
                    "소비성향": round(float(row["income_ratio_risk_norm"]), 6),
                    "회전율": round(float(row["turnover_rate_risk_norm"]), 6),
                    "영업기간 역지표": round(float(row["operating_period_risk_norm"]), 6),
                    "프랜차이즈비율": round(float(row["franchise_ratio_risk_norm"]), 6),
                    "유동인구": round(float(row["floating_population_risk_norm"]), 6),
                    "팝업비율": None if pd.isna(row["popup_ratio_risk_norm"]) else round(float(row["popup_ratio_risk_norm"]), 6),
                    "팝업강도": None if pd.isna(row["popup_intensity_risk_norm"]) else round(float(row["popup_intensity_risk_norm"]), 6),
                },
                "intensity_metrics": {
                    "인구": round(float(row["population_intensity_norm"]), 6),
                    "소비성향": round(float(row["income_ratio_intensity_norm"]), 6),
                    "회전율": round(float(row["turnover_rate_intensity_norm"]), 6),
                    "영업기간 역지표": round(float(row["operating_period_intensity_norm"]), 6),
                    "프랜차이즈비율": round(float(row["franchise_ratio_intensity_norm"]), 6),
                    "유동인구": round(float(row["floating_population_intensity_norm"]), 6),
                    "팝업비율": None if pd.isna(row["popup_ratio_intensity_norm"]) else round(float(row["popup_ratio_intensity_norm"]), 6),
                    "팝업강도": None if pd.isna(row["popup_intensity_intensity_norm"]) else round(float(row["popup_intensity_intensity_norm"]), 6),
                },
                "raw": {
                    "population": round(float(row["population"]), 3),
                    "income_ratio": round(float(row["income_ratio"]), 6),
                    "turnover_rate": round(float(row["turnover_rate"]), 6),
                    "operating_period_10y_avg": round(float(row["operating_period_10y_avg"]), 6),
                    "franchise_ratio": round(float(row["franchise_ratio"]), 6),
                    "floating_population": round(float(row["floating_population"]), 3),
                    "popup_ratio": None if pd.isna(row["popup_ratio"]) else round(float(row["popup_ratio"]), 6),
                    "popup_intensity": None if pd.isna(row["popup_intensity"]) else round(float(row["popup_intensity"]), 6),
                },
                "centroid": [round(float(row["centroid_x"]), 6), round(float(row["centroid_y"]), 6)],
                "geometry": geom.__geo_interface__,
            }
        )

    payload = {
        "generated_from": "generate_risk_map.py",
        "district_count": len(records),
        "map_image": "seongdong_gentrification_risk_map.png",
        "legend": {
            "상": "상위 25%",
            "중": "중위 50%",
            "하": "하위 25%",
        },
        "weights": {
            "popup_dongs": POPUP_WEIGHTS,
            "general_dongs": GENERAL_WEIGHTS,
        },
        "records": records,
    }

    output_path = resolve_writable_path(DASHBOARD_JS_PATH)
    with output_path.open("w", encoding="utf-8") as f:
        f.write("window.SEONGDONG_DASHBOARD_DATA = ")
        json.dump(payload, f, ensure_ascii=False)
        f.write(";")
    return output_path


def main():
    df = build_dataset()
    saved_csv, saved_xlsx = export_table(df)
    saved_dashboard_js = export_dashboard_data(df)
    saved_png = render_map(df)
    print(f"saved_png={saved_png}")
    print(f"saved_csv={saved_csv}")
    print(f"saved_xlsx={saved_xlsx}")
    print(f"saved_dashboard_js={saved_dashboard_js}")
    print(df[["dong", "risk_score", "risk_level"]].to_string(index=False))


if __name__ == "__main__":
    main()
