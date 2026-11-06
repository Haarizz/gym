/**
 * Fine-grained permission utilities for the Administration → Roles & Permissions
 * module. Permission keys look like "MEMBERS_VIEW", "STAFF_EDIT", "PAYROLL_APPROVE"
 * — see PermissionCatalog on the backend for the full module x action catalog.
 *
 * Populated from the login response's `permissions` array (see auth-service.tsx),
 * persisted to sessionStorage so a page refresh doesn't lose them.
 */
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "gymbios_permissions";
const PERMISSIONS_CHANGED_EVENT = "gymbios:permissions-changed";

let permissionsCache: string[] = [];
try {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  permissionsCache = stored ? JSON.parse(stored) : [];
} catch {
  permissionsCache = [];
}

/** Call after login (and on logout with an empty array) to update the cache everywhere. */
export function setPermissions(permissions: string[] | null | undefined): void {
  permissionsCache = Array.isArray(permissions) ? permissions : [];
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(permissionsCache));
  window.dispatchEvent(new Event(PERMISSIONS_CHANGED_EVENT));
}

export function getPermissions(): string[] {
  return permissionsCache;
}

/** Plain function usable outside React components/hooks. */
export function hasPermission(permissionKey: string): boolean {
  return permissionsCache.includes(permissionKey);
}

/**
 * True for the gym owner's roles (ADMIN / SUPER_ADMIN), read from the login's stored roles —
 * the same check App.tsx uses for GYM_OWNER_ONLY pages. GYMBIOS_ADMIN (platform) is not one.
 */
export function isGymAdminRole(): boolean {
  const norm = (r: string | null | undefined) => (r ?? "").toLowerCase().replace("role_", "");
  let roles: string[] = [];
  try { roles = JSON.parse(sessionStorage.getItem("roles") || "[]") as string[]; } catch { roles = []; }
  const all = [...roles.map(norm), norm(sessionStorage.getItem("gymbios_role_name"))];
  if (all.includes("gymbios_admin")) return false;
  return all.includes("admin") || all.includes("super_admin");
}

/** True if the user has at least one of the given permission keys. */
export function hasAnyPermission(permissionKeys: string[]): boolean {
  return permissionKeys.some((key) => permissionsCache.includes(key));
}

/** React hook — re-renders when permissions change (login/logout/role edit refresh). */
export function usePermission(permissionKey: string): boolean {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const handler = () => forceRender((n) => n + 1);
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handler);
  }, []);
  return hasPermission(permissionKey);
}

export function usePermissions(): string[] {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const handler = () => forceRender((n) => n + 1);
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handler);
  }, []);
  return permissionsCache;
}

interface PermissionGateProps {
  permission?: string;
  anyOf?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Renders children only if the user has the given permission (or any of `anyOf`). */
export function PermissionGate({ permission, anyOf, fallback = null, children }: PermissionGateProps) {
  usePermissions(); // subscribe so this re-renders when permissions change
  const allowed = permission ? hasPermission(permission) : anyOf ? hasAnyPermission(anyOf) : true;
  return <>{allowed ? children : fallback}</>;
}
