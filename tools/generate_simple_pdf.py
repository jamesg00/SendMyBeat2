from __future__ import annotations

import sys
import textwrap
from pathlib import Path


PAGE_WIDTH = 612
PAGE_HEIGHT = 792
LEFT_MARGIN = 40
TOP_MARGIN = 40
BOTTOM_MARGIN = 40
FONT_NAME = "Courier"
FONT_SIZE = 10
LINE_HEIGHT = 13
MAX_CHARS = 92


def escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def normalize_markdown_line(line: str) -> str:
    stripped = line.rstrip("\n")
    if stripped.startswith("### "):
        return stripped[4:].upper()
    if stripped.startswith("## "):
        return stripped[3:].upper()
    if stripped.startswith("# "):
        return stripped[2:].upper()
    return stripped


def wrap_lines(text: str) -> list[str]:
    wrapped: list[str] = []
    for raw_line in text.splitlines():
        line = normalize_markdown_line(raw_line)
        if not line.strip():
            wrapped.append("")
            continue
        if line.startswith("- "):
            bullet_text = line[2:].strip()
            bullet_lines = textwrap.wrap(
                bullet_text,
                width=MAX_CHARS - 2,
                break_long_words=False,
                break_on_hyphens=False,
            )
            if not bullet_lines:
                wrapped.append("-")
            else:
                wrapped.append(f"- {bullet_lines[0]}")
                wrapped.extend(f"  {part}" for part in bullet_lines[1:])
            continue
        numbered = False
        prefix = ""
        rest = line
        if ". " in line[:5]:
            maybe_prefix, maybe_rest = line.split(". ", 1)
            if maybe_prefix.isdigit():
                numbered = True
                prefix = f"{maybe_prefix}. "
                rest = maybe_rest
        if numbered:
            items = textwrap.wrap(
                rest,
                width=MAX_CHARS - len(prefix),
                break_long_words=False,
                break_on_hyphens=False,
            )
            if items:
                wrapped.append(prefix + items[0])
                wrapped.extend(" " * len(prefix) + item for item in items[1:])
            else:
                wrapped.append(prefix.rstrip())
            continue
        parts = textwrap.wrap(
            line,
            width=MAX_CHARS,
            break_long_words=False,
            break_on_hyphens=False,
        )
        wrapped.extend(parts if parts else [""])
    return wrapped


def paginate(lines: list[str]) -> list[list[str]]:
    usable_height = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN
    lines_per_page = max(1, usable_height // LINE_HEIGHT)
    return [lines[i : i + lines_per_page] for i in range(0, len(lines), lines_per_page)] or [[]]


def build_content_stream(page_lines: list[str]) -> bytes:
    y_start = PAGE_HEIGHT - TOP_MARGIN - FONT_SIZE
    commands = ["BT", f"/F1 {FONT_SIZE} Tf", f"{LEFT_MARGIN} {y_start} Td"]
    first = True
    for line in page_lines:
        safe = escape_pdf_text(line)
        if first:
            commands.append(f"({safe}) Tj")
            first = False
        else:
            commands.append(f"0 -{LINE_HEIGHT} Td")
            commands.append(f"({safe}) Tj")
    commands.append("ET")
    return "\n".join(commands).encode("latin-1", errors="replace")


def make_pdf(text: str, output_path: Path) -> None:
    lines = wrap_lines(text)
    pages = paginate(lines)

    objects: list[bytes] = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    font_obj = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

    page_obj_ids: list[int] = []
    content_obj_ids: list[int] = []

    for page_lines in pages:
        content = build_content_stream(page_lines)
        content_obj_id = add_object(
            f"<< /Length {len(content)} >>\nstream\n".encode("latin-1") + content + b"\nendstream"
        )
        content_obj_ids.append(content_obj_id)
        page_obj_ids.append(0)

    pages_obj_id = len(objects) + 1

    for idx, content_obj_id in enumerate(content_obj_ids):
        page_dict = (
            f"<< /Type /Page /Parent {pages_obj_id} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font_obj} 0 R >> >> /Contents {content_obj_id} 0 R >>"
        ).encode("latin-1")
        page_obj_ids[idx] = add_object(page_dict)

    kids = " ".join(f"{obj_id} 0 R" for obj_id in page_obj_ids)
    pages_obj_id = add_object(
        f"<< /Type /Pages /Count {len(page_obj_ids)} /Kids [{kids}] >>".encode("latin-1")
    )
    catalog_obj_id = add_object(f"<< /Type /Catalog /Pages {pages_obj_id} 0 R >>".encode("latin-1"))

    buffer = bytearray()
    buffer.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(buffer))
        buffer.extend(f"{idx} 0 obj\n".encode("latin-1"))
        buffer.extend(obj)
        buffer.extend(b"\nendobj\n")

    xref_pos = len(buffer)
    buffer.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    buffer.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        buffer.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_obj_id} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    )
    buffer.extend(trailer.encode("latin-1"))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(buffer)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python tools/generate_simple_pdf.py <input_text_file> <output_pdf>")
        return 1
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    text = input_path.read_text(encoding="utf-8")
    make_pdf(text, output_path)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
