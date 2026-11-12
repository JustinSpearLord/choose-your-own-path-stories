"""Reference: how the sample's pixel art and lantern_road.quest.zip were made.

Run: python3 tools/make_package.py  (writes to tools/out/; samples/ is not touched)
The rect-list approach here is the suggested way to draw the 28 built-in scenes.
"""
import json
import os
import zipfile

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
OUT_IMG = os.path.join(OUT, "images")


def hexrgb(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def draw(w, h, rects, scale, path):
    """rects: (x, y, w, h, color[, alpha]) drawn in order on a w*h grid, then scaled with no smoothing."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for r in rects:
        x, y, rw, rh, col = r[:5]
        alpha = r[5] if len(r) > 5 else 255
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rectangle([x, y, x + rw - 1, y + rh - 1], fill=hexrgb(col, alpha))
        img = Image.alpha_composite(img, layer)
    img = img.resize((w * scale, h * scale), Image.NEAREST)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


STARS = [(9, 3), (22, 6), (44, 2), (58, 5), (30, 4), (15, 9)]

# Scene art: 64x36 grid -> 320x180 (16:9).
COVER = [
    (0, 0, 64, 36, "#2A2342"), (0, 12, 64, 8, "#3A2E55"), (0, 20, 64, 6, "#4D3A63"),
    (48, 5, 5, 5, "#F3E3B0"), (49, 4, 3, 7, "#F3E3B0"),
    *[(x, y, 1, 1, "#EDE8F5") for x, y in STARS],
    (0, 20, 10, 16, "#2B2440"), (6, 17, 8, 19, "#2B2440"), (12, 14, 6, 22, "#2B2440"),
    (18, 18, 10, 18, "#2B2440"), (32, 19, 12, 17, "#2B2440"), (42, 15, 8, 21, "#2B2440"),
    (50, 18, 14, 18, "#2B2440"), (0, 26, 64, 10, "#1B1726"),
    (32, 26, 2, 2, "#6B5A45"), (31, 28, 4, 2, "#6B5A45"), (30, 30, 6, 2, "#6B5A45"),
    (29, 32, 8, 2, "#6B5A45"), (28, 34, 10, 2, "#6B5A45"),
    # lit lantern near, dark ones further down the road
    (37, 18, 7, 7, "#E8B44C", 56), (40, 22, 1, 8, "#0E0C14"), (39, 20, 3, 3, "#E8B44C"),
    (24, 23, 1, 5, "#0E0C14"), (23, 22, 3, 2, "#3A3346"),
    (17, 27, 1, 4, "#0E0C14"), (16, 26, 3, 2, "#3A3346"),
]

FERRY = [
    (0, 0, 64, 36, "#2A2342"), (0, 10, 64, 6, "#3A2E55"), (0, 16, 64, 5, "#4D3A63"),
    *[(x, y, 1, 1, "#EDE8F5") for x, y in STARS],
    (0, 18, 14, 3, "#1B1726"), (46, 15, 18, 2, "#1B1726"), (40, 17, 24, 4, "#1B1726"),
    (54, 10, 1, 7, "#0E0C14"), (53, 8, 3, 3, "#3A3346"),
    (0, 21, 64, 15, "#22304A"), (0, 19, 64, 3, "#EDE8F5", 26),
    (4, 24, 6, 1, "#3E5478"), (44, 27, 8, 1, "#3E5478"), (8, 31, 10, 1, "#3E5478"),
    (50, 33, 6, 1, "#3E5478"), (30, 34, 8, 1, "#3E5478"),
    (19, 21, 6, 6, "#E8B44C", 51), (38, 12, 1, 17, "#8A6E4E"),
    (24, 19, 3, 7, "#0E0C14"), (33, 18, 3, 8, "#0E0C14"), (21, 23, 2, 2, "#E8B44C"),
    (18, 26, 24, 3, "#6B5A45"), (20, 29, 20, 1, "#4A3D2F"),
]

REEDS = [
    (0, 0, 64, 36, "#1F1B33"), (0, 8, 64, 8, "#2A2342"),
    *[(x, y, 1, 1, "#C9C2D8") for x, y in STARS],
    (0, 14, 64, 6, "#1B1726"), (28, 9, 1, 7, "#0E0C14"), (27, 8, 3, 2, "#3A3346"),
    (0, 20, 64, 16, "#1C2A40"),
    # glow under the water where the oil is poured
    (22, 22, 20, 6, "#9FD8C8", 40), (26, 23, 12, 4, "#9FD8C8", 70), (30, 24, 4, 2, "#CFF3E8"),
    # the grey figure at the water's edge
    (31, 14, 3, 7, "#7E7A86"), (31, 12, 3, 2, "#7E7A86"), (34, 17, 2, 1, "#6B5A45"),
    # reeds in the foreground
    *[(x, 18 + (x * 7) % 9, 1, 18 - (x * 7) % 9, "#2F4A3A") for x in range(0, 64, 2) if x < 18 or x > 46],
    *[(x, 22 + (x * 5) % 7, 1, 14, "#3D5E48") for x in range(1, 64, 3) if x < 16 or x > 48],
    (6, 30, 14, 3, "#4A3D2F"), (8, 29, 10, 1, "#6B5A45"),
]

BELL = [
    (0, 0, 64, 36, "#3A2E55"), (0, 0, 64, 10, "#4D3A63"), (0, 10, 64, 10, "#5E4870"),
    (0, 26, 64, 10, "#E8B44C", 60), (0, 30, 64, 6, "#F3CD7A", 90),
    (26, 4, 12, 28, "#1B1726"), (24, 2, 16, 3, "#1B1726"), (31, 0, 2, 2, "#1B1726"),
    (29, 8, 6, 6, "#0E0C14"), (30, 9, 4, 4, "#8A6E4E"), (31, 13, 2, 1, "#8A6E4E"),
    (0, 28, 22, 8, "#22304A"), (42, 28, 22, 8, "#22304A"), (22, 31, 20, 5, "#22304A"),
    *[(x, 27, 1, 2, "#C9C2D8") for x in (4, 8, 12, 16, 46, 50, 54, 58)],
]

# Portraits: 12x12 grid -> 48x48.
WREN = [
    (0, 0, 12, 12, "#2A2342"),
    (3, 1, 6, 2, "#3F7D5C"), (2, 2, 8, 2, "#3F7D5C"), (1, 4, 2, 8, "#3F7D5C"), (9, 4, 2, 8, "#3F7D5C"),
    (3, 4, 6, 6, "#E7B98F"), (4, 6, 1, 1, "#15131C"), (7, 6, 1, 1, "#15131C"),
    (5, 8, 2, 1, "#A0624A"), (3, 10, 6, 2, "#2F5E45"), (3, 4, 6, 1, "#7A4A2E"),
]
MADDOX = [
    (0, 0, 12, 12, "#2A2342"),
    (3, 1, 6, 3, "#8A8494"), (2, 3, 1, 4, "#8A8494"), (9, 3, 1, 4, "#8A8494"),
    (3, 3, 6, 5, "#D9A47E"), (4, 4, 1, 1, "#15131C"), (7, 4, 1, 1, "#15131C"),
    (3, 6, 6, 4, "#C9C4D1"), (5, 7, 2, 1, "#8A8494"), (2, 10, 8, 2, "#5A4A3A"),
]
ABBESS = [
    (0, 0, 12, 12, "#2A2342"),
    (3, 0, 6, 2, "#6E6A76"), (2, 1, 8, 3, "#6E6A76"), (1, 3, 2, 9, "#6E6A76"), (9, 3, 2, 9, "#6E6A76"),
    (3, 3, 6, 6, "#E6D9CF"), (4, 5, 1, 1, "#15131C"), (7, 5, 1, 1, "#15131C"),
    (5, 7, 2, 1, "#9C4A5A"), (3, 9, 6, 3, "#9C4A5A"), (4, 10, 1, 1, "#B9B3C2"), (7, 11, 1, 1, "#B9B3C2"),
]

ART = {
    "cover.png": (64, 36, COVER, 5),
    "ferry.png": (64, 36, FERRY, 5),
    "reeds.png": (64, 36, REEDS, 5),
    "bell.png": (64, 36, BELL, 5),
    "portraits/wren.png": (12, 12, WREN, 4),
    "portraits/maddox.png": (12, 12, MADDOX, 4),
    "portraits/abbess.png": (12, 12, ABBESS, 4),
}

if __name__ == "__main__":
    for name, (w, h, rects, s) in ART.items():
        draw(w, h, rects, s, os.path.join(OUT_IMG, name))

    story = json.load(open(os.path.join(HERE, "..", "samples", "lantern_road.quest.json"), encoding="utf-8"))
    story["version"] = "1.1"
    story["cover"] = "images/cover.png"
    story["imageStyle"] = "pixel"
    story["scenes"]["road"]["art"] = "images/cover.png"
    story["scenes"]["ferry"]["art"] = "images/ferry.png"
    story["scenes"]["ferry-truth"]["art"] = "images/ferry.png"
    story["scenes"]["reeds"]["art"] = "images/reeds.png"
    story["scenes"]["end-silent"]["art"] = "images/reeds.png"
    story["scenes"]["end-bell"]["art"] = "images/bell.png"
    for c in story["characters"]:
        c["portrait"] = f"images/portraits/{c['id']}.png"

    zpath = os.path.join(OUT, "lantern_road.quest.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("story.json", json.dumps(story, indent=2, ensure_ascii=False))
        for name in ART:
            z.write(os.path.join(OUT_IMG, name), f"images/{name}")
    print("wrote", zpath, os.path.getsize(zpath), "bytes")
