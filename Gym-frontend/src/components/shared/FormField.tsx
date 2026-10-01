import React from "react";
import { Label } from "../ui/label";
import styles from "./FormField.module.css";

/**
 * Label + control + inline error/hint. The error paragraph's id is `${htmlFor}-error`,
 * so pass that as the control's aria-describedby (see fieldA11y) to associate them.
 */
export function FormField({
  htmlFor,
  label,
  required = false,
  error,
  hint,
  className,
  children,
}: {
  htmlFor: string;
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <Label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className={styles.error} role="alert">{error}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}

/** aria props wiring a control to its FormField message */
export function fieldA11y(id: string, error?: string, hasHint = false) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}
