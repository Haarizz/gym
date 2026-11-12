import React from "react";
import { Banknote, Dumbbell, Settings2, Users, type LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { cx, wf as s, type Tone } from "../workforce/ui";

/** Plain-language guide to the three steps of Targets & Commission. */
export function HowItWorksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
        <DialogHeader>
          <DialogTitle>How targets and commission work</DialogTitle>
          <DialogDescription>Set it up once per role, follow progress, approve each month.</DialogDescription>
        </DialogHeader>
        <div className={s.dialogBody}>
          <Step n={1} icon={Settings2} tone="teal" title="Setup">
            <li>Each role has one card: a <b>monthly target</b>, a <b>commission %</b> and an optional <b>bonus</b> for reaching the target.</li>
            <li>Need something different for one person? Fill in their row; blank means “same as the role”.</li>
            <li>Settings apply from this month and repeat every month until changed. Approved months never change.</li>
          </Step>

          <Step n={2} icon={Dumbbell} tone="violet" title="How PT counts">
            <li>A member pays for PT — a package (add-on) or a single paid session — and the <b>trainer's target moves by the full amount</b> straight away.</li>
            <li>The trainer's <b>commission</b> is their % of that money:
              <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem" }}>
                <li>Package set to <b>On booking</b> (and single sessions): all of it at once.</li>
                <li>Package set to <b>On completion</b>: month by month, a share for each session used (day packages: for the days in each month).</li>
              </ul>
            </li>
            <li>Example: ₹5,000 package, 10 sessions, 10% commission, On completion → ₹5,000 on the target the day it's paid; ₹50 commission per session used.</li>
            <li>A session counts as used when the member checks in (or doesn't show, if the package counts no-shows).</li>
          </Step>

          <Step n={3} icon={Users} tone="blue" title="Team progress">
            <li>Shows everyone's progress for the month. Click a person to see each payment and session that counted, and the commission it earned.</li>
            <li>New memberships and POS sales go to whoever took the payment. Sales that couldn't be matched to one person are listed there for you to credit.</li>
          </Step>

          <Step n={4} icon={Banknote} tone="green" title="Payouts">
            <li>When a month ends, its commission waits for approval. Approve (optionally with an adjustment and a note) or reject it.</li>
            <li>Approved commission is locked and paid with that month's salary in payroll.</li>
          </Step>
        </div>
        <div className={s.dialogFooter}>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, icon: Icon, tone, title, children }: { n: number; icon: LucideIcon; tone: Tone; title: string; children: React.ReactNode }) {
  return (
    <div className={s.section} data-tone={tone}>
      <div className={s.row} style={{ gap: "0.5rem", marginBottom: "0.375rem" }}>
        <span data-tone={tone} className={s.toneText}><Icon size={16} /></span>
        <span className={s.strong}>{n}. {title}</span>
      </div>
      <ul className={s.small} style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>{children}</ul>
    </div>
  );
}
