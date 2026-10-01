import React from "react";
import { Check, Lock } from "lucide-react";
import styles from "./PromotionFormDialog.module.css";

export type WizardStepState = "complete" | "current" | "available" | "locked";

/**
 * Step navigation for a multi-step form. Every click goes to onSelect and the parent
 * decides what happens: entering the step, or (for the locked step right after the
 * current one) validating the current step so the user sees why they can't move on.
 */
export function WizardSteps({
  steps,
  states,
  onSelect,
  ariaLabel = "Form steps",
}: {
  steps: { id: string; label: string }[];
  states: WizardStepState[];
  onSelect: (index: number) => void;
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel}>
      <ol className={styles.steps}>
        {steps.map((step, i) => {
          const state = states[i];
          const locked = state === "locked";
          return (
            <li key={step.id} className={styles.stepItem}>
              <button
                type="button"
                className={styles.step}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                aria-disabled={locked || undefined}
                title={locked ? "Complete the previous steps first" : undefined}
                onClick={() => onSelect(i)}
              >
                <span className={styles.stepBadge} aria-hidden="true">
                  {state === "complete" ? <Check size={14} strokeWidth={3} /> : locked ? <Lock size={12} /> : i + 1}
                </span>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className="sr-only">
                  {state === "complete" ? " (completed)" : state === "current" ? " (current step)" : locked ? " (locked)" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
