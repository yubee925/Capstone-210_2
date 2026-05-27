import csv
import io
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.collections import PatchCollection
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.patches import Polygon as MplPolygon
import shapefile


ROOT = Path(__file__).resolve().parent
GRID_CSV = ROOT / "성동구 격자 최종(2).csv"
SIG_SHP = ROOT / "시군구" / "sig.shp"
OUTPUT = ROOT / "outputs" / "seongdong_grid_risk_map.png"


def load_grid_rows():
    text = GRID_CSV.read_bytes().decode("cp949")
    return list(csv.DictReader(io.StringIO(text)))


def build_grid_patches(rows):
    grid_patches = []
    grid_values = []
    bounds = [
        min(float(row["left"]) for row in rows),
        min(float(row["bottom"]) for row in rows),
        max(float(row["right"]) for row in rows),
        max(float(row["top"]) for row in rows),
    ]

    for row in rows:
        left = float(row["left"])
        right = float(row["right"])
        top = float(row["top"])
        bottom = float(row["bottom"])
        patch = MplPolygon(
            [(left, bottom), (right, bottom), (right, top), (left, top)],
            closed=True,
        )
        grid_patches.append(patch)
        grid_values.append(float(row["최종지수"]))
    return grid_patches, grid_values, bounds


def bbox_intersects(a, b):
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def load_boundary_patches(target_bbox):
    reader = shapefile.Reader(str(SIG_SHP), encoding="cp949")
    seongdong = None
    nearby = []

    pad_x = (target_bbox[2] - target_bbox[0]) * 0.28
    pad_y = (target_bbox[3] - target_bbox[1]) * 0.28
    expanded = [
        target_bbox[0] - pad_x,
        target_bbox[1] - pad_y,
        target_bbox[2] + pad_x,
        target_bbox[3] + pad_y,
    ]

    for shape_record in reader.iterShapeRecords():
        record = shape_record.record.as_dict()
        if record["SIG_CD"][:2] != "11":
            continue
        shape = shape_record.shape
        if not bbox_intersects(shape.bbox, expanded):
            continue
        patches = shape_to_patches(shape)
        item = {"name": record["SIG_KOR_NM"], "patches": patches}
        if record["SIG_CD"] == "11200":
            seongdong = item
        else:
            nearby.append(item)

    return seongdong, nearby, expanded


def shape_to_patches(shape):
    patches = []
    parts = list(shape.parts) + [len(shape.points)]
    for start, end in zip(parts, parts[1:]):
        points = shape.points[start:end]
        if len(points) >= 3:
            patches.append(MplPolygon(points, closed=True))
    return patches


def render():
    rows = load_grid_rows()
    grid_patches, grid_values, bbox = build_grid_patches(rows)
    seongdong, nearby, expanded = load_boundary_patches(bbox)
    if seongdong is None:
        raise RuntimeError("성동구 경계를 찾지 못했습니다.")

    cmap = LinearSegmentedColormap.from_list("risk", ["#2f7a54", "#d88c1f", "#bb3f2a"])
    norm = Normalize(vmin=min(grid_values), vmax=max(grid_values))

    fig, ax = plt.subplots(figsize=(9.6, 9.2), dpi=220)
    fig.patch.set_facecolor("#f8f5ef")
    ax.set_facecolor("#f8f5ef")

    for district in nearby:
        collection = PatchCollection(
            district["patches"],
            facecolor="#ebe6db",
            edgecolor="#a9a18f",
            linewidth=1.1,
            zorder=1,
        )
        ax.add_collection(collection)

    grid_collection = PatchCollection(
        grid_patches,
        cmap=cmap,
        norm=norm,
        edgecolor=(1, 1, 1, 0.16),
        linewidth=0.12,
        zorder=2,
    )
    grid_collection.set_array(grid_values)
    ax.add_collection(grid_collection)

    seongdong_collection = PatchCollection(
        seongdong["patches"],
        facecolor="none",
        edgecolor="#163129",
        linewidth=2.2,
        zorder=3,
    )
    ax.add_collection(seongdong_collection)

    ax.set_xlim(expanded[0], expanded[2])
    ax.set_ylim(expanded[1], expanded[3])
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)

    cbar = fig.colorbar(grid_collection, ax=ax, fraction=0.038, pad=0.02)
    cbar.outline.set_visible(False)
    cbar.ax.tick_params(labelsize=9, colors="#314138")
    cbar.set_label("Composite Risk Index W", color="#314138", fontsize=10)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fig.subplots_adjust(left=0.02, right=0.9, top=0.98, bottom=0.02)
    fig.savefig(OUTPUT, facecolor=fig.get_facecolor(), bbox_inches="tight")


if __name__ == "__main__":
    render()
