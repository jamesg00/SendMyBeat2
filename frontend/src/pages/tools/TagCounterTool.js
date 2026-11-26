import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { withYear } from "@/lib/seoModel";
import { TAG_MAX_LENGTH, YOUTUBE_TAG_LIMIT, analyzeTags, parseTags, trimToFit } from "@/lib/seoTools";
import { ExampleNote, Field, copyText } from "@/pages/tools/toolKit";

const YEAR = new Date().getFullYear();

// Counts tags the way YouTube does against its 500-character limit, and trims a list to fit.
const TagCounterTool = ({ page }) => {
  const exampleTags = withYear((page.example || {}).tags || "", YEAR);
  const [text, setText] = useState("");

  const isExample = !text.trim();
  const source = isExample ? exampleTags : text;
  const report = useMemo(() => analyzeTags(source), [source]);
  const cleaned = useMemo(() => trimToFit(parseTags(source), Infinity).kept, [source]);
  const pct = Math.min(100, (report.chars / YOUTUBE_TAG_LIMIT) * 100);

  const trim = () => {
    const { kept, dropped } = trimToFit(parseTags(source));
    setText(kept.join(", "));
    toast.success(dropped.length ? `Removed ${dropped.length} tag${dropped.length === 1 ? "" : "s"} to fit` : "Already fits");
  };

  return (
    <>
      <form id="tool" className="ftg-form ftl-form" onSubmit={(e) => e.preventDefault()}>
        <Field id="cnt-tags" label="Your tags, separated by commas" wide>
          <Textarea id="cnt-tags" value={text} onChange={(e) => setText(e.target.value)} placeholder={exampleTags} rows={5} />
        </Field>
      </form>

      <section className="ftg-result" aria-live="polite">
        <div className="smb-meter">
          <div className="smb-meter-row">
            <span className={report.over ? "smb-warn" : "smb-meter-label"}>
              {report.over ? "Over YouTube's tag limit. Trim before you upload." : `${report.count} tags`}
            </span>
            <span className={`smb-meter-value ${report.over ? "smb-warn" : ""}`}>
              {report.chars} of {YOUTUBE_TAG_LIMIT} characters
            </span>
          </div>
          <span className="smb-bar">
            <span className={`smb-bar-fill ${report.over ? "smb-bar-fill--warn" : ""}`} style={{ width: `${pct}%` }} />
          </span>
        </div>

        {report.duplicates.length ? (
          <p className="ftl-hint smb-warn">
            {report.duplicates.length} repeat{report.duplicates.length === 1 ? "" : "s"}: {report.duplicates.join(", ")}
          </p>
        ) : null}
        {report.tooLong.length ? (
          <p className="ftl-hint smb-warn">
            {report.tooLong.length} tag{report.tooLong.length === 1 ? " is" : "s are"} over {TAG_MAX_LENGTH} characters.
          </p>
        ) : null}
        {report.hadAngleBrackets ? <p className="ftl-hint">YouTube doesn't accept &lt; or &gt; in tags, so they're left out.</p> : null}

        {report.rows.length ? (
          <ul className="ftl-rows ftl-rows--tight">
            {report.rows.map((row, i) => (
              <li key={`${row.tag}-${i}`} className="ftl-row">
                <span className="ftl-row-text">{row.tag}</span>
                <span className={`ftl-row-meta smb-mono ${row.duplicate || row.tooLong ? "smb-warn" : ""}`}>
                  {row.duplicate ? "repeat · " : ""}
                  {row.tooLong ? "too long · " : ""}
                  {row.cost} {row.cost === 1 ? "char" : "chars"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ftl-hint">Paste your tags above to count them.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" className="smb-btn smb-btn--pri" onClick={trim} disabled={!report.rows.length}>
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Trim to fit
          </Button>
          <Button
            type="button"
            className="smb-btn smb-btn--sec"
            onClick={() => copyText(cleaned.join(", "), "Tags copied")}
            disabled={!cleaned.length}
          >
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy cleaned tags
          </Button>
        </div>
        <p className="ftl-hint">Copy cleaned tags removes repeats and over-long tags but keeps the rest; trim to fit also cuts the list to {YOUTUBE_TAG_LIMIT} characters.</p>
        <ExampleNote show={isExample} />
      </section>
    </>
  );
};

export default TagCounterTool;
