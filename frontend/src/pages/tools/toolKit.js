import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Small pieces the free tool pages share: a labelled field, an on/off field and copy.

export const copyText = async (text, done = "Copied") => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("Couldn't copy. Select the text and copy it yourself.");
  }
};

export const Field = ({ id, label, hint, wide = false, children }) => (
  <div className={wide ? "ftl-field ftl-field--wide" : "ftl-field"}>
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint ? <p className="ftl-hint">{hint}</p> : null}
  </div>
);

export const ToggleField = ({ id, label, hint, checked, onChange }) => (
  <div className="ftl-field ftl-field--wide">
    <div className="ftl-toggle">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
    {hint ? <p className="ftl-hint">{hint}</p> : null}
  </div>
);

// Shown under a tool's output while it still runs on the example values.
export const ExampleNote = ({ show }) =>
  show ? <p className="ftl-hint">This is an example. Fill in your own details above and it updates as you type.</p> : null;
