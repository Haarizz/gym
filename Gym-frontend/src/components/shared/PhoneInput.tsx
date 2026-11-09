import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { cn } from "../ui/utils";
import { useOptionalCurrencyCode } from "../../utils/currency";
import {
  DIAL_COUNTRIES, findDialCountry, joinPhone, nationalDigits, parsePhoneInput, splitStoredPhone, type DialCountry,
} from "../../utils/phone-number";

/** The gym's home country, from its currency (AED → UAE, INR → India, …); UAE otherwise. */
const COUNTRY_FOR_CURRENCY: Record<string, string> = { AED: "AE", INR: "IN", SAR: "SA", GBP: "GB", USD: "US" };

export function useDefaultDialCountry(preferred?: string): DialCountry {
  const currency = useOptionalCurrencyCode();
  return findDialCountry(preferred || (currency && COUNTRY_FOR_CURRENCY[currency]) || "AE");
}

/** Search text for a country: name, ISO code, aliases and dial code ("india in +91 91"). */
const searchKey = (c: DialCountry) => `${c.name} ${c.iso} ${c.aliases ?? ""} +${c.dial} ${c.dial}`.toLowerCase();

// Substring match (not cmdk's fuzzy one), so "ind" finds India / Indonesia only. A dial code
// that matches exactly ("91" → India +91) ranks above codes that merely contain it (+591).
const filterCountries = (value: string, search: string) => {
  const q = search.trim().toLowerCase().replace(/^\+/, "");
  if (!q) return 1;
  if (!value.includes(q)) return 0;
  if (/^\d+$/.test(q)) return value.includes(` +${q} `) ? 1 : value.includes(` +${q}`) ? 0.8 : 0.3;
  return value.startsWith(q) ? 1 : 0.6;
};

export interface PhoneInputProps {
  /** Stored value — "+971 501234567", or an older number saved without a code. */
  value: string | null | undefined;
  /** "+{dial} {digits}", or "" when no number is entered. */
  onChange: (value: string) => void;
  /** Id of the number box, for a <Label htmlFor>. */
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  /** ISO code of the country to start on; defaults to the gym's (from its currency). */
  defaultCountry?: string;
  className?: string;
  inputClassName?: string;
  triggerClassName?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

/**
 * A phone number with its country code: a searchable country picker (by name, ISO code or
 * dial code, e.g. "India", "IN", "91") and the national number. Stores "+91 9876543210".
 */
export function PhoneInput({
  value, onChange, id, placeholder, disabled, readOnly, invalid, defaultCountry,
  className, inputClassName, triggerClassName, onBlur, ...aria
}: PhoneInputProps) {
  const fallback = useDefaultDialCountry(defaultCountry);
  const initial = useMemo(() => splitStoredPhone(value, fallback), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<DialCountry>(initial.country);
  const [text, setText] = useState(initial.digits);
  const [open, setOpen] = useState(false);
  const lastEmitted = useRef<string>(value ?? "");
  const pickedCountry = useRef(false);

  // The form loaded or reset the value — read it again.
  useEffect(() => {
    if ((value ?? "") === lastEmitted.current) return;
    const next = splitStoredPhone(value, country);
    setCountry(next.country);
    setText(next.digits);
    lastEmitted.current = value ?? "";
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // The gym's currency (and so its home country) can arrive after the first render.
  useEffect(() => {
    if (!pickedCountry.current && !nationalDigits(text) && !(value ?? "")) setCountry(fallback);
  }, [fallback.iso]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (c: DialCountry, digits: string) => {
    const next = joinPhone(c, digits);
    lastEmitted.current = next;
    onChange(next);
  };

  const handleNumber = (raw: string) => {
    // Typed, pasted or autofilled: "+91 98…" / "0091…" switch the country, a trunk 0 is dropped.
    const parsed = parsePhoneInput(raw, country, false);
    if (parsed.value.startsWith("+")) {
      // Still typing the dial code ("+9") — show it, store nothing yet.
      setText(parsed.value);
      if (lastEmitted.current !== "") { lastEmitted.current = ""; onChange(""); }
      return;
    }
    if (parsed.country.iso !== country.iso) pickedCountry.current = true;
    setCountry(parsed.country);
    setText(parsed.value);
    emit(parsed.country, parsed.value);
  };

  const pickCountry = (c: DialCountry) => {
    pickedCountry.current = true;
    setCountry(c);
    setOpen(false);
    const digits = text.startsWith("+") ? "" : text;
    if (text.startsWith("+")) setText("");
    emit(c, digits);
  };

  const locked = disabled || readOnly;

  return (
    <div className={cn("flex w-full items-center gap-1.5", className)}>
      <Popover open={open} onOpenChange={o => !locked && setOpen(o)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={locked}
            aria-label={`Country code: ${country.name} +${country.dial}`}
            aria-expanded={open}
            className={cn("h-9 shrink-0 gap-1 px-2 font-normal", triggerClassName)}
            style={invalid ? { borderColor: "var(--destructive)" } : undefined}
          >
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>{country.flag}</span>
            <span>+{country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" style={{ width: 300 }}>
          <Command filter={filterCountries}>
            <CommandInput placeholder="Search country or code…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {DIAL_COUNTRIES.map(c => (
                  <CommandItem key={c.iso} value={searchKey(c)} onSelect={() => pickCountry(c)}>
                    <Check className={cn("h-4 w-4", c.iso === country.iso ? "opacity-100" : "opacity-0")} />
                    <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">+{c.dial}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={text}
        placeholder={placeholder ?? (country.placeholder !== "Phone number" ? country.placeholder : "Phone number")}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        aria-describedby={aria["aria-describedby"]}
        aria-label={aria["aria-label"]}
        onChange={e => handleNumber(e.target.value)}
        onBlur={onBlur}
        className={cn("min-w-0 flex-1", inputClassName)}
      />
    </div>
  );
}
