from __future__ import annotations

import html
import sys
from pathlib import Path


STYLE = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>8090 SendMyBeat Interview Prep</title>
  <style>
    body {
      font-family: "Courier New", Courier, monospace;
      margin: 0;
      background: #ffffff;
      color: #111111;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 48px 60px;
      box-sizing: border-box;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.45;
      margin: 0;
    }
    @page {
      size: Letter;
      margin: 0.5in;
    }
  </style>
</head>
<body>
  <div class="page">
    <pre>__CONTENT__</pre>
  </div>
</body>
</html>
"""


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python tools/render_interview_prep_html.py <input_md> <output_html>")
        return 1
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    content = input_path.read_text(encoding="utf-8")
    output = STYLE.replace("__CONTENT__", html.escape(content))
    output_path.write_text(output, encoding="utf-8")
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
