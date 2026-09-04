import React, { useCallback, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../ui/command';
import { Input } from '../ui/input';
import { geocodingApi, LocationSuggestion } from '../../utils/supabase/gym-service';

interface LocationPickerProps {
  id?: string;
  value: string;
  onChange: (location: { address: string; lat?: number; lng?: number }) => void;
  placeholder?: string;
}

/** Searchable worldwide location field backed by the backend's Nominatim proxy. */
export function LocationPicker({ id, value, onChange, placeholder }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (q: string) => {
        clearTimeout(timer);
        if (!q.trim() || q.trim().length < 3) {
          setSuggestions([]);
          return;
        }
        setLoading(true);
        timer = setTimeout(async () => {
          try {
            const results = await geocodingApi.search(q);
            setSuggestions(results);
          } catch {
            setSuggestions([]);
          } finally {
            setLoading(false);
          }
        }, 400);
      };
    })(),
    []
  );

  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    onChange({ address: newValue, lat: undefined, lng: undefined });
    setOpen(true);
    debouncedSearch(newValue);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.displayName);
    onChange({ address: suggestion.displayName, lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex items-center">
          <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            id={id}
            className="!pl-10"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => query.trim().length >= 3 && suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder || 'Search for a city or town...'}
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading && <CommandEmpty>Searching...</CommandEmpty>}
            {!loading && suggestions.length === 0 && <CommandEmpty>No locations found.</CommandEmpty>}
            <CommandGroup>
              {suggestions.map((s, idx) => (
                <CommandItem key={idx} value={s.displayName} onSelect={() => handleSelect(s)}>
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.displayName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
