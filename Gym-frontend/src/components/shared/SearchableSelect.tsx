import React, { useId, useState } from "react";
import { Check, ChevronDown, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { overlaySize } from "../ui/overlay-root";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { cn } from "../ui/utils";

export type SearchableOption = { value: string; label: string; hint?: string };

/**
 * Searchable dropdown (Popover + cmdk, same pattern as the Expenses vendor picker)
 * with an optional "Add …" footer so a missing option can be created in place.
 * `onAdd` receives whatever the user had typed, to prefill the create form.
 */
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No matches found.",
  addLabel,
  onAdd,
  clearable = false,
  disabled = false,
  loading = false,
  id,
  invalid = false,
  ariaDescribedBy,
  ariaLabel,
  onClose,
  searchable = true,
  chevron = "up-down",
  className,
  contentClassName,
}: {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  addLabel?: string;             // e.g. "Add category"
  onAdd?: (typed: string) => void;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
  /** Error styling + aria-invalid on the trigger */
  invalid?: boolean;
  /** Id(s) of the element(s) describing the field, e.g. its error message */
  ariaDescribedBy?: string;
  ariaLabel?: string;
  /** Fires whenever the list closes (selection, Escape, click outside) — use it to mark the field touched */
  onClose?: () => void;
  /** false hides the search box (short lists); arrow keys/Enter still work */
  searchable?: boolean;
  chevron?: "up-down" | "down";
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();
  const itemValue = (o: SearchableOption) => `${o.label} ${o.hint ?? ""} ${o.value}`.trim();
  const selected = options.find(o => o.value === value);
  const typed = search.trim();
  const exactMatch = typed && options.some(o => o.label.toLowerCase() === typed.toLowerCase());

  const setOpenState = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setSearch("");
      onClose?.();
    }
  };
  const close = () => setOpenState(false);

  return (
    <Popover open={open} onOpenChange={setOpenState}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          aria-label={ariaLabel}
          disabled={disabled}
          onKeyDown={e => {
            // Backspace/Delete clears a clearable field without opening the list
            if (clearable && selected && !disabled && (e.key === "Backspace" || e.key === "Delete")) {
              e.preventDefault();
              onChange("");
            }
          }}
          className={cn("w-full justify-between font-normal", className)}
          style={invalid ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px rgba(230, 57, 70, 0.15)" } : undefined}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {loading ? "Loading..." : selected ? selected.label : placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selected && !disabled && (
              <span
                role="button"
                aria-label="Clear selection"
                className="text-muted-foreground"
                onClick={e => { e.stopPropagation(); onChange(""); }}
              >
                <X className="h-4 w-4" />
              </span>
            )}
            {chevron === "down"
              ? <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
              : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: overlaySize("--radix-popover-trigger-width") }}
        className={cn("p-0", contentClassName)}
        align="start"
        onOpenAutoFocus={e => {
          // No search box to focus — focus the list itself so arrow keys/Enter work.
          if (searchable) return;
          e.preventDefault();
          document.getElementById(listId)?.focus();
        }}
      >
        <Command id={listId} tabIndex={-1} defaultValue={selected ? itemValue(selected) : undefined} className="outline-none">
          {searchable && <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />}
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {options.map(o => (
                <CommandItem
                  key={o.value}
                  value={itemValue(o)}
                  onSelect={() => { onChange(o.value); close(); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="ml-auto text-xs text-muted-foreground truncate">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {onAdd && (
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary"
                onClick={() => { const t = exactMatch ? "" : typed; close(); onAdd(t); }}
              >
                <Plus className="h-4 w-4" />
                {typed && !exactMatch ? `${addLabel ?? "Add"} "${typed}"` : addLabel ?? "Add new"}
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
