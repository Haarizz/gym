import React from 'react';
import { RefreshCw, TrendingUp, Dumbbell, Users, Package } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import type { Member } from '../../utils/supabase/members-service';

/**
 * Members list: compact icon + count chips beside the plan name — renewals, upgrades,
 * PT sessions and classes attended, add-ons bought. Only non-zero counts show; hover
 * for the labelled breakdown. Counts come from the members list endpoint.
 */
const ITEMS = [
  { key: 'renewal_count', label: 'Renewals', icon: RefreshCw, color: '#059669' },
  { key: 'upgrade_count', label: 'Plan upgrades', icon: TrendingUp, color: '#2563eb' },
  { key: 'pt_sessions_attended', label: 'Training sessions attended', icon: Dumbbell, color: '#ea580c' },
  { key: 'classes_attended', label: 'Classes attended', icon: Users, color: '#7c3aed' },
  { key: 'addons_purchased', label: 'Add-ons purchased', icon: Package, color: '#db2777' },
] as const;

export function MemberActivityBadges({ member }: { member: Member }) {
  const counts = ITEMS.map((item) => ({ ...item, count: Number(member[item.key] ?? 0) }));
  const shown = counts.filter((c) => c.count > 0);
  if (shown.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          aria-label={shown.map((c) => `${c.label}: ${c.count}`).join(', ')}
          className="inline-flex items-center gap-1.5 align-middle ml-2"
          style={{ cursor: 'help' }}
        >
          {shown.map(({ key, icon: Icon, color, count }) => (
            <span key={key} className="inline-flex items-center gap-0.5 text-xs font-medium" style={{ color }}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            </span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', columnGap: 8, rowGap: 3, fontSize: 12, alignItems: 'center' }}>
          {counts.map(({ key, label, icon: Icon, count }) => (
            <React.Fragment key={key}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span>{label}</span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{count}</span>
            </React.Fragment>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
