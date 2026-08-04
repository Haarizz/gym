export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  /** Field label shown above the trigger. */
  label?: string;

  /** Placeholder shown when no option is selected. */
  placeholder?: string;

  /** Currently selected value (matches `option.value`). */
  value?: string;

  /** Full list of selectable options. */
  options: DropdownOption[];

  /** Called when the user picks an option. */
  onChange: (value: string) => void;

  /** Marks the field as required (shows * after label). */
  required?: boolean;

  /** Disables interaction. */
  disabled?: boolean;

  /** Validation error message shown below the field. */
  error?: string;
}
