import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
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
import { Plus, Search, Pencil, Trash2, Copy, Loader2, ShieldCheck, Lock } from "lucide-react";
import {
  rolesService,
  Role,
  RoleRequestData,
  PermissionCatalogModule,
} from "../utils/supabase/roles-service";
import { PermissionGate, hasPermission } from "../utils/permissions";

const ACTION_COLUMNS = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "APPROVE"];

function moduleLabel(module: string): string {
  return module
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface FormState {
  role_name: string;
  description: string;
  permissionKeys: Set<string>;
}

const emptyForm: FormState = { role_name: "", description: "", permissionKeys: new Set() };

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
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const canView = hasPermission("ADMINISTRATION_VIEW");

  const applicableActions = useMemo(() => {
    const map = new Map<string, Set<string>>();
    catalog.forEach((mod) => {
      map.set(mod.module, new Set(mod.permissions.map((p) => p.action)));
    });
    return map;
  }, [catalog]);

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

  const isAdmin = (role: Role | null) => role?.role_name?.toUpperCase() === "ADMIN";

  const openCreateDialog = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setForm({
      role_name: role.role_name,
      description: role.description || "",
      permissionKeys: new Set(role.permission_keys || []),
    });
    setDialogOpen(true);
  };

  const togglePermission = (key: string) => {
    setForm((f) => {
      const next = new Set(f.permissionKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...f, permissionKeys: next };
    });
  };

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
      if (editingRole) {
        await rolesService.updateRole(editingRole.id, payload);
        toast.success("Role updated");
      } else {
        await rolesService.createRole(payload);
        toast.success("Role created");
      }
      setDialogOpen(false);
      loadRoles();
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
      await rolesService.duplicateRole(role.id);
      toast.success(`Duplicated "${role.role_name}"`);
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

  const editingIsAdmin = isAdmin(editingRole);
  const editingNameLocked = editingIsAdmin || !!editingRole?.is_system;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Administration</p>
          <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
        </div>
        <PermissionGate permission="ADMINISTRATION_CREATE">
          <Button onClick={openCreateDialog}>
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
                <TableHead>Permissions</TableHead>
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
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.role_name}</span>
                        {role.is_system && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" /> System
                          </Badge>
                        )}
                        {isAdmin(role) && (
                          <Badge className="gap-1">
                            <ShieldCheck className="h-3 w-3" /> All access
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>{role.user_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isAdmin(role) ? "All modules" : `${role.permission_keys.length} permission(s)`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <PermissionGate permission="ADMINISTRATION_EDIT">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(role)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="ADMINISTRATION_CREATE">
                          <Button
                            variant="ghost"
                            size="icon"
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
                            disabled={role.is_system}
                            title={role.is_system ? "System roles cannot be deleted" : undefined}
                            onClick={() => setDeleteTarget(role)}
                          >
                            <Trash2 className={`h-4 w-4 ${role.is_system ? "text-muted-foreground" : "text-destructive"}`} />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role Name *</Label>
                <Input
                  value={form.role_name}
                  disabled={editingNameLocked}
                  onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {editingIsAdmin && (
              <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">
                ADMIN always has every permission and cannot be reduced. The matrix below is shown for reference only.
              </p>
            )}

            <div>
              <p className="font-medium mb-2">Module Permissions</p>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      {ACTION_COLUMNS.map((action) => (
                        <TableHead key={action} className="text-center">
                          {action.charAt(0) + action.slice(1).toLowerCase()}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalog.map((mod) => {
                      const actionsForModule = applicableActions.get(mod.module) || new Set();
                      return (
                        <TableRow key={mod.module}>
                          <TableCell className="font-medium">{moduleLabel(mod.module)}</TableCell>
                          {ACTION_COLUMNS.map((action) => {
                            const key = `${mod.module}_${action}`;
                            const applicable = actionsForModule.has(action);
                            const checked = editingIsAdmin ? applicable : form.permissionKeys.has(key);
                            return (
                              <TableCell key={action} className="text-center">
                                <Checkbox
                                  checked={applicable && checked}
                                  disabled={!applicable || editingIsAdmin}
                                  onCheckedChange={() => togglePermission(key)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || editingIsAdmin}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
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
