import csv
import io
import json
from pathlib import Path

from pyproj import CRS, Transformer
import shapefile


ROOT = Path(__file__).resolve().parent
GRID_CSV = ROOT / "성동구 격자 최종(2).csv"
SIG_SHP = ROOT / "시군구" / "sig.shp"
ADM_GEOJSON = ROOT / "HangJeongDong_ver20241001.geojson"
DASHBOARD_DATA = ROOT / "outputs" / "dashboard_data.js"
OUTPUT_JS = ROOT / "outputs" / "micro_map_data.js"

SOURCE_CRS = CRS.from_proj4(
    "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs"
)
TO_WGS84 = Transformer.from_crs(SOURCE_CRS, 4326, always_xy=True)


def project_point(x, y):
    lon, lat = TO_WGS84.transform(x, y)
    return [round(lat, 7), round(lon, 7)]


def read_grid_rows():
    text = GRID_CSV.read_bytes().decode("cp949")
    return list(csv.DictReader(io.StringIO(text)))


def normalize_dong_name(name):
    return (
        name.replace(" ", "")
        .replace("제", "")
        .replace("금호2.3가동", "금호2·3가동")
        .replace("금호2ㆍ3가동", "금호2·3가동")
        .replace("금호2?3가동", "금호2·3가동")
        .replace("성수2가2동", "성수2가3동")
    )


def load_dong_boundaries():
    obj = json.loads(ADM_GEOJSON.read_text(encoding="utf-8"))
    boundaries = []
    for feature in obj["features"]:
        props = feature["properties"]
        if props.get("sggnm") != "성동구":
            continue
        geom = feature["geometry"]
        coords = geom["coordinates"]
        polygons = coords if geom["type"] == "MultiPolygon" else [coords]
        boundaries.append(
            {
                "dong": normalize_dong_name(props["adm_nm"].split()[-1]),
                "polygons": polygons,
                "centroid": polygon_centroid(polygons[0][0]),
            }
        )
    return boundaries


def polygon_centroid(ring):
    if not ring:
        return [0, 0]
    x_sum = sum(point[0] for point in ring)
    y_sum = sum(point[1] for point in ring)
    count = len(ring)
    return [x_sum / count, y_sum / count]


def point_in_ring(point, ring):
    x, y = point
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def point_in_polygon(point, polygon):
    if not polygon:
        return False
    if not point_in_ring(point, polygon[0]):
        return False
    for hole in polygon[1:]:
        if point_in_ring(point, hole):
            return False
    return True


def find_dong_for_point(point, boundaries):
    for item in boundaries:
        for polygon in item["polygons"]:
            if point_in_polygon(point, polygon):
                return item["dong"]
    nearest = min(
        boundaries,
        key=lambda item: (item["centroid"][0] - point[0]) ** 2 + (item["centroid"][1] - point[1]) ** 2,
    )
    return nearest["dong"]


def quantile(sorted_values, q):
    index = min(len(sorted_values) - 1, int(len(sorted_values) * q))
    return sorted_values[index]


def to_float(value, fallback=0.0):
    if value in (None, ""):
        return fallback
    return float(value)


def to_int(value, fallback=0):
    if value in (None, ""):
        return fallback
    return int(float(value))


def classify_micro_risk(w_value):
    if w_value <= 0.3:
        return "저위험"
    if w_value >= 0.7:
        return "고위험"
    return "중위험"


def classify_grid_risk(score, low_cut, high_cut):
    if score >= high_cut:
        return "상"
    if score >= low_cut:
        return "중"
    return "하"


def load_dong_risk_scores():
    text = DASHBOARD_DATA.read_text(encoding="utf-8")
    payload = json.loads(text.split("=", 1)[1].strip().rstrip(";"))
    return {record["dong"]: float(record["risk_score"]) for record in payload["records"]}


def build_grid_data(rows):
    dong_boundaries = load_dong_boundaries()
    dong_risk_scores = load_dong_risk_scores()

    grid_items = []
    lats = []
    lons = []
    for row in rows:
        left = float(row["left"])
        right = float(row["right"])
        top = float(row["top"])
        bottom = float(row["bottom"])

        south_west = project_point(left, bottom)
        north_east = project_point(right, top)
        center = project_point((left + right) / 2, (top + bottom) / 2)
        w_value = round(to_float(row["최종지수"]), 3)
        s_value = round(to_float(row["상가밀도점수"]), 3)
        p_value = round(to_float(row["팝업 점수"]), 3)
        r_sub_value = round(to_float(row["역 점수"]), 3)
        r_road_value = round(to_float(row["대로변 점수"]), 3)
        station_distance = round(to_float(row.get("역 거리")), 1)
        road_distance = round(to_float(row.get("대로변 거리")), 1)
        store_count = to_int(row.get("상가수"))
        popup_days = to_int(row.get("일수_sum"))
        risk_level = classify_micro_risk(w_value)
        dong = find_dong_for_point([center[1], center[0]], dong_boundaries)

        grid_items.append(
            {
                "id": to_int(row["id"]),
                "row_index": to_int(row.get("row_index")),
                "col_index": to_int(row.get("col_index")),
                "bounds": [south_west, north_east],
                "center": center,
                "dong": dong,
                "W": w_value,
                "S": s_value,
                "P": p_value,
                "R_sub": r_sub_value,
                "R_road": r_road_value,
                "weight_level": risk_level,
                "station_name": row.get("역명") or "-",
                "station_distance_m": station_distance,
                "road_id": row.get("대로변") or "-",
                "road_distance_m": road_distance,
                "store_count": store_count,
                "popup_days_sum": popup_days,
            }
        )

        lats.extend([south_west[0], north_east[0]])
        lons.extend([south_west[1], north_east[1]])

    dong_weight_sums = {}
    for item in grid_items:
        dong_weight_sums[item["dong"]] = dong_weight_sums.get(item["dong"], 0.0) + item["W"]

    for item in grid_items:
        dong = item["dong"]
        dong_risk = dong_risk_scores.get(dong, 0.0)
        dong_weight_sum = dong_weight_sums.get(dong, 0.0)
        weight_share = item["W"] / dong_weight_sum if dong_weight_sum else 0.0
        item["dong_risk_score"] = round(dong_risk, 3)
        item["dong_weight_sum"] = round(dong_weight_sum, 6)
        item["grid_weight_share"] = round(weight_share, 6)
        item["grid_risk_score"] = round(dong_risk * weight_share, 6)

    grid_risk_values = sorted(item["grid_risk_score"] for item in grid_items)
    low_cut = quantile(grid_risk_values, 0.33)
    high_cut = quantile(grid_risk_values, 0.66)
    for item in grid_items:
        item["grid_risk_level"] = classify_grid_risk(item["grid_risk_score"], low_cut, high_cut)

    bounds = [[min(lats), min(lons)], [max(lats), max(lons)]]
    return grid_items, bounds


def bbox_intersects(a, b):
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def shape_to_latlng_rings(shape):
    rings = []
    parts = list(shape.parts) + [len(shape.points)]
    for start, end in zip(parts, parts[1:]):
        points = shape.points[start:end]
        if len(points) < 3:
            continue
        ring = [project_point(x, y) for x, y in points]
        rings.append(ring)
    return rings


def build_boundary_data(grid_bounds):
    reader = shapefile.Reader(str(SIG_SHP), encoding="cp949")
    min_lat, min_lon = grid_bounds[0]
    max_lat, max_lon = grid_bounds[1]
    pad_lon = (max_lon - min_lon) * 0.28
    pad_lat = (max_lat - min_lat) * 0.28
    expanded = [min_lon - pad_lon, min_lat - pad_lat, max_lon + pad_lon, max_lat + pad_lat]

    nearby = []
    seongdong = None

    for shape_record in reader.iterShapeRecords():
        record = shape_record.record.as_dict()
        if record["SIG_CD"][:2] != "11":
            continue
        shape = shape_record.shape
        lon_min, lat_min = project_point(shape.bbox[0], shape.bbox[1])[1], project_point(shape.bbox[0], shape.bbox[1])[0]
        lon_max, lat_max = project_point(shape.bbox[2], shape.bbox[3])[1], project_point(shape.bbox[2], shape.bbox[3])[0]
        if not bbox_intersects([lon_min, lat_min, lon_max, lat_max], expanded):
            continue
        item = {
            "name": record["SIG_KOR_NM"],
            "code": record["SIG_CD"],
            "rings": shape_to_latlng_rings(shape),
        }
        if record["SIG_CD"] == "11200":
            seongdong = item
        else:
            nearby.append(item)

    return seongdong, nearby


def main():
    rows = read_grid_rows()
    grid_items, bounds = build_grid_data(rows)
    seongdong, nearby = build_boundary_data(bounds)
    payload = {
        "bounds": bounds,
        "gridCells": grid_items,
        "seongdongBoundary": seongdong,
        "nearbyBoundaries": nearby,
    }
    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JS.write_text(
        "window.SEONGDONG_MICRO_MAP_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
