import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESCRIPTION_MAX_BYTES, beatDescription } from "@/lib/seoTools";
import { ExampleNote, Field, ToggleField, copyText } from "@/pages/tools/toolKit";

const YEAR = new Date().getFullYear();
const TEXT_FIELDS = ["beatName", "artist", "style", "bpm", "musicKey", "buyLink", "producer", "email", "instagram"];
const EMPTY = Object.fromEntries(TEXT_FIELDS.map((k) => [k, ""]));

// A ready YouTube description, laid out the way the app's description builder lays it out.
const DescriptionTool = ({ page }) => {
  const example = page.example || {};
  const [values, setValues] = useState(EMPTY);
  const [free, setFree] = useState(false);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const isExample = TEXT_FIELDS.every((k) => !values[k].trim());
  const result = useMemo(
    () => beatDescription({ ...(isExample ? example : values), free, year: YEAR }),
    [isExample, example, values, free]
  );

  const input = (k, label, props = {}) => (
    <Field id={`dsc-${k}`} label={label} wide={props.wide}>
      <Input id={`dsc-${k}`} value={values[k]} onChange={set(k)} placeholder={example[k] || props.placeholder} maxLength={props.maxLength || 80} inputMode={props.inputMode} />
    </Field>
  );

  return (
    <>
      <form id="tool" className="ftg-form ftl-form" onSubmit={(e) => e.preventDefault()}>
        <div className="ftl-grid">
          {input("beatName", "Beat name", { maxLength: 40 })}
          {input("artist", "Type beat for (artist)", { maxLength: 60 })}
          {input("style", "Mood or style", { maxLength: 40 })}
          {input("bpm", "BPM", { maxLength: 5, inputMode: "numeric" })}
          {input("musicKey", "Key", { maxLength: 20 })}
          {input("producer", "Your producer name", { maxLength: 40 })}
          {input("buyLink", "Purchase or download link", { wide: true, maxLength: 300 })}
          {input("email", "Contact email (optional)", { maxLength: 120, placeholder: "you@example.com" })}
          {input("instagram", "Instagram (optional)", { maxLength: 120 })}
          <ToggleField
            id="dsc-free"
            label="Free for profit"
            hint="Anyone can use the beat for free with credit. Off means they lease it first."
            checked={free}
            onChange={setFree}
          />
        </div>
      </form>

      <section className="ftg-result" aria-live="polite">
        <div className="ftg-result-head">
          <h2 className="policy-title">Your description</h2>
          <span className={`smb-mono text-xs ${result.bytes > DESCRIPTION_MAX_BYTES ? "smb-warn" : "smb-t3"}`}>
            {result.bytes} of {DESCRIPTION_MAX_BYTES} bytes, {result.hashtags.length} hashtags
          </span>
        </div>
        <pre className="ftl-pre">{result.content}</pre>
        {result.warnings.map((w) => (
          <p key={w} className="ftl-hint smb-warn">{w}</p>
        ))}
        <Button type="button" className="smb-btn smb-btn--sec" onClick={() => copyText(result.content, "Description copied")}>
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy description
        </Button>
        <ExampleNote show={isExample} />
      </section>
    </>
  );
};

export default DescriptionTool;
