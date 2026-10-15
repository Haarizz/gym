import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, style, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      // field-sizing-content makes a long unbroken string the textarea's
      // min-content width, which widens grid parents (e.g. DialogContent) into
      // a horizontal scroll. "anywhere" lets it wrap mid-word instead. Inline
      // because the precompiled Tailwind CSS has no utility for it.
      style={{ overflowWrap: "anywhere", ...style }}
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-lg border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
