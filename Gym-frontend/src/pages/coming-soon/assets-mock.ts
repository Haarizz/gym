/**
 * Sample data for the Assets preview (coming soon). Adapted from the GymBios Web App
 * Design mock-ups; dates are relative to today so the preview always looks current.
 */
import { daysFromNow } from "../../components/coming-soon/preview-kit";

export type AssetStatus = "In use" | "Available" | "Under maintenance" | "Retired";
export type AssetCondition = "Excellent" | "Good" | "Fair" | "Poor";

export interface Asset {
  code: string; name: string; model: string; category: string; subcategory: string;
  purchaseDate: string; purchasePrice: number; currentValue: number; depreciationRate: number;
  location: string; branch: string; vendor: string; status: AssetStatus; condition: AssetCondition;
  warrantyExpiry: string; serialNumber: string; nextService: string; utilization: number; assignedTo?: string;
  maintenance: { date: string; type: string; cost: number; notes: string }[];
  transfers: { date: string; from: string; to: string; reason: string }[];
}

const a = (x: Asset) => x;

export const ASSETS: Asset[] = [
  a({ code: "AST-001", name: "Treadmill X Professional", model: "TreadX Pro 3000", category: "Gym Equipment", subcategory: "Cardio",
    purchaseDate: daysFromNow(-640), purchasePrice: 5500, currentValue: 4535, depreciationRate: 10, location: "Cardio Zone", branch: "Downtown Dubai",
    vendor: "FitnessTech Solutions", status: "In use", condition: "Excellent", warrantyExpiry: daysFromNow(90), serialNumber: "TX3000-2024-001",
    nextService: daysFromNow(6), utilization: 85,
    maintenance: [
      { date: daysFromNow(-62), type: "Routine service", cost: 250, notes: "Belt adjustment and lubrication" },
      { date: daysFromNow(-210), type: "Repair", cost: 450, notes: "Motor belt replaced" },
    ],
    transfers: [{ date: daysFromNow(-636), from: "Warehouse", to: "Downtown Dubai – Cardio Zone", reason: "Initial deployment" }] }),
  a({ code: "AST-002", name: "Commercial Rowing Machine", model: "Concept2 RowErg", category: "Gym Equipment", subcategory: "Cardio",
    purchaseDate: daysFromNow(-420), purchasePrice: 4200, currentValue: 3720, depreciationRate: 10, location: "Cardio Zone", branch: "Dubai Marina",
    vendor: "ProGym Supplies", status: "In use", condition: "Good", warrantyExpiry: daysFromNow(310), serialNumber: "C2-RE-88213",
    nextService: daysFromNow(19), utilization: 72,
    maintenance: [{ date: daysFromNow(-95), type: "Routine service", cost: 120, notes: "Chain cleaned, monitor firmware updated" }],
    transfers: [{ date: daysFromNow(-418), from: "Warehouse", to: "Dubai Marina – Cardio Zone", reason: "Initial deployment" }] }),
  a({ code: "AST-003", name: "Smith Machine", model: "Hammer Strength HD Elite", category: "Gym Equipment", subcategory: "Strength",
    purchaseDate: daysFromNow(-900), purchasePrice: 12500, currentValue: 9420, depreciationRate: 12, location: "Strength Floor", branch: "Downtown Dubai",
    vendor: "Life Fitness ME", status: "Under maintenance", condition: "Fair", warrantyExpiry: daysFromNow(-170), serialNumber: "HS-SM-20231",
    nextService: daysFromNow(-3), utilization: 64,
    maintenance: [
      { date: daysFromNow(-4), type: "Repair", cost: 980, notes: "Bar carriage bearings worn — parts on order" },
      { date: daysFromNow(-160), type: "Routine service", cost: 300, notes: "Cables and safety catches checked" },
    ],
    transfers: [{ date: daysFromNow(-895), from: "Warehouse", to: "Downtown Dubai – Strength Floor", reason: "Initial deployment" }] }),
  a({ code: "AST-004", name: "Spin Bikes (set of 12)", model: "Keiser M3i", category: "Gym Equipment", subcategory: "Studio",
    purchaseDate: daysFromNow(-300), purchasePrice: 38400, currentValue: 35240, depreciationRate: 10, location: "Spin Studio", branch: "Dubai Marina",
    vendor: "FitnessTech Solutions", status: "In use", condition: "Excellent", warrantyExpiry: daysFromNow(430), serialNumber: "KM3I-BATCH-12",
    nextService: daysFromNow(34), utilization: 91, maintenance: [],
    transfers: [{ date: daysFromNow(-298), from: "Warehouse", to: "Dubai Marina – Spin Studio", reason: "Studio opening" }] }),
  a({ code: "AST-005", name: "Cable Crossover Station", model: "Matrix Aura G3", category: "Gym Equipment", subcategory: "Strength",
    purchaseDate: daysFromNow(-760), purchasePrice: 9800, currentValue: 7790, depreciationRate: 10, location: "Strength Floor", branch: "Abu Dhabi",
    vendor: "Matrix Fitness", status: "In use", condition: "Good", warrantyExpiry: daysFromNow(40), serialNumber: "MX-G3-55120",
    nextService: daysFromNow(2), utilization: 78,
    maintenance: [{ date: daysFromNow(-120), type: "Routine service", cost: 220, notes: "Cables replaced on left side" }],
    transfers: [
      { date: daysFromNow(-755), from: "Warehouse", to: "Downtown Dubai – Strength Floor", reason: "Initial deployment" },
      { date: daysFromNow(-240), from: "Downtown Dubai", to: "Abu Dhabi – Strength Floor", reason: "New branch fit-out" },
    ] }),
  a({ code: "AST-006", name: "Dumbbell Set 2.5–50 kg", model: "Eleiko Rubber Hex", category: "Gym Equipment", subcategory: "Free weights",
    purchaseDate: daysFromNow(-520), purchasePrice: 15600, currentValue: 13880, depreciationRate: 8, location: "Free-weights Area", branch: "Downtown Dubai",
    vendor: "ProGym Supplies", status: "In use", condition: "Good", warrantyExpiry: daysFromNow(210), serialNumber: "EL-HEX-SET-02",
    nextService: daysFromNow(60), utilization: 95, maintenance: [], transfers: [] }),
  a({ code: "AST-007", name: "Reception Workstation", model: "Dell OptiPlex 7010", category: "IT Equipment", subcategory: "Computers",
    purchaseDate: daysFromNow(-380), purchasePrice: 3800, currentValue: 2580, depreciationRate: 25, location: "Front Desk", branch: "Downtown Dubai",
    vendor: "TechZone LLC", status: "In use", condition: "Good", warrantyExpiry: daysFromNow(350), serialNumber: "DL-7010-44821", assignedTo: "Fatima Ali",
    nextService: daysFromNow(80), utilization: 98, maintenance: [], transfers: [] }),
  a({ code: "AST-008", name: "Face-recognition Turnstile", model: "Heystar FR-200", category: "IT Equipment", subcategory: "Access control",
    purchaseDate: daysFromNow(-200), purchasePrice: 7200, currentValue: 6410, depreciationRate: 20, location: "Main Entrance", branch: "Dubai Marina",
    vendor: "SecureTech Systems", status: "In use", condition: "Excellent", warrantyExpiry: daysFromNow(530), serialNumber: "HS-FR200-9031",
    nextService: daysFromNow(25), utilization: 100, maintenance: [], transfers: [] }),
  a({ code: "AST-009", name: "Executive Office Desk", model: "Modern Workspace Pro", category: "Furniture", subcategory: "Office",
    purchaseDate: daysFromNow(-690), purchasePrice: 1200, currentValue: 960, depreciationRate: 10, location: "Manager Office", branch: "Downtown Dubai",
    vendor: "Office Interiors", status: "In use", condition: "Excellent", warrantyExpiry: daysFromNow(-50), serialNumber: "OI-EXD-1101", assignedTo: "Sarah Ahmed",
    nextService: daysFromNow(200), utilization: 70, maintenance: [], transfers: [] }),
  a({ code: "AST-010", name: "Locker Bank (40 units)", model: "SteelSafe L40", category: "Furniture", subcategory: "Changing rooms",
    purchaseDate: daysFromNow(-980), purchasePrice: 8900, currentValue: 6570, depreciationRate: 10, location: "Men's Changing Room", branch: "Sharjah",
    vendor: "Office Interiors", status: "In use", condition: "Fair", warrantyExpiry: daysFromNow(-250), serialNumber: "SS-L40-0007",
    nextService: daysFromNow(12), utilization: 82,
    maintenance: [{ date: daysFromNow(-30), type: "Repair", cost: 340, notes: "6 lock cylinders replaced" }], transfers: [] }),
  a({ code: "AST-011", name: "Staff Shuttle Van", model: "Toyota Hiace 2024", category: "Vehicles", subcategory: "Transport",
    purchaseDate: daysFromNow(-560), purchasePrice: 112000, currentValue: 89600, depreciationRate: 15, location: "Car Park", branch: "Downtown Dubai",
    vendor: "Al-Futtaim Motors", status: "In use", condition: "Good", warrantyExpiry: daysFromNow(170), serialNumber: "JTF-HIACE-2024-221", assignedTo: "Omar Khalil",
    nextService: daysFromNow(9), utilization: 66,
    maintenance: [{ date: daysFromNow(-80), type: "Routine service", cost: 850, notes: "20,000 km service" }], transfers: [] }),
  a({ code: "AST-012", name: "Espresso Machine", model: "La Marzocco Linea PB", category: "Kitchen & Café", subcategory: "Café",
    purchaseDate: daysFromNow(-450), purchasePrice: 14500, currentValue: 12320, depreciationRate: 12, location: "Juice Bar", branch: "Dubai Marina",
    vendor: "Barista Pro Trading", status: "In use", condition: "Good", warrantyExpiry: daysFromNow(20), serialNumber: "LM-LPB-77301",
    nextService: daysFromNow(4), utilization: 88,
    maintenance: [{ date: daysFromNow(-45), type: "Routine service", cost: 380, notes: "Descaling and gasket change" }], transfers: [] }),
  a({ code: "AST-013", name: "Sound System", model: "Bose ShowMatch", category: "Office Equipment", subcategory: "Audio",
    purchaseDate: daysFromNow(-820), purchasePrice: 6400, currentValue: 4100, depreciationRate: 20, location: "Group Studio", branch: "Abu Dhabi",
    vendor: "TechZone LLC", status: "Available", condition: "Good", warrantyExpiry: daysFromNow(-90), serialNumber: "BS-SM-2207",
    nextService: daysFromNow(45), utilization: 34, maintenance: [],
    transfers: [{ date: daysFromNow(-20), from: "Sharjah – Studio", to: "Abu Dhabi – Group Studio", reason: "Studio refurbishment in Sharjah" }] }),
  a({ code: "AST-014", name: "Elliptical Cross-trainer", model: "Precor EFX 835", category: "Gym Equipment", subcategory: "Cardio",
    purchaseDate: daysFromNow(-1500), purchasePrice: 7800, currentValue: 1950, depreciationRate: 15, location: "Store Room", branch: "Sharjah",
    vendor: "FitnessTech Solutions", status: "Retired", condition: "Poor", warrantyExpiry: daysFromNow(-700), serialNumber: "PR-EFX-1188",
    nextService: daysFromNow(400), utilization: 0,
    maintenance: [{ date: daysFromNow(-60), type: "Inspection", cost: 0, notes: "Drive unit beyond economic repair — retired" }], transfers: [] }),
];

export const CATEGORIES = [
  { name: "Gym Equipment", value: 1_850_000, count: 145 },
  { name: "IT Equipment", value: 385_000, count: 78 },
  { name: "Furniture", value: 265_000, count: 92 },
  { name: "Vehicles", value: 180_000, count: 8 },
  { name: "Office Equipment", value: 120_000, count: 45 },
  { name: "Kitchen & Café", value: 50_000, count: 23 },
];

export const ACTIVITY_BY_MONTH = [
  { added: 8, transferred: 5, maintenance: 12, retired: 2 },
  { added: 15, transferred: 8, maintenance: 18, retired: 4 },
  { added: 11, transferred: 3, maintenance: 15, retired: 6 },
  { added: 12, transferred: 7, maintenance: 15, retired: 3 },
  { added: 18, transferred: 12, maintenance: 22, retired: 5 },
  { added: 14, transferred: 9, maintenance: 19, retired: 1 },
];

export type TxnType = "purchase" | "transfer" | "maintenance" | "assignment" | "depreciation" | "disposal" | "sale" | "insurance";
export interface AssetTxn {
  id: string; type: TxnType; assetCode: string; assetName: string; date: string; amount: number;
  status: "completed" | "pending" | "active"; detail: string; by: string; approvedBy?: string; documents: string[];
  from?: string; to?: string; vendor?: string; assignedTo?: string;
}

const RAW_TRANSACTIONS: AssetTxn[] = [
  { id: "TXN-2611-018", type: "maintenance", assetCode: "AST-003", assetName: "Smith Machine", date: daysFromNow(-4), amount: 980, status: "pending",
    detail: "Bar carriage bearings worn — parts on order", by: "Ahmed Hassan", vendor: "Life Fitness ME", documents: ["service_quote.pdf"] },
  { id: "TXN-2611-017", type: "purchase", assetCode: "AST-015", assetName: "Assault AirBike (x4)", date: daysFromNow(-6), amount: 14800, status: "pending",
    detail: "Four air bikes for the HIIT zone", by: "Sarah Ahmed", vendor: "ProGym Supplies", documents: ["purchase_order.pdf", "quotation.pdf"] },
  { id: "TXN-2611-016", type: "transfer", assetCode: "AST-013", assetName: "Sound System", date: daysFromNow(-20), amount: 0, status: "completed",
    detail: "Studio refurbishment in Sharjah", by: "Omar Khalil", approvedBy: "Sarah Ahmed", from: "Sharjah – Studio", to: "Abu Dhabi – Group Studio", documents: ["transfer_note.pdf"] },
  { id: "TXN-2611-015", type: "maintenance", assetCode: "AST-010", assetName: "Locker Bank (40 units)", date: daysFromNow(-30), amount: 340, status: "completed",
    detail: "6 lock cylinders replaced", by: "Ahmed Hassan", approvedBy: "Sarah Ahmed", vendor: "Office Interiors", documents: ["invoice_OI-2291.pdf"] },
  { id: "TXN-2611-014", type: "depreciation", assetCode: "ALL", assetName: "Monthly depreciation run", date: daysFromNow(-13), amount: 21450, status: "completed",
    detail: "Straight-line depreciation for 391 assets", by: "System", approvedBy: "Finance", documents: ["depreciation_schedule.xlsx"] },
  { id: "TXN-2611-013", type: "maintenance", assetCode: "AST-012", assetName: "Espresso Machine", date: daysFromNow(-45), amount: 380, status: "completed",
    detail: "Descaling and gasket change", by: "Ahmed Hassan", approvedBy: "Sarah Ahmed", vendor: "Barista Pro Trading", documents: ["service_report.pdf"] },
  { id: "TXN-2611-012", type: "disposal", assetCode: "AST-014", assetName: "Elliptical Cross-trainer", date: daysFromNow(-58), amount: 1950, status: "pending",
    detail: "Drive unit beyond economic repair — write off remaining book value", by: "Ahmed Hassan", documents: ["inspection_report.pdf"] },
  { id: "TXN-2611-011", type: "assignment", assetCode: "AST-011", assetName: "Staff Shuttle Van", date: daysFromNow(-64), amount: 0, status: "active",
    detail: "Assigned for staff transport, Downtown ↔ Marina", by: "Sarah Ahmed", assignedTo: "Omar Khalil", documents: ["handover_form.pdf"] },
  { id: "TXN-2611-010", type: "insurance", assetCode: "AST-011", assetName: "Staff Shuttle Van", date: daysFromNow(-70), amount: 4200, status: "completed",
    detail: "Comprehensive cover renewed for 12 months", by: "Finance", approvedBy: "Sarah Ahmed", vendor: "Oman Insurance", documents: ["policy_2026.pdf"] },
  { id: "TXN-2611-009", type: "maintenance", assetCode: "AST-001", assetName: "Treadmill X Professional", date: daysFromNow(-62), amount: 250, status: "completed",
    detail: "Belt adjustment and lubrication", by: "Ahmed Hassan", approvedBy: "Sarah Ahmed", vendor: "FitnessTech Solutions", documents: ["service_report.pdf"] },
  { id: "TXN-2611-008", type: "sale", assetCode: "AST-0R2", assetName: "Old Leg Press (2019)", date: daysFromNow(-88), amount: 2600, status: "completed",
    detail: "Sold to a second-hand dealer after replacement", by: "Sarah Ahmed", approvedBy: "Owner", documents: ["sale_receipt.pdf"] },
  { id: "TXN-2611-007", type: "purchase", assetCode: "AST-004", assetName: "Spin Bikes (set of 12)", date: daysFromNow(-300), amount: 38400, status: "completed",
    detail: "Spin studio fit-out", by: "Sarah Ahmed", approvedBy: "Owner", vendor: "FitnessTech Solutions", documents: ["purchase_order.pdf", "invoice.pdf", "warranty.pdf"] },
  { id: "TXN-2611-006", type: "transfer", assetCode: "AST-005", assetName: "Cable Crossover Station", date: daysFromNow(-240), amount: 0, status: "completed",
    detail: "New branch fit-out", by: "Omar Khalil", approvedBy: "Sarah Ahmed", from: "Downtown Dubai", to: "Abu Dhabi – Strength Floor", documents: ["transfer_note.pdf"] },
  { id: "TXN-2611-005", type: "purchase", assetCode: "AST-008", assetName: "Face-recognition Turnstile", date: daysFromNow(-200), amount: 7200, status: "completed",
    detail: "Entrance access control", by: "Sarah Ahmed", approvedBy: "Owner", vendor: "SecureTech Systems", documents: ["invoice.pdf"] },
];

/** Newest first. */
export const TRANSACTIONS = [...RAW_TRANSACTIONS].sort((x, y) => y.date.localeCompare(x.date));

export const PENDING_APPROVAL = TRANSACTIONS.filter(t => t.status === "pending");
