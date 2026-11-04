// 12-hour time picker (hour / minute / AM-PM) that looks the same on every machine.
// The native <input type="time"> follows the OS regional setting, so on PCs set to
// 24-hour time it shows 13–23 with no AM/PM — confusing for clients who expect AM/PM.
// Value in and out is the same "HH:mm" (24-hour) string the native input produced,
// so callers and the backend don't change.
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';
import { Input } from '../ui/input';
import { Clock } from 'lucide-react';

interface TimeSelect12hProps {
  value: string;                 // "HH:mm" (24h) or ""
  onChange: (value: string) => void;
  id?: string;
  minuteStep?: number;           // default 5
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function parse(value: string): { hour: string; minute: string; period: 'AM' | 'PM' } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || '');
  if (!m) return null;
  const h24 = Number(m[1]);
  return {
    hour: String(h24 % 12 === 0 ? 12 : h24 % 12),
    minute: m[2],
    period: h24 >= 12 ? 'PM' : 'AM',
  };
}

function to24(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = Number(hour) % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

export function TimeSelect12h({ value, onChange, id, minuteStep = 5, className }: TimeSelect12hProps) {
  const parsed = parse(value);
  const minutes = React.useMemo(() => {
    const list = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => String(i * minuteStep).padStart(2, '0'));
    // Keep an existing off-step value (e.g. 10:07 saved earlier) selectable.
    if (parsed && !list.includes(parsed.minute)) list.push(parsed.minute);
    return list.sort();
  }, [minuteStep, parsed?.minute]);

  // Picking any part fills sensible defaults for the rest (":00", "AM") so a time is
  // produced as soon as the hour is chosen, like the native input.
  const update = (part: Partial<{ hour: string; minute: string; period: 'AM' | 'PM' }>) => {
    const next = { hour: parsed?.hour ?? '', minute: parsed?.minute ?? '00', period: parsed?.period ?? 'AM', ...part };
    if (!next.hour) next.hour = '12';
    onChange(to24(next.hour, next.minute, next.period));
  };

  return (
    <div id={id} className={`flex items-center gap-2 ${className ?? ''}`}>
      <Select value={parsed?.hour ?? ''} onValueChange={(v) => update({ hour: v })}>
        <SelectTrigger aria-label="Hour" style={{ minWidth: 0 }}><SelectValue placeholder="Hr" /></SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={parsed?.minute ?? ''} onValueChange={(v) => update({ minute: v })}>
        <SelectTrigger aria-label="Minute" style={{ minWidth: 0 }}><SelectValue placeholder="Min" /></SelectTrigger>
        <SelectContent>
          {minutes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={parsed?.period ?? ''} onValueChange={(v) => update({ period: v as 'AM' | 'PM' })}>
        <SelectTrigger aria-label="AM or PM" style={{ minWidth: 0 }}><SelectValue placeholder="AM/PM" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

const label12h = (hhmm: string) => {
  const p = parse(hhmm);
  return p ? `${p.hour}:${p.minute} ${p.period}` : hhmm;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
// "7:30 PM" → "7:30pm": typed text and labels are compared without spaces, dots or case.
const squash = (s: string) => s.toLowerCase().replace(/[\s.]/g, '');

/**
 * What staff type → "HH:mm" (24h), or null when it isn't a time.
 * "7:30 pm", "7.30pm", "730p", "7p", "19:30", "1930", "7" (no AM/PM → read as 24-hour, so 7 = 7 AM).
 */
export function parseTypedTime(text: string): string | null {
  const t = squash(text);
  const m = /^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3].startsWith('p') ? 12 : 0);
  } else if (h > 23) {
    return null;
  }
  return `${pad2(h)}:${pad2(min)}`;
}

interface TimeSlotSelect12hProps {
  value: string;                 // "HH:mm" (24h) or ""
  onChange: (value: string) => void;
  id?: string;
  minuteStep?: number;           // default 15
  /** "HH:mm" the list opens at while empty (default 06:00), e.g. an hour after the start time. */
  scrollTo?: string;
  placeholder?: string;
}

/**
 * Typable 12-hour time field: type "7:30 pm" / "730p" / "19:30", or pick from the list of
 * times below it (filtered as you type). Same "HH:mm" value contract as TimeSelect12h, and
 * the same AM/PM on every machine. Anything that isn't a time reverts on leaving the field.
 */
export function TimeSlotSelect12h({ value, onChange, id, minuteStep = 15, scrollTo, placeholder = 'e.g. 7:30 AM' }: TimeSlotSelect12hProps) {
  const current = parse(value) ? value.slice(0, 5) : '';
  const [text, setText] = React.useState(current ? label12h(current) : '');
  const [editing, setEditing] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // The list scrolls itself on the mouse wheel: it's portaled outside any open Dialog, whose
  // scroll lock otherwise swallows wheel events there (the list wouldn't move at all).
  const removeWheel = React.useRef<(() => void) | null>(null);
  const setListEl = React.useCallback((el: HTMLDivElement | null) => {
    removeWheel.current?.();
    removeWheel.current = null;
    listRef.current = el;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      el.scrollTop += e.deltaY * unit;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    removeWheel.current = () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Follow outside changes (edit form loading a session, reset) while not typing.
  React.useEffect(() => {
    if (!editing) setText(current ? label12h(current) : '');
  }, [current, editing]);

  const slots = React.useMemo(() => {
    const list: string[] = [];
    for (let m = 0; m < 24 * 60; m += minuteStep) list.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
    // Keep an existing off-step value (e.g. 10:07 saved earlier) in the list.
    if (current && !list.includes(current)) list.push(current);
    return list.sort();
  }, [minuteStep, current]);

  // Unchanged text shows the whole list; typing narrows it ("7" → 7:00 AM, 7:15 AM… 7:45 PM).
  const query = editing && text !== (current ? label12h(current) : '') ? squash(text) : '';
  const options = React.useMemo(() => {
    if (!query) return slots;
    const matches = slots.filter((s) => {
      const label = squash(label12h(s));
      return label.startsWith(query) || label.replace(':', '').startsWith(query)
        || s.startsWith(query) || s.replace(':', '').startsWith(query);
    });
    const exact = parseTypedTime(query);
    return exact && !matches.includes(exact) ? [exact, ...matches] : matches;
  }, [slots, query]);

  // On opening (or a new filter): highlight the current time, else where the list should start.
  React.useEffect(() => {
    if (!open) return;
    let index = 0;
    if (!query) {
      const target = current || (scrollTo && parse(scrollTo) ? scrollTo.slice(0, 5) : '06:00');
      index = Math.max(0, options.findIndex((s) => s >= target));
    }
    setActive(index);
    requestAnimationFrame(() => {
      listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: query ? 'nearest' : 'start' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const commit = (next: string) => {
    if (next !== current) onChange(next);
    setText(label12h(next));
    setOpen(false);
  };

  const finish = () => {
    setEditing(false);
    setOpen(false);
    if (!text.trim()) {
      if (current) onChange('');
      return;
    }
    const parsed = parseTypedTime(text);
    if (parsed) commit(parsed);
    else setText(current ? label12h(current) : '');   // not a time — put back what was there
  };

  const move = (step: number) => {
    if (!open) { setOpen(true); return; }
    const next = Math.min(options.length - 1, Math.max(0, active + step));
    setActive(next);
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <Popover open={open && options.length > 0} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} style={{ position: 'relative' }}>
          <Input
            id={id}
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            inputMode="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            onFocus={(e) => { setEditing(true); setOpen(true); e.currentTarget.select(); }}
            onClick={() => setOpen(true)}
            // Reset the highlight here, not in an effect, so a fast Enter right after typing picks the top match.
            onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true); }}
            onBlur={finish}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
              else if (e.key === 'Enter') {
                e.preventDefault();
                if (open && options[active]) commit(options[active]);
                else finish();
              } else if (e.key === 'Escape' && open) {
                e.preventDefault();
                e.stopPropagation();   // close the list, not the dialog
                setOpen(false);
                setText(current ? label12h(current) : '');
              }
            }}
            style={{ paddingRight: '2.25rem' }}
          />
          <Clock
            aria-hidden
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, opacity: 0.5, pointerEvents: 'none' }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => { if (anchorRef.current?.contains(e.target as Node)) e.preventDefault(); }}
        // Pressing anywhere in the list — its scrollbar too — must keep focus in the field;
        // the field closes the list when it loses focus (it used to close on a scrollbar drag).
        onMouseDown={(e) => e.preventDefault()}
        style={{ width: 'var(--radix-popover-trigger-width)', minWidth: '9rem', padding: 4 }}
      >
        <div ref={setListEl} role="listbox" style={{ maxHeight: 252, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {options.map((s, i) => (
            <button
              key={s}
              type="button"
              role="option"
              data-index={i}
              aria-selected={s === current}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}   // keep focus in the field
              // Move, not enter: a pointer resting where the list opens mustn't steal the keyboard highlight.
              onMouseMove={() => { if (active !== i) setActive(i); }}
              onClick={() => commit(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 4,
                border: 0, font: 'inherit', fontSize: 14, cursor: 'pointer',
                fontWeight: s === current ? 600 : 400,
                background: i === active ? 'var(--accent)' : 'transparent',
                color: i === active ? 'var(--accent-foreground)' : 'inherit',
              }}
            >
              {label12h(s)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
