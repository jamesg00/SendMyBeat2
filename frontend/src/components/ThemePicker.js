import React from "react";
import { Check } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

// Palette grid for Settings. Each swatch shows the palette's background, button and status colors.
const ThemePicker = () => {
  const { theme, setTheme, palettes } = useTheme();

  return (
    <div className="smb-theme-grid" role="radiogroup" aria-label="Theme">
      {palettes.map((palette) => {
        const selected = theme === palette.id;
        const [bg, fg, acc] = palette.swatch;
        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`smb-theme-option ${selected ? "is-active" : ""}`}
            onClick={() => setTheme(palette.id)}
            data-testid={`theme-${palette.id}`}
          >
            <span
              className={`smb-theme-swatch ${palette.id === "auto" ? "smb-theme-swatch--auto" : ""}`}
              style={{ background: bg }}
              aria-hidden="true"
            >
              <i style={{ background: fg }} />
              <i style={{ background: acc }} />
            </span>
            <span className="smb-theme-name">{palette.label}</span>
            {selected ? <Check className="smb-theme-check" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
};

export default ThemePicker;
