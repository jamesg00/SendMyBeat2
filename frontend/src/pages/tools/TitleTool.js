import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TITLE_VISIBLE_CHARS, YOUTUBE_TITLE_LIMIT, typeBeatTitles } from "@/lib/seoTools";
import { ExampleNote, Field, ToggleField, copyText } from "@/pages/tools/toolKit";

const YEAR = new Date().getFullYear();

// Type beat titles from the artist, beat name, style and BPM, in the formats the app uses.
const TitleTool = ({ page }) => {
  const example = page.example || {};
  const [artists, setArtists] = useState("");
  const [beatName, setBeatName] = useState("");
  const [style, setStyle] = useState("");
  const [bpm, setBpm] = useState("");
  const [free, setFree] = useState(false);

  const isExample = !artists.trim() && !beatName.trim() && !style.trim() && !bpm.trim();
  const titles = useMemo(() => {
    const values = isExample ? example : { artists, beatName, style, bpm };
    return typeBeatTitles({ ...values, free, year: YEAR });
  }, [isExample, example, artists, beatName, style, bpm, free]);

  return (
    <>
      <form id="tool" className="ftg-form ftl-form" onSubmit={(e) => e.preventDefault()}>
        <div className="ftl-grid">
          <Field id="ttl-artist" label="Artist" hint='Use "x" for a collab, like Drake x Future.' wide>
            <Input id="ttl-artist" value={artists} onChange={(e) => setArtists(e.target.value)} placeholder={example.artists} maxLength={80} />
          </Field>
          <Field id="ttl-name" label="Beat name (optional)">
            <Input id="ttl-name" value={beatName} onChange={(e) => setBeatName(e.target.value)} placeholder={example.beatName} maxLength={40} />
          </Field>
          <Field id="ttl-style" label="Mood or style (optional)">
            <Input id="ttl-style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder={example.style} maxLength={40} />
          </Field>
          <Field id="ttl-bpm" label="BPM (optional)">
            <Input id="ttl-bpm" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder={example.bpm} inputMode="numeric" maxLength={5} />
          </Field>
          <ToggleField
            id="ttl-free"
            label="[FREE] beat"
            hint="Only if anyone can use the beat for free."
            checked={free}
            onChange={setFree}
          />
        </div>
      </form>

      <section className="ftg-result" aria-live="polite">
        <div className="ftg-result-head">
          <h2 className="policy-title">Titles to copy</h2>
          <span className="smb-mono smb-t3 text-xs">YouTube allows {YOUTUBE_TITLE_LIMIT} characters</span>
        </div>
        {titles.length ? (
          <ul className="ftl-rows">
            {titles.map((t) => (
              <li key={t.title} className="ftl-row">
                <div className="ftl-row-main">
                  <span className="ftl-row-text">{t.title}</span>
                  <span className={`ftl-row-meta smb-mono ${t.long ? "smb-warn" : ""}`}>
                    {t.length} of {YOUTUBE_TITLE_LIMIT} characters
                    {t.long ? `, may be cut off after about ${TITLE_VISIBLE_CHARS}` : ""} · score {t.score}
                  </span>
                </div>
                <Button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => copyText(t.title, "Title copied")} aria-label={`Copy ${t.title}`}>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ftl-hint">Type the artist your beat is for to see titles.</p>
        )}
        <ExampleNote show={isExample} />
      </section>
    </>
  );
};

export default TitleTool;
