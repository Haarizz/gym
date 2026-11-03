import React from "react";
import { Check, Palette, Eye, Plus, Download, Users, TrendingUp, CalendarCheck, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Switch } from "../ui/switch";
import { THEMES, setTheme, useTheme, type ThemeOption } from "../../utils/theme";
// The picker's sp-theme-* styles live in the settings stylesheet; load it here since the picker is
// shown in My Profile › Settings, not only on the Settings page.
import "../../styles/settings-page.css";

/** Personal colour theme picker. Applies instantly; not branch-scoped, so never read-only. */
export function ThemeSettings() {
  const active = useTheme();

  return (
    <div className="sp-panel">
      <div className="sp-grid sp-grid--3-2">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Colour Theme</CardTitle>
            </div>
            <CardDescription>
              Pick the colours you're most comfortable working with. The change applies instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="sp-theme-grid" role="radiogroup" aria-label="Colour theme">
              {THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={theme.id === active}
                  onSelect={() => setTheme(theme.id)}
                />
              ))}
            </div>
            <div className="sp-theme-note">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>
                This is a personal setting: it only changes how GymBios looks for you on this device.
                Other staff keep their own choice, and printed receipts and statements keep their usual colours.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Live Preview</CardTitle>
            </div>
            <CardDescription>Real controls, drawn with the selected theme.</CardDescription>
          </CardHeader>
          <CardContent>
            <LivePreview />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ThemeCard({ theme, selected, onSelect }: { theme: ThemeOption; selected: boolean; onSelect: () => void }) {
  const s = theme.swatches;
  const vars = {
    "--tp-sidebar": s.sidebar,
    "--tp-sidebar-active": s.sidebarActive,
    "--tp-primary": s.primary,
    "--tp-light": s.light,
    "--tp-bg": s.background,
    "--tp-border": s.border,
    "--tp-text": s.text,
    "--tp-muted": s.muted,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-selected={selected}
      className="sp-theme-card"
      style={vars}
      onClick={onSelect}
    >
      <div className="sp-theme-mock" aria-hidden="true">
        <div className="sp-theme-mock-side">
          <span className="sp-theme-mock-logo" />
          <span className="sp-theme-mock-nav" data-active="true" />
          <span className="sp-theme-mock-nav" />
          <span className="sp-theme-mock-nav" />
          <span className="sp-theme-mock-nav" />
        </div>
        <div className="sp-theme-mock-main">
          <div className="sp-theme-mock-top">
            <span className="sp-theme-mock-title" />
            <span className="sp-theme-mock-btn" />
          </div>
          <div className="sp-theme-mock-cards">
            <span><i /></span>
            <span><i /></span>
            <span><i /></span>
          </div>
          <div className="sp-theme-mock-chart">
            {[45, 70, 55, 90, 65, 80].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="sp-theme-meta">
        <div className="sp-theme-name">
          <span>{theme.name}</span>
          {selected && (
            <span className="sp-theme-active">
              <Check className="h-3.5 w-3.5" /> Active
            </span>
          )}
        </div>
        <p className="sp-theme-desc">{theme.description}</p>
        <div className="sp-theme-swatches">
          {[s.sidebar, s.primary, s.hover, s.light, s.background, s.text].map((c, i) => (
            <span key={i} style={{ background: c }} title={c} />
          ))}
        </div>
      </div>
    </button>
  );
}

function LivePreview() {
  const [notify, setNotify] = React.useState(true);
  return (
    <div className="sp-theme-live">
      <div className="sp-theme-live-row">
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Member
        </Button>
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Badge>Active</Badge>
      </div>

      <div className="sp-theme-live-stats">
        <div className="sp-theme-live-stat">
          <Users className="h-4 w-4 text-primary" />
          <span className="sp-theme-live-value">248</span>
          <span className="sp-theme-live-label">Members</span>
        </div>
        <div className="sp-theme-live-stat">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <span className="sp-theme-live-value">63</span>
          <span className="sp-theme-live-label">Check-ins today</span>
        </div>
      </div>

      <div className="sp-theme-live-progress">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Monthly target
          </span>
          <span className="font-semibold">72%</span>
        </div>
        <Progress value={72} />
      </div>

      <label className="sp-theme-live-switch">
        <span>
          <span className="block text-sm font-medium">Renewal reminders</span>
          <span className="block text-xs text-muted-foreground">Toggle to see the accent colour</span>
        </span>
        <Switch checked={notify} onCheckedChange={setNotify} />
      </label>

      <a className="sp-theme-live-link" href="#" onClick={(e) => e.preventDefault()}>
        View full report →
      </a>
    </div>
  );
}
