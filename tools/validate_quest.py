"""Validate a Quest Journal story (format quest/1): a .quest.json file or a .quest.zip package.

Usage: python3 validate_quest.py story.quest.json other.quest.zip ...
Runs the same checks as the app's Import screen. Image checks need Pillow (pip install pillow).
"""
import io
import json
import posixpath
import re
import sys
import zipfile

ART = {
    "forest", "forest_night", "road", "road_dusk", "mountain_pass", "field", "camp",
    "river", "river_dusk", "marsh", "harbor", "sea_storm",
    "village", "village_night", "market", "tavern", "house_interior",
    "ruins", "abbey", "bell_tower", "crypt", "cave", "dungeon",
    "castle_gate", "castle_hall", "library", "throne_room", "default",
}
ID_RE = re.compile(r"^[a-z][a-z0-9_-]{0,39}$")
MB = 1024 * 1024


def load(path):
    """Return (story_bytes, images{path: bytes}, is_package, errors)."""
    errors, images = [], {}
    if not zipfile.is_zipfile(path):
        raw = open(path, "rb").read()
        if len(raw) > 2 * MB:
            errors.append("a .quest.json must be under 2 MB")
        return raw, images, False, errors

    import os
    if os.path.getsize(path) > 20 * MB:
        errors.append("a .quest.zip must be under 20 MB")
    story = None
    with zipfile.ZipFile(path) as z:
        for info in z.infolist():
            name = info.filename
            norm = posixpath.normpath(name)
            if name.startswith("/") or name.startswith("\\") or norm.startswith("..") or ":" in name.split("/")[0]:
                errors.append(f"unsafe path in package: {name!r}")
                continue
            if info.is_dir():
                continue
            if name == "story.json":
                story = z.read(info)
            elif name.startswith("images/") and name.lower().endswith((".png", ".webp")):
                images[name] = z.read(info)
            # anything else is ignored, as in the app
    if story is None:
        errors.append("package has no story.json at the top level")
    if len(images) > 200:
        errors.append(f"package has {len(images)} images, the limit is 200")
    return story, images, True, errors


def check_image(name, data):
    """Return (errors, size or None)."""
    if len(data) > MB:
        return [f"image {name!r} is over 1 MB"], None
    try:
        from PIL import Image
    except ImportError:
        return [], None
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))
        if img.format not in ("PNG", "WEBP"):
            return [f"image {name!r} is {img.format}, not PNG or WebP"], None
        return [], img.size
    except Exception:  # noqa: BLE001
        return [f"image {name!r} can't be read as an image"], None


PRESETS = {
    "dusk": {"background": "#15131C", "panel": "#201D29", "text": "#EDE8F5", "accent": "#E8B44C"},
    "tide": {"background": "#0F1E24", "panel": "#17303A", "text": "#E3F1F0", "accent": "#5CC8B4"},
    "ember": {"background": "#1E1110", "panel": "#2E1A17", "text": "#F5E6DC", "accent": "#E2725B"},
    "moss": {"background": "#141A12", "panel": "#1F2A1C", "text": "#E6EEDC", "accent": "#A8C66C"},
    "parchment": {"background": "#F2E8D5", "panel": "#E6D8BC", "text": "#2B2118", "accent": "#8A4B2A"},
    "frost": {"background": "#EEF2F6", "panel": "#DCE4EC", "text": "#1B2430", "accent": "#3D6FB0"},
}
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def contrast(a, b):
    def lum(h):
        c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    x, y = lum(a), lum(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)


def check_theme(theme, warnings):
    """Theme problems never block an import; they are all warnings."""
    if theme is None:
        return
    if not isinstance(theme, dict):
        warnings.append("theme must be an object, ignored")
        return
    preset = theme.get("preset", "dusk")
    if preset not in PRESETS:
        warnings.append(f"theme: unknown preset {preset!r}, using dusk")
        preset = "dusk"
    colors = dict(PRESETS[preset])
    for key, value in (theme.get("colors") or {}).items():
        if key not in colors:
            warnings.append(f"theme: unknown color {key!r}, ignored")
        elif not isinstance(value, str) or not HEX_RE.match(value):
            warnings.append(f"theme: {key} {value!r} is not #RRGGBB, ignored")
        else:
            colors[key] = value
    if theme.get("font", "serif") not in ("serif", "sans", "pixel"):
        warnings.append(f"theme: unknown font {theme.get('font')!r}, using serif")
    t = contrast(colors["text"], colors["background"])
    if t < 4.5:
        warnings.append(f"theme: text on background is {t:.1f}:1, the app will adjust text to 4.5:1")
    a = contrast(colors["accent"], colors["background"])
    if a < 3:
        warnings.append(f"theme: accent on background is {a:.1f}:1, names and highlights will be faint")


def validate(path):
    raw, images, is_pkg, errors = load(path)
    warnings = []
    if raw is None:
        return errors, warnings, 0, 0
    try:
        story = json.loads(raw.decode("utf-8"))
    except Exception as e:  # noqa: BLE001
        return errors + [f"not valid JSON: {e}"], warnings, 0, 0

    sizes = {}
    for name, data in images.items():
        errs, size = check_image(name, data)
        errors += errs
        if size:
            sizes[name] = size
    used = set()

    def check_art(value, where, kind):
        """kind: 'scene' or 'portrait'."""
        if value is None:
            return
        if isinstance(value, str) and value.startswith("images/"):
            if not is_pkg:
                warnings.append(f"{where}: {value!r} is an image path, but a .quest.json can't carry images")
                return
            if value not in images:
                lower = {k.lower(): k for k in images}
                hint = f" (did you mean {lower[value.lower()]!r}? case must match)" if value.lower() in lower else ""
                warnings.append(f"{where}: image {value!r} is not in the package{hint}")
                return
            used.add(value)
            if value in sizes:
                w, h = sizes[value]
                ratio = w / h
                if kind == "scene" and not 1.6 <= ratio <= 1.95:
                    warnings.append(f"{where}: {value!r} is {w}x{h}, not about 16:9, it will be cropped")
                if kind == "portrait" and not 0.9 <= ratio <= 1.1:
                    warnings.append(f"{where}: {value!r} is {w}x{h}, not square, it will be cropped")
        elif kind == "portrait":
            warnings.append(f"{where}: portrait must be a bundled image path")
        elif value not in ART:
            warnings.append(f"{where}: unknown art {value!r}, will show default")

    if story.get("format") != "quest/1":
        errors.append('format must be "quest/1"')
    for key in ("id", "title", "author", "start", "scenes"):
        if key not in story:
            errors.append(f"missing {key}")
    if "id" in story and not ID_RE.match(str(story["id"])):
        errors.append(f"bad story id {story['id']!r}")
    if story.get("imageStyle", "pixel") not in ("pixel", "smooth"):
        errors.append('imageStyle must be "pixel" or "smooth"')
    check_art(story.get("cover"), "cover", "scene")
    check_theme(story.get("theme"), warnings)

    chars = {}
    for c in story.get("characters", []):
        if "id" not in c or "name" not in c:
            errors.append(f"character missing id or name: {c}")
            continue
        if not ID_RE.match(c["id"]):
            errors.append(f"bad character id {c['id']!r}")
        chars[c["id"]] = c
        check_art(c.get("portrait"), f"character {c['id']!r}", "portrait")
    if len(chars) > 30:
        errors.append("more than 30 characters")

    scenes = story.get("scenes", {})
    if len(scenes) > 500:
        errors.append("more than 500 scenes")
    if story.get("start") not in scenes:
        errors.append(f"start {story.get('start')!r} is not a scene")

    endings = set()
    for sid, s in scenes.items():
        where = f"scene {sid!r}"
        if not ID_RE.match(sid):
            errors.append(f"{where}: bad id")
        text = s.get("text")
        if not isinstance(text, list) or not text:
            errors.append(f"{where}: needs at least one passage")
            text = []
        for i, p in enumerate(text):
            if isinstance(p, str):
                body = p
            elif isinstance(p, dict) and "speaker" in p and "line" in p:
                body = p["line"]
                if p["speaker"] not in chars:
                    errors.append(f"{where} passage {i}: unknown speaker {p['speaker']!r}")
            else:
                errors.append(f"{where} passage {i}: must be a string or {{speaker, line}}")
                continue
            if len(body) > 600:
                warnings.append(f"{where} passage {i}: over 600 characters")
        has_choices, has_ending = "choices" in s, "ending" in s
        if has_choices == has_ending:
            errors.append(f"{where}: needs either choices or an ending, not {'both' if has_choices else 'neither'}")
        if has_choices:
            ch = s["choices"]
            if not 2 <= len(ch) <= 3:
                errors.append(f"{where}: has {len(ch)} choices, needs 2 or 3")
            for c in ch:
                if not c.get("text"):
                    errors.append(f"{where}: a choice has no text")
                if c.get("to") not in scenes:
                    errors.append(f"{where}: choice {c.get('text')!r} points to missing scene {c.get('to')!r}")
        if has_ending:
            endings.add(sid)
            e = s["ending"]
            if not e.get("title"):
                errors.append(f"{where}: ending needs a title")
            if e.get("tone", "neutral") not in ("good", "bad", "neutral"):
                errors.append(f"{where}: ending tone must be good, bad or neutral")
        check_art(s.get("art"), where, "scene")
    if not endings:
        errors.append("no ending scenes")

    for name in sorted(set(images) - used):
        warnings.append(f"image {name!r} is never used")

    def nexts(sid):
        return [c["to"] for c in scenes.get(sid, {}).get("choices", []) if c.get("to") in scenes]

    reach, todo = set(), [story.get("start")] if story.get("start") in scenes else []
    while todo:
        sid = todo.pop()
        if sid not in reach:
            reach.add(sid)
            todo.extend(nexts(sid))
    for sid in scenes:
        if sid not in reach:
            warnings.append(f"scene {sid!r} is unreachable from start")

    can_end, changed = set(endings), True
    while changed:
        changed = False
        for sid in scenes:
            if sid not in can_end and any(n in can_end for n in nexts(sid)):
                can_end.add(sid)
                changed = True
    for sid in scenes:
        if sid not in can_end:
            warnings.append(f"scene {sid!r} can never reach an ending")

    return errors, warnings, len(scenes), len(endings), len(images)


if __name__ == "__main__":
    failed = False
    for path in sys.argv[1:]:
        result = validate(path)
        errors, warnings = result[0], result[1]
        failed |= bool(errors)
        extra = f", {result[2]} scenes, {result[3]} endings" + (f", {result[4]} images" if len(result) > 4 and result[4] else "")
        print(f"{path}: {len(errors)} errors, {len(warnings)} warnings{extra}")
        for e in errors:
            print("  ERROR", e)
        for w in warnings:
            print("  WARN ", w)
    sys.exit(1 if failed else 0)
