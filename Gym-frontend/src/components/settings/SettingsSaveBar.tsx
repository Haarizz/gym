import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface SettingsSaveBarProps {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  label: string;
  /** Shown instead of the saved/unsaved status, e.g. why saving is unavailable. */
  note?: string;
  disabled?: boolean;
}

/** Sticky footer for a Settings tab: save state on the left, save button on the right. */
export function SettingsSaveBar({ isDirty, saving, onSave, label, note, disabled = false }: SettingsSaveBarProps) {
  const dirty = isDirty && !disabled;
  return (
    <div className="sp-savebar" data-dirty={dirty}>
      <span className="sp-savebar-status">
        <span className="sp-dot" />
        {note ?? (dirty ? "You have unsaved changes" : "All changes saved")}
      </span>
      <Button onClick={onSave} disabled={disabled || !isDirty || saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}
