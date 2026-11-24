"""How a thumbnail reads at the size people see it in search on a phone (about 168x94).

Deterministic pixel checks, no AI: contrast, how busy it is, and whether one area stands out.
The shrunken preview comes back too, so the producer sees what a scroller sees.
"""

from __future__ import annotations

import base64
import io
from typing import Any

SMALL_SIZE = (168, 94)
MIN_CONTRAST = 42.0  # luminance spread (standard deviation, 0-255)
MAX_BUSY = 58.0  # mean edge strength at small size
MIN_BUSY = 6.0
MIN_FOCUS = 1.25  # strongest tile's edge strength over the average


def small_size_check(image_bytes: bytes) -> dict[str, Any]:
    from PIL import Image, ImageFilter, ImageOps, ImageStat

    with Image.open(io.BytesIO(image_bytes)) as source:
        image = ImageOps.fit(ImageOps.exif_transpose(source).convert("RGB"), SMALL_SIZE, Image.LANCZOS)
    gray = image.convert("L")
    contrast = float(ImageStat.Stat(gray).stddev[0])
    edges = gray.filter(ImageFilter.FIND_EDGES)
    busy = float(ImageStat.Stat(edges).mean[0])

    # Split into a 4x3 grid: a clear focal point means one tile carries much more detail than average.
    tile_w, tile_h = SMALL_SIZE[0] // 4, SMALL_SIZE[1] // 3
    tiles = [
        float(ImageStat.Stat(edges.crop((x * tile_w, y * tile_h, (x + 1) * tile_w, (y + 1) * tile_h))).mean[0])
        for y in range(3)
        for x in range(4)
    ]
    average = sum(tiles) / len(tiles) or 1.0
    focus = max(tiles) / average

    checks = [
        {
            "id": "contrast",
            "ok": contrast >= MIN_CONTRAST,
            "message": "Strong contrast at phone size" if contrast >= MIN_CONTRAST else "Low contrast: it turns muddy when small. Push the darks and lights apart.",
        },
        {
            "id": "busy",
            "ok": MIN_BUSY <= busy <= MAX_BUSY,
            "message": (
                "Detail level reads well when small"
                if MIN_BUSY <= busy <= MAX_BUSY
                else ("Too busy when small: cut fine detail and small text." if busy > MAX_BUSY else "Very flat when small: add one clear subject or bold shape.")
            ),
        },
        {
            "id": "focus",
            "ok": focus >= MIN_FOCUS,
            "message": "One area stands out" if focus >= MIN_FOCUS else "Nothing stands out: make one subject bigger or brighter.",
        },
    ]
    passed = sum(1 for check in checks if check["ok"])
    out = io.BytesIO()
    image.save(out, format="PNG")
    return {
        "size": f"{SMALL_SIZE[0]}x{SMALL_SIZE[1]}",
        "score": round(100 * passed / len(checks)),
        "checks": checks,
        "preview": "data:image/png;base64," + base64.b64encode(out.getvalue()).decode("ascii"),
        "metrics": {"contrast": round(contrast, 1), "busy": round(busy, 1), "focus": round(focus, 2)},
    }
