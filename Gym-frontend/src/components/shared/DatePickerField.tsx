import React, { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";

/** Values are ISO "yyyy-MM-dd" strings (what the API takes); shown as dd/MM/yyyy like the rest of the app. */
const ISO = "yyyy-MM-dd";
const DISPLAY = "dd/MM/yyyy";

const toDate = (value?: string) => {
  if (!value) return undefined;
  const d = parse(value, ISO, new Date());
  return isValid(d) ? d : undefined;
};

export function DatePickerField({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "DD/MM/YYYY",
  invalid = false,
  ariaDescribedBy,
  disabled = false,
  clearable = true,
  onClose,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable date (yyyy-MM-dd) — earlier days are disabled */
  min?: string;
  /** Latest selectable date (yyyy-MM-dd) — later days are disabled */
  max?: string;
  placeholder?: string;
  invalid?: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** Fires when the calendar closes — use it to mark the field touched */
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const minDate = toDate(min);
  const maxDate = toDate(max);

  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  const setOpenState = (o: boolean) => {
    setOpen(o);
    if (!o) onClose?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          className="w-full justify-between font-normal"
          style={invalid ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px rgba(230, 57, 70, 0.15)" } : undefined}
        >
          <span className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? format(selected, DISPLAY) : placeholder}
            </span>
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear date"
              className="text-muted-foreground shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            >
              <X className="h-4 w-4" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minDate ?? maxDate}
          disabled={disabledDays}
          onSelect={(d) => {
            onChange(d ? format(d, ISO) : "");
            setOpenState(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
