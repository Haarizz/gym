import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  DialogFooter,
  DialogHeader,
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
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Card } from "../components/ui/card";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  KeyRound,
  ImagePlus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { staffService, Staff, StaffRequestData } from "../utils/supabase/staff-service";
import { authService } from "../utils/supabase/auth-service";
import { PermissionGate, hasPermission } from "../utils/permissions";

const SECURITY_ROLES = ["Admin", "Receptionist", "Trainer", "Accountant", "Manager"];

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

interface StaffFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  join_date: string;
  base_salary: string;
  status: "active" | "inactive";
  photo_url: string;
  role: string;
  enable_login: boolean;
  app_username: string;
  app_password: string;
  app_confirm_password: string;
}

const emptyForm: StaffFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  join_date: "",
  base_salary: "",
  status: "active",
  photo_url: "",
  role: "Receptionist",
  enable_login: false,
  app_username: "",
  app_password: "",
  app_confirm_password: "",
};

export function AdministrationStaff() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canView = hasPermission("STAFF_VIEW");

  const loadStaff = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const result = await staffService.getStaff(
        { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
        page,
        10
      );
      setStaffList(result.items);
      setTotalPages(Math.max(1, result.pagination.total_pages));
    } catch (err: any) {
      toast.error(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, canView]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openAddDialog = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setUsernameStatus("idle");
    setDialogOpen(true);
  };

  const openEditDialog = (staff: Staff) => {
    setEditingStaff(staff);
    setForm({
      name: staff.name || "",
      phone: staff.phone || "",
      email: staff.email || "",
      address: staff.address || "",
      join_date: staff.join_date || "",
      base_salary: staff.base_salary != null ? String(staff.base_salary) : "",
      status: staff.status === "inactive" ? "inactive" : "active",
      photo_url: staff.photo_url || "",
      role: SECURITY_ROLES.find((r) => r.toLowerCase() === (staff.role || "").toLowerCase()) || staff.role || "Receptionist",
      enable_login: !!staff.app_access_enabled,
      app_username: staff.app_username || "",
      app_password: "",
      app_confirm_password: "",
    });
    setUsernameStatus("idle");
    setDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo_url: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const checkUsername = async (username: string) => {
    if (!username || username === editingStaff?.app_username) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    try {
      const response = await authService.makeAuthenticatedRequest(
        `${backendBaseUrl}/auth/check-username?username=${encodeURIComponent(username)}`
      );
      const data = await response.json();
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Full name and email are required");
      return;
    }
    if (form.enable_login) {
      if (!editingStaff?.user_id && (!form.app_username.trim() || !form.app_password)) {
        toast.error("Username and password are required to enable login");
        return;
      }
      if (form.app_password && form.app_password !== form.app_confirm_password) {
        toast.error("Passwords do not match");
        return;
      }
      if (form.app_password && form.app_password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (usernameStatus === "taken") {
        toast.error("That username is already taken");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Partial<StaffRequestData> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        status: form.status,
        address: form.address.trim(),
        photo_url: form.photo_url || undefined,
        join_date: form.join_date || undefined,
        base_salary: form.base_salary ? Number(form.base_salary) : undefined,
        enable_login: form.enable_login,
        app_username: form.app_username.trim() || undefined,
        app_password: form.app_password || undefined,
      };

      if (editingStaff) {
        await staffService.updateStaff(editingStaff.id, payload);
        toast.success("Staff member updated");
      } else {
        await staffService.createStaff(payload as StaffRequestData);
        toast.success("Staff member created");
      }
      setDialogOpen(false);
      loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await staffService.deleteStaff(deleteTarget.id);
      toast.success("Staff member removed");
      setDeleteTarget(null);
      loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete staff member");
    } finally {
      setDeleting(false);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Administration</p>
          <h1 className="text-2xl font-bold">Staff</h1>
        </div>
        <PermissionGate permission="STAFF_CREATE">
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </PermissionGate>
      </div>

      <Card className="p-4 border-0 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="pl-10 border-0 shadow-sm"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setPage(1);
              setStatusFilter(v);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {staff.photo_url && <AvatarImage src={staff.photo_url} alt={staff.name} />}
                          <AvatarFallback>
                            {staff.name?.slice(0, 2).toUpperCase() || "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.staff_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{staff.email}</p>
                      <p className="text-xs text-muted-foreground">{staff.phone}</p>
                    </TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell>
                      <Badge variant={staff.status === "active" ? "default" : "secondary"}>
                        {staff.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {staff.app_username ? (
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{staff.app_username}</span>
                          <Badge variant={staff.app_access_enabled ? "default" : "outline"} className="ml-1">
                            {staff.app_access_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No login</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <PermissionGate permission="STAFF_EDIT">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(staff)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="STAFF_DELETE">
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(staff)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {form.photo_url && <AvatarImage src={form.photo_url} alt="Profile" />}
                <AvatarFallback>{form.name?.slice(0, 2).toUpperCase() || "ST"}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary">
                  <ImagePlus className="h-4 w-4" />
                  {form.photo_url ? "Change photo" : "Upload photo (optional)"}
                </Label>
                <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                {form.photo_url && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-destructive mt-1"
                    onClick={() => setForm((f) => ({ ...f, photo_url: "" }))}
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Joining Date</Label>
                <Input type="date" value={form.join_date} onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Salary (optional)</Label>
                <Input
                  type="number"
                  value={form.base_salary}
                  onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as "active" | "inactive" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">App Login Credentials</p>
                  <p className="text-xs text-muted-foreground">
                    Let this staff member log in to the GymBios web app.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-login"
                    checked={form.enable_login}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, enable_login: checked === true }))}
                  />
                  <Label htmlFor="enable-login">Enable Login</Label>
                </div>
              </div>

              {form.enable_login && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Username</Label>
                    <Input
                      value={form.app_username}
                      onChange={(e) => setForm((f) => ({ ...f, app_username: e.target.value }))}
                      onBlur={(e) => checkUsername(e.target.value.trim())}
                      disabled={!!editingStaff?.user_id}
                    />
                    {usernameStatus === "checking" && (
                      <p className="text-xs text-muted-foreground">Checking availability...</p>
                    )}
                    {usernameStatus === "available" && (
                      <p className="text-xs text-emerald-600">Username is available</p>
                    )}
                    {usernameStatus === "taken" && (
                      <p className="text-xs text-destructive">Username is already taken</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{editingStaff?.user_id ? "New Password" : "Password"}</Label>
                    <Input
                      type="password"
                      value={form.app_password}
                      onChange={(e) => setForm((f) => ({ ...f, app_password: e.target.value }))}
                      placeholder={editingStaff?.user_id ? "Leave blank to keep current" : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      value={form.app_confirm_password}
                      onChange={(e) => setForm((f) => ({ ...f, app_confirm_password: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStaff ? "Save Changes" : "Create Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.name} and their app login access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
