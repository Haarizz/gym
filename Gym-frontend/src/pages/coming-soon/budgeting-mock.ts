/** Sample data for the Budgeting preview (coming soon), adapted from the GymBios Web App Design mock-ups. */
import { daysFromNow } from "../../components/coming-soon/preview-kit";

export interface Budget {
  id: string; category: string; department: string; branch: string; type: "Monthly" | "Quarterly" | "Yearly";
  amount: number; spent: number; threshold: number; owner: string; notes?: string;
}

export const BUDGETS: Budget[] = [
  { id: "BDG-001", category: "Utilities", department: "Operations", branch: "Dubai Marina", type: "Monthly", amount: 3000, spent: 2200, threshold: 80, owner: "Ahmed Hassan" },
  { id: "BDG-002", category: "Inventory (POS stock)", department: "Sales", branch: "Dubai Marina", type: "Monthly", amount: 12000, spent: 11400, threshold: 85, owner: "Sarah Ahmed" },
  { id: "BDG-003", category: "Marketing", department: "Sales", branch: "Dubai Marina", type: "Monthly", amount: 5000, spent: 3100, threshold: 80, owner: "Lisa Chen" },
  { id: "BDG-004", category: "Equipment maintenance", department: "Facilities", branch: "Dubai Marina", type: "Quarterly", amount: 9000, spent: 6100, threshold: 75, owner: "Omar Khalil" },
  { id: "BDG-005", category: "Snacks & beverages", department: "Café", branch: "Dubai Marina", type: "Monthly", amount: 4000, spent: 4720, threshold: 90, owner: "Maria Garcia" },
  { id: "BDG-006", category: "Staff training", department: "HR", branch: "Dubai Marina", type: "Quarterly", amount: 6000, spent: 2400, threshold: 80, owner: "Sarah Ahmed" },
  { id: "BDG-007", category: "Utilities", department: "Operations", branch: "Sharjah", type: "Monthly", amount: 2500, spent: 2950, threshold: 80, owner: "Khalid Rahman" },
  { id: "BDG-008", category: "Inventory (POS stock)", department: "Sales", branch: "Sharjah", type: "Monthly", amount: 8000, spent: 9600, threshold: 85, owner: "Khalid Rahman" },
  { id: "BDG-009", category: "Equipment maintenance", department: "Facilities", branch: "Sharjah", type: "Quarterly", amount: 6000, spent: 5450, threshold: 75, owner: "Omar Khalil" },
  { id: "BDG-010", category: "Marketing", department: "Sales", branch: "Sharjah", type: "Monthly", amount: 3500, spent: 2000, threshold: 80, owner: "Lisa Chen" },
  { id: "BDG-011", category: "Utilities", department: "Operations", branch: "Abu Dhabi", type: "Monthly", amount: 3200, spent: 2650, threshold: 80, owner: "Fatima Ali" },
  { id: "BDG-012", category: "Inventory (POS stock)", department: "Sales", branch: "Abu Dhabi", type: "Monthly", amount: 10000, spent: 8900, threshold: 85, owner: "Fatima Ali" },
  { id: "BDG-013", category: "Office supplies", department: "Admin", branch: "Abu Dhabi", type: "Monthly", amount: 1500, spent: 980, threshold: 80, owner: "Fatima Ali" },
  { id: "BDG-014", category: "Marketing", department: "Sales", branch: "Abu Dhabi", type: "Monthly", amount: 4500, spent: 4150, threshold: 80, owner: "Lisa Chen" },
];

export type BudgetState = "Safe" | "Watch" | "At risk" | "Overspent";
export function stateOf(b: Budget): BudgetState {
  const pct = (b.spent / b.amount) * 100;
  if (pct > 100) return "Overspent";
  if (pct >= b.threshold) return "At risk";
  if (pct >= b.threshold - 15) return "Watch";
  return "Safe";
}

export const APPROVALS = [
  { id: "BGT-102", category: "Inventory (POS stock)", branch: "Sharjah", amount: 10000, current: 8000, by: "Khalid Rahman", date: daysFromNow(-2), status: "Pending" as const,
    reason: "Protein bars and drinks sell out every week — raise the stock budget to match demand." },
  { id: "BGT-103", category: "Marketing", branch: "Dubai Marina", amount: 5000, by: "Lisa Chen", date: daysFromNow(-1), status: "Pending" as const,
    reason: "Ramadan membership campaign: Instagram ads and printed flyers." },
  { id: "BGT-104", category: "Equipment", branch: "Abu Dhabi", amount: 15000, by: "Omar Khalil", date: daysFromNow(-4), status: "Revision requested" as const,
    reason: "Four air bikes for the HIIT zone. Finance asked for a second quotation." },
  { id: "BGT-105", category: "Staff training", branch: "All branches", amount: 6000, by: "Sarah Ahmed", date: daysFromNow(-6), status: "Pending" as const,
    reason: "First-aid and CPR recertification for 18 trainers." },
];

/** Budget vs actual per month for the last 6 months (all branches). */
export const BVA = [
  { budget: 25000, actual: 23500 }, { budget: 25000, actual: 26200 }, { budget: 25000, actual: 24800 },
  { budget: 25000, actual: 27100 }, { budget: 28000, actual: 26500 }, { budget: 28000, actual: 29300 },
];

/** Spend by category per month (last 6 months). */
export const TREND = [
  { utilities: 7200, inventory: 26500, marketing: 8200, maintenance: 4800 },
  { utilities: 7600, inventory: 27900, marketing: 9100, maintenance: 5200 },
  { utilities: 7100, inventory: 26800, marketing: 7800, maintenance: 4100 },
  { utilities: 8300, inventory: 29400, marketing: 9600, maintenance: 6300 },
  { utilities: 7900, inventory: 28800, marketing: 8800, maintenance: 5600 },
  { utilities: 7800, inventory: 29900, marketing: 9250, maintenance: 5950 },
];

export const INSIGHTS = [
  { type: "critical", tag: "Overspent", title: "Café snacks are 18% over budget", detail: "Dubai Marina spent 4,720 of 4,000. Reduce ingredient orders or review prices." },
  { type: "info", tag: "Supplier", title: "Supplier B is 6% cheaper on drinks", detail: "Over the last 3 months. Switching the preferred vendor saves about 600 a month." },
  { type: "warning", tag: "Forecast", title: "Electricity expected to rise 22% in July", detail: "Summer air-conditioning. Raise the July utilities budget before it is breached." },
  { type: "positive", tag: "Savings", title: "Abu Dhabi saved 1,200 this month", detail: "Thanks to the new cleaning-supplies contract." },
];

export const RULES = [
  { name: "Utilities cap", text: "Alert the branch manager at 80% of the monthly utilities budget and the owner at 100%.", on: true },
  { name: "Stock purchases review", text: "Purchase orders over 2,000 against the stock budget need a manager's approval.", on: true },
  { name: "Marketing spend limit", text: "No single marketing expense above 25% of the month's marketing budget without approval.", on: true },
  { name: "Freeze when overspent", text: "Block new expenses in a category once it is 10% over budget, until the owner releases it.", on: false },
  { name: "Roll unused budget forward", text: "Carry up to 20% of an unspent monthly budget into next month.", on: false },
];
