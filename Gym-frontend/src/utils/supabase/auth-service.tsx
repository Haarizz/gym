/**
 * Auth service — Spring Boot JWT only.
 * Supabase has been removed. All authentication goes through /api/auth/*.
 */

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
        name:  username,
        role:  roles[0]?.toLowerCase() || "user",
        backendUserId: Number(sessionStorage.getItem("userId") ?? NaN) || undefined,
      };
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
        const username = result.username || email;

        this.user = {
          id:   `backend_${username}`,
          email,
          name: username,
          role: roles[0]?.toLowerCase() || "user",
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

  // ── HTTP helper ──────────────────────────────────────────────────────────

  /** Make a fetch request with the JWT bearer token attached. */
  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAccessToken();

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }
}

export const authService = new AuthService();
