import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { overlaySize } from "../ui/overlay-root";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { cn } from "../ui/utils";
import { membersService } from "../../utils/supabase/members-service";
import styles from "./PromotionFormDialog.module.css";

type MemberOption = { id: string; name: string; hint: string };

const toOption = (m: { id: string | number; name: string; member_id?: string; phone?: string }): MemberOption => ({
  id: String(m.id),
  name: m.name,
  hint: [m.member_id, m.phone].filter(Boolean).join(" · "),
});

/**
 * Names for a list of member ids. Ids saved on a promotion arrive without names, so the
 * ones not seen in a search yet are fetched once each; a deleted member shows as "#id".
 */
export function useMemberLabels(ids: string[]) {
  const [labels, setLabels] = useState<Record<string, MemberOption>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    const missing = ids.filter(id => !labels[id] && !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach(id => requested.current.add(id));
    Promise.all(missing.map(id =>
      membersService.getMemberById(id).then(toOption).catch(() => ({ id, name: `#${id}`, hint: "Member not found" })),
    )).then(found => setLabels(prev => Object.fromEntries([...Object.entries(prev), ...found.map(o => [o.id, o])])));
  }, [ids, labels]);

  const remember = (options: MemberOption[]) =>
    setLabels(prev => Object.fromEntries([...Object.entries(prev), ...options.map(o => [o.id, o])]));

  return { labels, remember };
}

/** Server-searched multi-select of members; picked members show as removable chips under the field. */
export function MemberMultiSelect({
  value,
  onChange,
  id,
  invalid = false,
  ariaDescribedBy,
  onClose,
}: {
  /** Member database ids */
  value: string[];
  onChange: (ids: string[]) => void;
  id?: string;
  invalid?: boolean;
  ariaDescribedBy?: string;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const { labels, remember } = useMemberLabels(value);

  useEffect(() => {
    const q = search.trim();
    if (!q) { setResults([]); setLoading(false); return; }
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await membersService.getMembers({ search: q }, { limit: 20 });
        if (cancelled) return;
        const options = (res.members || []).map(toOption);
        remember(options);
        setResults(options);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setOpenState = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setSearch("");
      onClose?.();
    }
  };

  const toggle = (memberId: string) =>
    onChange(value.includes(memberId) ? value.filter(v => v !== memberId) : [...value, memberId]);

  return (
    <div>
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
            className="w-full justify-between font-normal"
            style={invalid ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px rgba(185, 28, 28, 0.15)" } : undefined}
          >
            <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
              {value.length === 0 ? "Search and select members" : `${value.length} member${value.length === 1 ? "" : "s"} selected`}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent style={{ width: overlaySize("--radix-popover-trigger-width") }} className="p-0" align="start">
          {/* Results come from the server already matched, so cmdk's own filtering is off */}
          <Command id={listId} shouldFilter={false} className="outline-none">
            <CommandInput placeholder="Search by name, member ID or phone..." value={search} onValueChange={setSearch} />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
              ) : (
                <CommandEmpty>{search.trim() ? "No matching members." : "Type to search members."}</CommandEmpty>
              )}
              {!loading && (
                <CommandGroup>
                  {results.map(o => (
                    <CommandItem key={o.id} value={o.id} onSelect={() => toggle(o.id)}>
                      <Check className={cn("mr-2 h-4 w-4", value.includes(o.id) ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{o.name}</span>
                      {o.hint && <span className="ml-auto text-xs text-muted-foreground truncate">{o.hint}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className={styles.chipList} aria-label="Selected members">
          {value.map(memberId => {
            const m = labels[memberId];
            return (
              <li key={memberId} className={styles.chip}>
                <span className={styles.chipText} title={m?.hint || undefined}>{m ? m.name : "Loading..."}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Remove ${m?.name ?? "member"}`}
                  onClick={() => onChange(value.filter(v => v !== memberId))}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
