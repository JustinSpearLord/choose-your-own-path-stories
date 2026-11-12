"""Draws the app icons (a pixel lantern) into public/icons/. Run: python tools/make_icons.py"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "icons")
LANTERN = [
    (5, 0, 2, 2, "#3A3346"), (3, 2, 6, 1, "#6B5A45"), (2, 3, 8, 1, "#6B5A45"),
    (3, 4, 6, 5, "#E8B44C"), (4, 5, 2, 2, "#F3E3B0"), (2, 9, 8, 1, "#6B5A45"), (3, 10, 6, 1, "#4A3D2F"),
]


def icon(size, pad, path):
    cells = 12 + pad * 2
    img = Image.new("RGB", (cells, cells), "#15131C")
    d = ImageDraw.Draw(img)
    for x, y, w, h, col in LANTERN:
        d.rectangle([x + pad, y + pad, x + pad + w - 1, y + pad + h - 1], fill=col)
    img.resize((size, size), Image.NEAREST).save(path, optimize=True)


os.makedirs(OUT, exist_ok=True)
icon(192, 2, os.path.join(OUT, "icon-192.png"))
icon(512, 2, os.path.join(OUT, "icon-512.png"))
icon(512, 5, os.path.join(OUT, "maskable-512.png"))
icon(180, 3, os.path.join(OUT, "apple-touch-icon.png"))
rects = "".join(f'<rect x="{x + 2}" y="{y + 2}" width="{w}" height="{h}" fill="{c}"/>' for x, y, w, h, c in LANTERN)
with open(os.path.join(OUT, "favicon.svg"), "w") as f:
    f.write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
        f'<rect width="16" height="16" fill="#15131C"/>{rects}</svg>\n'
    )
print("icons written")
