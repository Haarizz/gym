/**
 * Auth service — Spring Boot JWT only.
 * Supabase has been removed. All authentication goes through /api/auth/*.
 */

import { setPermissions } from "../permissions";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  roleName?: string;
  staffName?: string;
  backendUserId?: number;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

class AuthService {
  private user: User | null = null;
  private accessToken: string | null = null;

  // ── Session lifecycle ────────────────────────────────────────────────────

  /** Restore session from sessionStorage on app load. */
  async initialize(): Promise<boolean> {
    const storedToken = sessionStorage.getItem("token");
    if (!storedToken) return false;

    // Try to reconstruct user from stored data
    const storedUserRaw = sessionStorage.getItem("gymbios_user");
    if (storedUserRaw) {
      try {
        this.user = JSON.parse(storedUserRaw);
      } catch {
        // ignore parse errors
      }
    }

    if (!this.user) {
      const username  = sessionStorage.getItem("username")     || "User";
      const email     = sessionStorage.getItem("gymbios_email")|| "user@example.com";
      const rolesRaw  = sessionStorage.getItem("roles");
      const roles: string[] = rolesRaw ? JSON.parse(rolesRaw) : [];

      this.user = {
        id:    `backend_${username}`,
        email,
        name:  sessionStorage.getItem("gymbios_staff_name") || username,
        role:  roles[0]?.toLowerCase() || "user",
        roleName: sessionStorage.getItem("gymbios_role_name") || roles[0],
        staffName: sessionStorage.getItem("gymbios_staff_name") || undefined,
        backendUserId: Number(sessionStorage.getItem("userId") ?? NaN) || undefined,
      };
    }

    // Restore the fine-grained permission cache alongside the session (survives refresh).
    try {
      const permissionsRaw = sessionStorage.getItem("gymbios_permissions");
      setPermissions(permissionsRaw ? JSON.parse(permissionsRaw) : []);
    } catch {
      setPermissions([]);
    }

    this.accessToken = storedToken;
    return true;
  }

  // ── Auth operations ──────────────────────────────────────────────────────

  async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${backendBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      if (response.ok) {
        const result = await response.json();
        const roles: string[] = Array.isArray(result.roles) ? result.roles : [];
        const permissions: string[] = Array.isArray(result.permissions) ? result.permissions : [];
        const roleName: string | undefined = result.roleName ?? result.role_name ?? roles[0];
        const staffName: string | undefined = result.staffName ?? result.staff_name;
        // A gym owner has no Staff record, so staffName is always empty for them —
        // gymName (their own gym's name, e.g. "Power Gym") is a far better sidebar
        // label than falling all the way back to their raw login email, which is
        // what happened before this field existed (confirmed live: "powergym@
        // gmail.com" shown as the display name instead of any real name).
        const gymName: string | undefined = result.gymName ?? result.gym_name;
        const username = result.username || email;

        this.user = {
          id:   `backend_${username}`,
          email,
          name: staffName || gymName || username,
          role: roles[0]?.toLowerCase() || "user",
          roleName,
          staffName,
          backendUserId:
            typeof (result.userId ?? result.user_id) === "number"
              ? (result.userId ?? result.user_id)
              : Number(result.userId ?? result.user_id) || undefined,
        };
        this.accessToken = result.token;

        sessionStorage.setItem("token",              result.token);
        sessionStorage.setItem("username",           username);
        sessionStorage.setItem("roles",              JSON.stringify(roles));
        if (result.userId != null || result.user_id != null) sessionStorage.setItem("userId", String(result.userId ?? result.user_id));
        sessionStorage.setItem("gymbios_email",      email);
        sessionStorage.setItem("gymbios_user",       JSON.stringify(this.user));
        sessionStorage.setItem("gymbios_auth",       "true");
        sessionStorage.setItem("gymbios_auth_source","backend");
        if (roleName) sessionStorage.setItem("gymbios_role_name", roleName);
        if (staffName) sessionStorage.setItem("gymbios_staff_name", staffName);
        
        // Branch context initialization
        const accessibleBranchesRaw = result.accessibleBranches ?? result.accessible_branches;
        if (accessibleBranchesRaw) {
          const mappedBranches = accessibleBranchesRaw.map((b: any) => ({
            id: b.id,
            branchName: b.branchName ?? b.branch_name,
            branchCode: b.branchCode ?? b.branch_code,
            isDefault: b.isDefault ?? b.is_default
          }));
          sessionStorage.setItem("accessibleBranches", JSON.stringify(mappedBranches));
        }
        
        const defaultBranchId = result.defaultBranchId ?? result.default_branch_id;
        const canAccessAllBranches = result.canAccessAllBranches ?? result.can_access_all_branches;
        
        if (defaultBranchId) {
          sessionStorage.setItem("activeBranchId", String(defaultBranchId));
        } else if (accessibleBranchesRaw && accessibleBranchesRaw.length > 0) {
          sessionStorage.setItem("activeBranchId", String(accessibleBranchesRaw[0].id));
        } else if (canAccessAllBranches) {
          sessionStorage.setItem("activeBranchId", "null");
        }

        setPermissions(permissions);

        return { success: true };
      }

      if (response.status === 401 || response.status === 400) {
        return { success: false, error: "Invalid credentials. Please try again." };
      }

      return { success: false, error: "Login failed. Please try again." };
    } catch {
      return { success: false, error: "Cannot connect to server. Please check your connection." };
    }
  }

  async signUp(
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${backendBaseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, email, password }),
      });

      if (response.ok) return { success: true };

      const result = await response.json().catch(() => ({}));
      return { success: false, error: result.message || "Registration failed." };
    } catch {
      return { success: false, error: "Cannot connect to server." };
    }
  }

  async signOut(): Promise<void> {
    this.user        = null;
    this.accessToken = null;

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("roles");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("gymbios_email");
    sessionStorage.removeItem("gymbios_user");
    sessionStorage.removeItem("gymbios_auth");
    sessionStorage.removeItem("gymbios_auth_source");
    sessionStorage.removeItem("gymbios_demo_mode");
    sessionStorage.removeItem("gymbios_role_name");
    sessionStorage.removeItem("gymbios_staff_name");
    sessionStorage.removeItem("accessibleBranches");
    sessionStorage.removeItem("activeBranchId");
    setPermissions([]);
  }

  // ── State accessors ──────────────────────────────────────────────────────

  getCurrentUser(): User | null {
    return this.user;
  }

  getAccessToken(): string | null {
    return this.accessToken || sessionStorage.getItem("token");
  }

  isAuthenticated(): boolean {
    return this.user !== null && this.getAccessToken() !== null;
  }

  /** Always true when authenticated — kept for compatibility with service files. */
  isBackendAuth(): boolean {
    return this.isAuthenticated();
  }

  /** Always false — demo mode removed. Kept for compatibility. */
  isDemoMode(): boolean {
    return false;
  }

  getAuthSource(): "backend" | null {
    return this.isAuthenticated() ? "backend" : null;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `${backendBaseUrl}/auth/change-password`,
        { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }
      );
      if (response.ok) return { success: true };
      const message = await response.text().catch(() => "");
      return { success: false, error: message || "Failed to change password." };
    } catch {
      return { success: false, error: "Cannot connect to server. Please check your connection." };
    }
  }

  // ── HTTP helper ──────────────────────────────────────────────────────────

  /** Make a fetch request with the JWT bearer token attached. */
  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAccessToken();
    const activeBranchId = sessionStorage.getItem('activeBranchId');
    const isAllBranches = activeBranchId === null || activeBranchId === 'null' || activeBranchId === 'undefined';
    const branchHeader = !isAllBranches 
      ? { "X-Active-Branch-Id": activeBranchId } 
      : {};

    // Block mutating requests when in "All Branches" mode
    if (isAllBranches && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
      // Allow auth operations to pass through
      if (!url.includes('/auth/')) {
        return new Response(
          JSON.stringify({ error: "All Branches mode is read-only. Please select a specific branch to make changes." }), 
          {
            status: 403,
            statusText: "Forbidden",
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...branchHeader,
        ...(options.headers as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }
}

export const authService = new AuthService();
