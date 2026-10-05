// 12-hour time picker (hour / minute / AM-PM) that looks the same on every machine.
// The native <input type="time"> follows the OS regional setting, so on PCs set to
// 24-hour time it shows 13–23 with no AM/PM — confusing for clients who expect AM/PM.
// Value in and out is the same "HH:mm" (24-hour) string the native input produced,
// so callers and the backend don't change.
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
