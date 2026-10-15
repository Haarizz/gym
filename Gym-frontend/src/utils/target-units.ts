/**
 * Unit types a staff target can count. Each is tracked live on the backend
 * (StaffProgressCalculator.computeUnits): membership receipts they take, POS sales they
 * ring up, and PT sessions they deliver as trainer. Keys are what unit_targets_json stores.
 */
export interface TargetUnitType {
  id: string;
  name: string;
  category: "Memberships" | "POS" | "Training";
  hint: string;
}

export const TARGET_UNIT_TYPES: TargetUnitType[] = [
  { id: "admissions", name: "New admissions", category: "Memberships", hint: "New members signed up" },
  { id: "renewals", name: "Renewals", category: "Memberships", hint: "Memberships renewed" },
  { id: "addons", name: "Add-ons", category: "Memberships", hint: "Add-on plans sold" },
  { id: "walkins", name: "Walk-ins", category: "Memberships", hint: "Daily entry passes" },
  { id: "pos_sales", name: "POS sales", category: "POS", hint: "Completed POS bills" },
  { id: "pos_items", name: "POS items sold", category: "POS", hint: "Items across POS bills" },
  { id: "pt_sessions", name: "PT sessions", category: "Training", hint: "Personal training sessions delivered (not cancelled)" },
];

const BY_ID = new Map(TARGET_UNIT_TYPES.map(u => [u.id, u]));

export const isTrackedUnit = (id: string) => BY_ID.has(id);

/** Display name; older targets saved free-text services (e.g. "karate") — shown title-cased. */
export function unitLabel(id: string): string {
  const known = BY_ID.get(id);
  if (known) return known.name;
  return id.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
