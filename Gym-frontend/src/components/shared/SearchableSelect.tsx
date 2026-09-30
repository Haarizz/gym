import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
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
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find(o => o.value === value);
  const typed = search.trim();
  const exactMatch = typed && options.some(o => o.label.toLowerCase() === typed.toLowerCase());

  const close = () => { setOpen(false); setSearch(""); };

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
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
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ width: overlaySize("--radix-popover-trigger-width") }} className="p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""} ${o.value}`}
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
