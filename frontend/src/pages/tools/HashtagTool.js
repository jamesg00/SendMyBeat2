import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HASHTAGS_ABOVE_TITLE, YOUTUBE_HASHTAG_LIMIT, beatHashtags } from "@/lib/seoTools";
import { ExampleNote, Field, copyText } from "@/pages/tools/toolKit";

// 3 to 5 description hashtags for a beat, picked the way the app's description builder picks them.
const HashtagTool = ({ page }) => {
  const example = page.example || {};
  const [artists, setArtists] = useState("");
  const [style, setStyle] = useState("");
  const [existing, setExisting] = useState("");

  const isExample = !artists.trim() && !style.trim();
  const result = useMemo(
    () => beatHashtags({ ...(isExample ? example : { artists, style }), existing }),
    [isExample, example, artists, style, existing]
  );

  return (
    <>
      <form id="tool" className="ftg-form ftl-form" onSubmit={(e) => e.preventDefault()}>
        <div className="ftl-grid">
          <Field id="hsh-artist" label="Artist" hint='Use "x" for a collab, like Drake x Future.'>
            <Input id="hsh-artist" value={artists} onChange={(e) => setArtists(e.target.value)} placeholder={example.artists} maxLength={80} />
          </Field>
          <Field id="hsh-style" label="Mood or style (optional)">
            <Input id="hsh-style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder={example.style} maxLength={40} />
          </Field>
          <Field id="hsh-existing" label="Your description (optional)" hint="Paste it to check the total number of hashtags." wide>
            <Textarea id="hsh-existing" value={existing} onChange={(e) => setExisting(e.target.value)} rows={3} maxLength={5000} />
          </Field>
        </div>
      </form>

      <section className="ftg-result" aria-live="polite">
        <div className="ftg-result-head">
          <h2 className="policy-title">Hashtags to copy</h2>
          <span className="smb-mono smb-t3 text-xs">{result.hashtags.length} hashtags</span>
        </div>
        <ul className="ftg-tags">
          {result.hashtags.map((tag, i) => (
            <li key={tag} className={i < HASHTAGS_ABOVE_TITLE ? "ftl-lead" : undefined}>{tag}</li>
          ))}
        </ul>
        <p className="ftl-hint">
          The first {HASHTAGS_ABOVE_TITLE} (outlined) are the ones YouTube shows above your title. Paste them at the end of your description.
        </p>
        {existing.trim() ? (
          <p className={`ftl-hint ${result.over ? "smb-warn" : ""}`}>
            Your description already has {result.already} hashtags, so this makes {result.total}.
            {result.over ? ` That's over ${YOUTUBE_HASHTAG_LIMIT}, and YouTube ignores every hashtag when there are more than ${YOUTUBE_HASHTAG_LIMIT}. Remove some.` : ""}
          </p>
        ) : null}
        <Button type="button" className="smb-btn smb-btn--sec" onClick={() => copyText(result.hashtags.join(" "), "Hashtags copied")}>
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy hashtags
        </Button>
        <ExampleNote show={isExample} />
      </section>
    </>
  );
};

export default HashtagTool;
