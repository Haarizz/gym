import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  ShieldCheck,
  Lock,
  Crown,
  Info,
  ChevronRight,
  Eye,
  RotateCcw,
  LayoutDashboard,
  Users,
  Megaphone,
  ShoppingCart,
  Landmark,
  UserCog,
  Settings2,
  Globe,
  Layers,
} from "lucide-react";
import {
  rolesService,
  Role,
  RoleRequestData,
  PermissionCatalogModule,
} from "../utils/supabase/roles-service";
import { authService } from "../utils/supabase/auth-service";
import { PermissionGate, hasPermission, usePermissions } from "../utils/permissions";
import styles from "./roles-permissions.module.css";

// ── Catalog presentation ────────────────────────────────────────────────────

/** Matrix columns. APPROVE and MODERATE never share a module, so they share the last column. */
const COLUMNS = [
  { id: "VIEW", label: "View", actions: ["VIEW"] },
  { id: "CREATE", label: "Create", actions: ["CREATE"] },
  { id: "EDIT", label: "Edit", actions: ["EDIT"] },
  { id: "DELETE", label: "Delete", actions: ["DELETE"] },
  { id: "EXPORT", label: "Export", actions: ["EXPORT"] },
  { id: "SPECIAL", label: "Approve", actions: ["APPROVE", "MODERATE"] },
] as const;

/** Groups follow the sidebar, so admins find a module where staff see it. */
const SECTIONS: { id: string; title: string; icon: React.ElementType; modules: string[] }[] = [
  { id: "overview", title: "Overview", icon: LayoutDashboard, modules: ["DASHBOARD", "BIOS", "REPORTS"] },
  {
    id: "community",
    title: "Community & Members",
    icon: Users,
    modules: [
      "COMMUNITY", "MEMBERS", "BILLING", "PAYMENTS", "MEMBERSHIP_PLANS", "ATTENDANCE",
      "CHECK_IN", "TRAINING_STREAMS", "COMMUNITY_REPORTS", "COMMUNITY_ANALYTICS",
    ],
  },
  {
    id: "member-connect",
    title: "Member Connect",
    icon: Megaphone,
    modules: [
      "MEMBER_CONNECT", "PROMOTIONS_CAMPAIGN", "REFERRALS", "LEADS", "FOLLOW_UPS", "MESSAGING",
      "AUTOMATIONS", "POST_WORKOUT_CHECKIN", "MEMBER_CONNECT_REPORTS", "MEMBER_CONNECT_ANALYTICS",
    ],
  },
  {
    id: "sales",
    title: "Sales & Purchases",
    icon: ShoppingCart,
    modules: [
      "SALES_PURCHASES", "POINT_OF_SALE", "PRODUCTS", "CATEGORY", "PURCHASE_ORDER", "PURCHASE",
      "WASTAGE_RETURNS", "PRODUCTION_RECIPE", "SALES_REPORTS", "SALES_ANALYTICS",
    ],
  },
  {
    id: "financials",
    title: "Financials",
    icon: Landmark,
    modules: [
      "FINANCIALS", "LEDGERS", "RECEIPT_VOUCHER", "JOURNAL_VOUCHER", "PAYMENT_VOUCHER",
      "BANK_RECONCILIATIONS", "EXPENSES", "TAX_COMPLIANCE", "FISCAL_PERIODS",
      "FINANCIAL_REPORTS", "FINANCIAL_ANALYTICS",
    ],
  },
  {
    id: "payroll",
    title: "Payroll & Employees",
    icon: UserCog,
    modules: [
      "STAFF", "TRAINERS", "TRAININGS_CLASSES", "BOOKINGS", "PAYROLL", "SALARY_PAYMENTS",
      "SALARY_ADVANCES", "PAYROLL_REPORTS", "PAYROLL_ANALYTICS",
    ],
  },
  {
    id: "system",
    title: "System & Administration",
    icon: Settings2,
    modules: ["ADMINISTRATION", "SETTINGS", "GYMOS", "BRANCH_MANAGEMENT", "ASSETS"],
  },
  { id: "platform", title: "Platform (GymBios only)", icon: Globe, modules: ["GYM_MANAGEMENT", "PLATFORM_LEADS"] },
];

const PLATFORM_MODULES = new Set(["GYM_MANAGEMENT", "PLATFORM_LEADS"]);

const MODULE_INFO: Record<string, { label: string; hint?: string }> = {
  DASHBOARD: { label: "Dashboard" },
  BIOS: { label: "BiOS", hint: "Business intelligence" },
  REPORTS: { label: "Reports", hint: "Day & membership reports" },
  COMMUNITY: { label: "Community feed", hint: "Moderate = hide members' posts" },
  MEMBERS: { label: "Members", hint: "Approve also shows the Approvals page" },
  BILLING: { label: "Billing" },
  PAYMENTS: { label: "Payments" },
  MEMBERSHIP_PLANS: { label: "Membership Plans", hint: "Plans, add-ons, facilities" },
  ATTENDANCE: { label: "Attendance" },
  CHECK_IN: { label: "Check-in" },
  TRAINING_STREAMS: { label: "Training Streams" },
  COMMUNITY_REPORTS: { label: "Community Reports" },
  COMMUNITY_ANALYTICS: { label: "Community Analytics" },
  MEMBER_CONNECT: { label: "Member Connect", hint: "Section overview" },
  PROMOTIONS_CAMPAIGN: { label: "Promotions & Campaigns" },
  REFERRALS: { label: "Referrals & Rewards" },
  LEADS: { label: "Leads" },
  FOLLOW_UPS: { label: "Follow-ups" },
  MESSAGING: { label: "Messaging" },
  AUTOMATIONS: { label: "Automations" },
  POST_WORKOUT_CHECKIN: { label: "Post-workout Check-in" },
  MEMBER_CONNECT_REPORTS: { label: "Member Connect Reports" },
  MEMBER_CONNECT_ANALYTICS: { label: "Member Connect Analytics" },
  SALES_PURCHASES: { label: "Sales & Purchases", hint: "Section overview, sales invoices" },
  POINT_OF_SALE: { label: "Point of Sale" },
  PRODUCTS: { label: "Products", hint: "Products, warehouses, labels" },
  CATEGORY: { label: "Categories & Brands" },
  PURCHASE_ORDER: { label: "Purchase Orders", hint: "Purchase orders, suppliers" },
  PURCHASE: { label: "Purchases", hint: "Supplier bills, receiving stock" },
  WASTAGE_RETURNS: { label: "Wastage & Returns" },
  PRODUCTION_RECIPE: { label: "Production & Recipes" },
  SALES_REPORTS: { label: "Sales Reports" },
  SALES_ANALYTICS: { label: "Sales Analytics" },
  FINANCIALS: { label: "Financials", hint: "Section overview" },
  LEDGERS: { label: "Ledgers", hint: "Accounts, cost centres" },
  RECEIPT_VOUCHER: { label: "Receipt Vouchers" },
  JOURNAL_VOUCHER: { label: "Journal Vouchers" },
  PAYMENT_VOUCHER: { label: "Payment Vouchers" },
  BANK_RECONCILIATIONS: { label: "Bank Reconciliation" },
  EXPENSES: { label: "Expenses" },
  TAX_COMPLIANCE: { label: "Tax Compliance" },
  FISCAL_PERIODS: { label: "Fiscal Periods" },
  FINANCIAL_REPORTS: { label: "Financial Reports" },
  FINANCIAL_ANALYTICS: { label: "Financial Analytics" },
  STAFF: { label: "Staffs & Trainers", hint: "Staff records, logins, roles" },
  TRAINERS: { label: "Trainers" },
  TRAININGS_CLASSES: { label: "Trainings & Classes" },
  BOOKINGS: { label: "Bookings" },
  PAYROLL: { label: "Payroll" },
  SALARY_PAYMENTS: { label: "Salary Payments" },
  SALARY_ADVANCES: { label: "Salary Advances" },
  PAYROLL_REPORTS: { label: "Payroll Reports" },
  PAYROLL_ANALYTICS: { label: "Payroll Analytics" },
  ADMINISTRATION: { label: "Roles & Permissions", hint: "Manage roles like this one" },
  SETTINGS: { label: "Settings" },
  GYMOS: { label: "GymOS", hint: "Devices, integrations, modules" },
  BRANCH_MANAGEMENT: { label: "Branch Management" },
  ASSETS: { label: "Assets" },
  GYM_MANAGEMENT: { label: "Gym Management" },
  PLATFORM_LEADS: { label: "Platform Leads" },
};

function moduleLabel(module: string): string {
  return (
    MODULE_INFO[module]?.label ??
    module
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
}

const PLATFORM_OWNER_ROLE = "GYMBIOS_ADMIN";
const GYM_OWNER_ROLE = "ADMIN";

const roleIs = (role: Role | null | undefined, name: string) => role?.role_name?.toUpperCase() === name;

/** The signed-in user's role names, without the ROLE_ prefix, upper-cased. */
function myRoleNames(): string[] {
  try {
    const roles: string[] = JSON.parse(sessionStorage.getItem("roles") || "[]");
    return roles.map((r) => r.toUpperCase().replace(/^ROLE_/, ""));
  } catch {
    return [];
  }
}

// ── Small pieces ────────────────────────────────────────────────────────────

/** Native checkbox: fast for a few hundred cells, keyboard friendly, supports "partly". */
function Check({
  checked,
  indeterminate = false,
  disabled,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.check}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      title={title}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

interface FormState {
  role_name: string;
  description: string;
  permissionKeys: Set<string>;
}

const emptyForm: FormState = { role_name: "", description: "", permissionKeys: new Set() };

// ── Page ────────────────────────────────────────────────────────────────────

export function RolesPermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [originalKeys, setOriginalKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const myPermissions = usePermissions();
  const canView = hasPermission("ADMINISTRATION_VIEW");
  const myRoles = useMemo(() => myRoleNames(), [myPermissions]);
  const iAmPlatformOwner = myRoles.includes(PLATFORM_OWNER_ROLE);
  // Mirrors RoleService.assertCanGrant: owners can grant anything, everyone else
  // only what they hold themselves.
  const iAmOwner = iAmPlatformOwner || myRoles.includes(GYM_OWNER_ROLE) || myRoles.includes("SUPER_ADMIN");

  /** module -> actions it supports, in catalog order. */
  const moduleActions = useMemo(() => {
    const map = new Map<string, string[]>();
    catalog.forEach((mod) => map.set(mod.module, mod.permissions.map((p) => p.action)));
    return map;
  }, [catalog]);

  /** Sections with only the modules the backend actually has; unknown modules go to "Other". */
  const sections = useMemo(() => {
    const placed = new Set<string>();
    const result = SECTIONS.filter((s) => s.id !== "platform" || iAmPlatformOwner)
      .map((s) => {
        const modules = s.modules.filter((m) => moduleActions.has(m));
        modules.forEach((m) => placed.add(m));
        return { ...s, modules };
      })
      .filter((s) => s.modules.length > 0);
    const others = catalog
      .map((m) => m.module)
      .filter((m) => !placed.has(m) && (iAmPlatformOwner || !PLATFORM_MODULES.has(m)));
    if (others.length) result.push({ id: "other", title: "Other", icon: Layers, modules: others });
    return result;
  }, [catalog, moduleActions, iAmPlatformOwner]);

  /** Every key a gym role can hold (platform keys only count for the platform owner). */
  const grantableTotal = useMemo(
    () =>
      catalog
        .filter((m) => iAmPlatformOwner || !PLATFORM_MODULES.has(m.module))
        .reduce((n, m) => n + m.permissions.length, 0),
    [catalog, iAmPlatformOwner],
  );

  const loadRoles = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const result = await rolesService.getRoles(search, page, 10);
      setRoles(result.data);
      setTotalPages(Math.max(1, result.pagination.total_pages));
    } catch (err: any) {
      toast.error(err.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [search, page, canView]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (!canView) return;
    rolesService
      .getPermissionCatalog()
      .then(setCatalog)
      .catch((err) => toast.error(err.message || "Failed to load permission catalog"));
  }, [canView]);

  const openEditor = (role: Role | null) => {
    setEditingRole(role);
    const keys = new Set(role?.permission_keys || []);
    setForm(role ? { role_name: role.role_name, description: role.description || "", permissionKeys: keys } : emptyForm);
    setOriginalKeys(keys);
    setModuleSearch("");
    // A new role starts with everything open; an existing one opens where it has access.
    setOpenSections(
      new Set(
        role
          ? SECTIONS.filter((s) => s.modules.some((m) => Array.from(keys).some((k) => k.startsWith(`${m}_`)))).map((s) => s.id)
          : SECTIONS.map((s) => s.id),
      ),
    );
    setDialogOpen(true);
  };

  // Fixed roles: the platform owner (Gym Management only) and the gym owner (everything).
  const lockedReason = roleIs(editingRole, PLATFORM_OWNER_ROLE)
    ? "GYMBIOS_ADMIN is the platform owner's role. It is fixed to Gym Management and Platform Leads and can't be changed here."
    : roleIs(editingRole, GYM_OWNER_ROLE)
      ? "ADMIN is the gym owner's role. It always has full access to every module, so owners can never lock themselves out. Create a separate role for restricted managers."
      : null;
  const matrixLocked = !!lockedReason;
  const canEditRoles = hasPermission("ADMINISTRATION_EDIT");
  // Someone with view-only access to this page can open a role to inspect it.
  const readOnly = !!editingRole && !canEditRoles;
  const editable = !matrixLocked && !readOnly;
  const nameLocked = !editable || !!editingRole?.is_system;

  /** Why a key can't be ticked by this user, or null when it can. */
  const grantBlockReason = (key: string): string | null => {
    if (matrixLocked) return "This role's permissions are fixed";
    if (readOnly) return "You can view roles but not change them";
    if (iAmOwner || originalKeys.has(key) || myPermissions.includes(key)) return null;
    return "You can only grant permissions you have yourself";
  };

  /** Apply a change to a set of keys, keeping VIEW consistent: any action implies VIEW,
   * and removing VIEW removes the module's other actions. */
  const applyChange = (changes: { module: string; action: string; on: boolean }[]) => {
    setForm((f) => {
      const next = new Set(f.permissionKeys);
      for (const { module, action, on } of changes) {
        const key = `${module}_${action}`;
        if (grantBlockReason(key) && on) continue;
        if (on) {
          next.add(key);
          const viewKey = `${module}_VIEW`;
          if (action !== "VIEW" && moduleActions.get(module)?.includes("VIEW") && !grantBlockReason(viewKey)) next.add(viewKey);
        } else {
          next.delete(key);
          if (action === "VIEW") moduleActions.get(module)?.forEach((a) => next.delete(`${module}_${a}`));
        }
      }
      return { ...f, permissionKeys: next };
    });
  };

  const setModules = (modules: string[], on: boolean, onlyActions?: readonly string[]) => {
    const changes: { module: string; action: string; on: boolean }[] = [];
    modules.forEach((module) =>
      (moduleActions.get(module) || [])
        .filter((a) => !onlyActions || onlyActions.includes(a))
        .forEach((action) => changes.push({ module, action, on })),
    );
    // Turning things off: do VIEW last so it doesn't wipe actions we're still iterating.
    applyChange(on ? changes : changes.sort((a, b) => Number(a.action === "VIEW") - Number(b.action === "VIEW")));
  };

  const keysOf = (modules: string[], onlyActions?: readonly string[]) =>
    modules.flatMap((m) =>
      (moduleActions.get(m) || []).filter((a) => !onlyActions || onlyActions.includes(a)).map((a) => `${m}_${a}`),
    );

  const stateOf = (keys: string[]) => {
    const granted = keys.filter((k) => form.permissionKeys.has(k)).length;
    return { granted, total: keys.length, all: keys.length > 0 && granted === keys.length, some: granted > 0 };
  };

  const filteredSections = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        modules: s.title.toLowerCase().includes(q)
          ? s.modules
          : s.modules.filter((m) => `${moduleLabel(m)} ${MODULE_INFO[m]?.hint ?? ""} ${m}`.toLowerCase().includes(q)),
      }))
      .filter((s) => s.modules.length > 0);
  }, [sections, moduleSearch]);

  const visibleKeys = useMemo(() => new Set(sections.flatMap((s) => keysOf(s.modules))), [sections, moduleActions]);
  const grantedCount = Array.from(form.permissionKeys).filter((k) => visibleKeys.has(k)).length;
  const grantedModules = new Set(
    Array.from(form.permissionKeys)
      .filter((k) => visibleKeys.has(k))
      .map((k) => k.replace(/_(VIEW|CREATE|EDIT|DELETE|EXPORT|APPROVE|MODERATE)$/, "")),
  ).size;

  const handleSubmit = async () => {
    if (!form.role_name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: RoleRequestData = {
        role_name: form.role_name.trim(),
        description: form.description.trim() || undefined,
        permission_keys: Array.from(form.permissionKeys),
      };
      if (matrixLocked) delete (payload as Partial<RoleRequestData>).permission_keys;
      if (editingRole) {
        await rolesService.updateRole(editingRole.id, payload);
        toast.success(`"${payload.role_name}" updated. Staff with this role get the changes within a minute.`);
      } else {
        await rolesService.createRole(payload);
        toast.success(`Role "${payload.role_name}" created. Assign it to staff in Staffs & Trainers.`);
      }
      setDialogOpen(false);
      loadRoles();
      // In case this was the signed-in user's own role.
      void authService.refreshPermissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rolesService.deleteRole(deleteTarget.id);
      toast.success("Role deleted");
      setDeleteTarget(null);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (role: Role) => {
    setDuplicatingId(role.id);
    try {
      const copy = await rolesService.duplicateRole(role.id);
      toast.success(`Created "${copy.role_name}" — edit it to adjust permissions`);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate role");
    } finally {
      setDuplicatingId(null);
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-muted-foreground">
          You don't have permission to view this page.
        </Card>
      </div>
    );
  }

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const searching = moduleSearch.trim().length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Administration</p>
          <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground">
            A role decides what each staff member can see and do. Assign roles in Staffs &amp; Trainers.
          </p>
        </div>
        <PermissionGate permission="ADMINISTRATION_CREATE">
          <Button onClick={() => openEditor(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </PermissionGate>
      </div>

      <Card className="p-4 border-0 shadow-md">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-10 border-0 shadow-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No roles found.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => {
                  const isPlatform = roleIs(role, PLATFORM_OWNER_ROLE);
                  const isGymOwner = roleIs(role, GYM_OWNER_ROLE);
                  const count = role.permission_keys.length;
                  const modules = new Set(
                    role.permission_keys.map((k) => k.replace(/_(VIEW|CREATE|EDIT|DELETE|EXPORT|APPROVE|MODERATE)$/, "")),
                  ).size;
                  const pct = grantableTotal ? Math.min(100, Math.round((count / grantableTotal) * 100)) : 0;
                  const deleteBlocked = role.is_system
                    ? "System roles can't be deleted"
                    : role.user_count > 0
                      ? `Assigned to ${role.user_count} user${role.user_count === 1 ? "" : "s"} — move them to another role first`
                      : null;
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{role.role_name}</span>
                          {isGymOwner && (
                            <Badge className="gap-1">
                              <Crown className="h-3 w-3" /> Owner · Full access
                            </Badge>
                          )}
                          {isPlatform && (
                            <Badge className="gap-1">
                              <ShieldCheck className="h-3 w-3" /> Platform owner
                            </Badge>
                          )}
                          {role.is_system && !isGymOwner && !isPlatform && (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" /> System
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {role.description || "—"}
                      </TableCell>
                      <TableCell>{role.user_count}</TableCell>
                      <TableCell>
                        {isGymOwner ? (
                          <span className="text-sm text-muted-foreground">Every module</span>
                        ) : isPlatform ? (
                          <span className="text-sm text-muted-foreground">Gym Management only</span>
                        ) : (
                          <div className={styles.permSummary}>
                            <div className={styles.permMeter}>
                              <span style={{ width: `${pct}%` }} />
                            </div>
                            <span className={styles.permText}>
                              {count === 0
                                ? "No access yet"
                                : `${count} permission${count === 1 ? "" : "s"} · ${modules} module${modules === 1 ? "" : "s"}`}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGate permission="ADMINISTRATION_EDIT" fallback={
                            <Button variant="ghost" size="icon" title="View permissions" onClick={() => openEditor(role)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          }>
                            <Button variant="ghost" size="icon" title="Edit role" onClick={() => openEditor(role)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission="ADMINISTRATION_CREATE">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Duplicate role"
                              onClick={() => handleDuplicate(role)}
                              disabled={duplicatingId === role.id}
                            >
                              {duplicatingId === role.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission="ADMINISTRATION_DELETE">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!!deleteBlocked}
                              title={deleteBlocked ?? "Delete role"}
                              onClick={() => setDeleteTarget(role)}
                            >
                              <Trash2 className={`h-4 w-4 ${deleteBlocked ? "text-muted-foreground" : "text-destructive"}`} />
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className={`${styles.dialog} p-0`}>
          <div className={styles.dialogHeader}>
            <DialogTitle>
              {editingRole ? (editable ? `Edit role · ${editingRole.role_name}` : editingRole.role_name) : "Create role"}
            </DialogTitle>
            <DialogDescription className={styles.dialogSubtitle}>
              Tick what people with this role can do in each module. Changes apply to everyone with the role.
            </DialogDescription>
          </div>

          <div className={styles.dialogBody}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <Label htmlFor="role-name">Role name *</Label>
                <Input
                  id="role-name"
                  value={form.role_name}
                  disabled={nameLocked}
                  placeholder="e.g. Front Desk"
                  onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))}
                />
                {nameLocked && <span className={styles.fieldHint}>System roles can't be renamed.</span>}
              </div>
              <div className={styles.field}>
                <Label htmlFor="role-description">Description</Label>
                <Input
                  id="role-description"
                  value={form.description}
                  placeholder="What this role is for"
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {lockedReason && (
              <div className={styles.banner}>
                <Info className="h-4 w-4" />
                <span>{lockedReason}</span>
              </div>
            )}
            {editable && !iAmOwner && (
              <div className={styles.banner}>
                <Info className="h-4 w-4" />
                <span>You can only grant permissions you have yourself. Boxes you can't tick are dimmed.</span>
              </div>
            )}

            <div className={styles.toolbar}>
              <div className={styles.toolbarTitle}>
                Module permissions
                <small>Ticking any action also grants View. Removing View clears the row.</small>
              </div>
              <div className={styles.searchBox}>
                <Search />
                <input
                  type="search"
                  placeholder="Find a module..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  aria-label="Find a module"
                />
              </div>
              <button
                type="button"
                className={styles.linkButton}
                disabled={!editable}
                onClick={() => setModules(sections.flatMap((s) => s.modules), true, ["VIEW"])}
              >
                <Eye /> View on all modules
              </button>
              <button
                type="button"
                className={styles.linkButton}
                disabled={!editable || form.permissionKeys.size === 0}
                onClick={() => setForm((f) => ({ ...f, permissionKeys: new Set() }))}
              >
                <RotateCcw /> Clear all
              </button>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() =>
                  setOpenSections(openSections.size >= sections.length ? new Set() : new Set(sections.map((s) => s.id)))
                }
              >
                {openSections.size >= sections.length ? "Collapse all" : "Expand all"}
              </button>
            </div>

            <div className={styles.sections}>
              {filteredSections.length === 0 && <div className={styles.empty}>No module matches "{moduleSearch}".</div>}
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const sectionKeys = keysOf(section.modules);
                const sectionState = stateOf(sectionKeys);
                const isOpen = searching || openSections.has(section.id);
                return (
                  <div key={section.id} className={styles.section}>
                    <div
                      className={styles.sectionHeader}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => toggleSection(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSection(section.id);
                        }
                      }}
                    >
                      <ChevronRight className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} />
                      <span className={styles.sectionIcon}>
                        <Icon />
                      </span>
                      <span className={styles.sectionTitle}>{section.title}</span>
                      <span className={`${styles.sectionCount} ${sectionState.some ? styles.sectionCountActive : ""}`}>
                        {sectionState.granted} / {sectionState.total}
                      </span>
                      <label className={styles.sectionToggle} onClick={(e) => e.stopPropagation()}>
                        <Check
                          checked={sectionState.all}
                          indeterminate={sectionState.some}
                          disabled={!editable}
                          label={`Grant everything in ${section.title}`}
                          onChange={(on) => setModules(section.modules, on)}
                        />
                        All
                      </label>
                    </div>

                    {isOpen && (
                      <div className={styles.matrixScroll}>
                        {/* A checkbox grid reads as a grid on phones too: scroll sideways rather
                            than the responsive layer's stacked-card layout. */}
                        <table className={styles.matrix} data-gb-keep-table="">
                          <thead>
                            <tr>
                              <th className={styles.moduleCol}>Module</th>
                              {COLUMNS.map((col) => {
                                const colKeys = keysOf(section.modules, col.actions);
                                const colState = stateOf(colKeys);
                                return (
                                  <th key={col.id}>
                                    <span className={styles.colHeader}>
                                      {col.label}
                                      {colKeys.length > 0 ? (
                                        <Check
                                          checked={colState.all}
                                          indeterminate={colState.some}
                                          disabled={!editable}
                                          label={`${col.label} for every module in ${section.title}`}
                                          title={`${col.label}: whole section`}
                                          onChange={(on) => setModules(section.modules, on, col.actions)}
                                        />
                                      ) : (
                                        <span className={styles.na}>–</span>
                                      )}
                                    </span>
                                  </th>
                                );
                              })}
                              <th className={styles.allCol}>All</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.modules.map((module) => {
                              const actions = moduleActions.get(module) || [];
                              const rowKeys = keysOf([module]);
                              const rowState = stateOf(rowKeys);
                              const hint = MODULE_INFO[module]?.hint;
                              return (
                                <tr key={module} className={rowState.some ? styles.rowGranted : undefined}>
                                  <td className={styles.moduleCol}>
                                    <span className={styles.moduleName}>{moduleLabel(module)}</span>
                                    {hint && <span className={styles.moduleHint}>{hint}</span>}
                                  </td>
                                  {COLUMNS.map((col) => {
                                    const action = col.actions.find((a) => actions.includes(a));
                                    if (!action) {
                                      return (
                                        <td key={col.id}>
                                          <span className={styles.na} aria-hidden>–</span>
                                        </td>
                                      );
                                    }
                                    const key = `${module}_${action}`;
                                    const checked = form.permissionKeys.has(key);
                                    const blocked = grantBlockReason(key);
                                    return (
                                      <td key={col.id}>
                                        <Check
                                          checked={checked}
                                          disabled={!!blocked}
                                          title={blocked ?? undefined}
                                          label={`${moduleLabel(module)}: ${action.toLowerCase()}`}
                                          onChange={(on) => applyChange([{ module, action, on }])}
                                        />
                                        {action === "MODERATE" && <span className={styles.cellLabel}>Moderate</span>}
                                        {/* Members › Approve is what puts "Approvals" in the sidebar. */}
                                        {key === "MEMBERS_APPROVE" && <span className={styles.cellLabel}>Approvals page</span>}
                                      </td>
                                    );
                                  })}
                                  <td className={styles.allCol}>
                                    <Check
                                      checked={rowState.all}
                                      indeterminate={rowState.some}
                                      disabled={!editable}
                                      label={`Everything in ${moduleLabel(module)}`}
                                      onChange={(on) => setModules([module], on)}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.dialogFooter}>
            <span className={styles.footerSummary}>
              {`${grantedCount} of ${visibleKeys.size} permissions · ${grantedModules} module${grantedModules === 1 ? "" : "s"}`}
              {matrixLocked ? " · fixed" : readOnly ? " · read only" : ""}
            </span>
            <div className={styles.footerActions}>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                {readOnly ? "Close" : "Cancel"}
              </Button>
              {!readOnly && (
                <Button onClick={handleSubmit} disabled={saving || roleIs(editingRole, PLATFORM_OWNER_ROLE)}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRole ? "Save changes" : "Create role"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{deleteTarget?.role_name}" role. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
