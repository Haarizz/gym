import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseClient = createClient(supabaseUrl, publicAnonKey);
const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

class AuthService {
  private user: User | null = null;
  private accessToken: string | null = null;
  private tokenSource: "supabase" | "backend" | "demo" | null = null;

  // Initialize auth service and check for existing session
  async initialize(): Promise<boolean> {
    try {
      // Check for existing session in Supabase
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Auth initialization error:', error);
      }

      if (session?.access_token) {
        // Validate session with our backend
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/make-server-0a04502f/auth/session`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              this.user = {
                id: result.data.user.id,
                email: result.data.user.email,
                name: result.data.profile.name,
                role: result.data.profile.role
              };
              this.accessToken = session.access_token;
              this.tokenSource = "supabase";
              console.log('Session restored successfully');
              return true;
            }
          }
        } catch (sessionError) {
          console.log('Session validation failed, checking fallback options');
        }
      }

      // Restore demo mode session if enabled
      const demoMode = localStorage.getItem('gymbios_demo_mode') === 'true';
      if (demoMode) {
        this.user = {
          id: 'demo_admin_user',
          email: 'demo@example.com',
          name: 'Gym Manager',
          role: 'gym_manager'
        };
        this.accessToken = 'demo_token';
        this.tokenSource = "demo";
        console.log('Demo mode restored from localStorage');
        return true;
      }

      // Restore backend session from localStorage (Spring Boot auth)
      const storedToken = localStorage.getItem("token");
      const storedUserRaw = localStorage.getItem("gymbios_user");
      const storedUsername = localStorage.getItem("username");
      const storedRolesRaw = localStorage.getItem("roles");
      const storedEmail = localStorage.getItem("gymbios_email");
      const storedSource = localStorage.getItem("gymbios_auth_source");

      if (storedToken) {
        let storedUser: Partial<User> = {};
        if (storedUserRaw) {
          try {
            storedUser = JSON.parse(storedUserRaw);
          } catch (parseError) {
            console.log("Failed to parse stored user:", parseError);
          }
        }

        let roles: string[] = [];
        if (storedRolesRaw) {
          try {
            roles = JSON.parse(storedRolesRaw);
          } catch (parseError) {
            console.log("Failed to parse stored roles:", parseError);
          }
        }

        const role = storedUser.role || (roles[0] ? roles[0].toLowerCase() : "user");
        const username = storedUser.name || storedUsername || "User";
        const email =
          storedUser.email ||
          storedEmail ||
          (storedUsername && storedUsername.includes("@") ? storedUsername : "user@example.com");

        this.user = {
          id: storedUser.id || `backend_${username}`,
          email,
          name: username,
          role
        };
        this.accessToken = storedToken;
        this.tokenSource = storedSource === "supabase" ? "supabase" : "backend";
        console.log("Restored backend session from localStorage");
        return true;
      }

      // Try demo auto-login if no other authentication found
      console.log('No existing session found, checking for demo auto-login');
      return false;
    } catch (error) {
      console.error('Auth initialization error:', error);
      return false;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      // Try Spring Boot backend auth first
      try {
        const response = await fetch(`${backendBaseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: email, password })
        });

        if (response.ok) {
          const result = await response.json();
          const roles = Array.isArray(result.roles) ? result.roles : [];
          const username = result.username || email;

          this.user = {
            id: `backend_${username}`,
            email: email,
            name: username,
            role: roles[0] ? roles[0].toLowerCase() : 'user'
          };
          this.accessToken = result.token;
          this.tokenSource = "backend";

          localStorage.setItem('token', result.token);
          localStorage.setItem('username', username);
          localStorage.setItem('roles', JSON.stringify(roles));
          localStorage.setItem('gymbios_email', email);
          localStorage.setItem('gymbios_user', JSON.stringify(this.user));
          localStorage.setItem('gymbios_auth', 'true');
          localStorage.setItem('gymbios_auth_source', 'backend');
          localStorage.removeItem('gymbios_demo_mode');

          return { success: true };
        }

        if (response.status === 401 || response.status === 400) {
          return { success: false, error: 'Invalid email or password. Please try again.' };
        }
      } catch (backendError) {
        console.error('Backend signin failed:', backendError);
      }

      // Try Supabase auth for non-demo accounts
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signin error:', error);
        
        // Fallback to backend signin
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/make-server-0a04502f/auth/signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });

          const result = await response.json();
          
          if (!result.success) {
            return { success: false, error: result.error || 'Invalid email or password. Please try again.' };
          }

          if (result.data.session) {
            this.user = {
              id: result.data.user.id,
              email: result.data.user.email,
              name: result.data.profile.name,
              role: result.data.profile.role
            };
            this.accessToken = result.data.session.access_token;
            return { success: true };
          }
        } catch (backendError) {
          console.error('Backend signin also failed:', backendError);
          return { success: false, error: 'Authentication service unavailable. Please try again later.' };
        }
      } else {
        // Successful Supabase signin
        this.user = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || 'User',
          role: data.user.user_metadata?.role || 'gym_manager'
        };
        this.accessToken = data.session.access_token;
        this.tokenSource = "supabase";
      }

      return { success: true };
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: 'Failed to sign in. Please check your connection and try again.' };
    }
  }

  // Sign up new user
  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/make-server-0a04502f/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });

      const result = await response.json();
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Failed to create account' };
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Check if demo mode was active
      const wasDemoMode = this.isDemoMode();
      const wasBackendAuth = this.tokenSource === "backend" || localStorage.getItem("gymbios_auth_source") === "backend";
      
      if (this.accessToken && !wasDemoMode && !wasBackendAuth) {
        // Sign out from backend (only for non-demo users)
        await fetch(`${supabaseUrl}/functions/v1/make-server-0a04502f/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // Sign out from Supabase (only for non-demo users)
      if (!wasDemoMode && !wasBackendAuth) {
        await supabaseClient.auth.signOut();
      }
      
      // Clean up demo mode if it was active
      if (wasDemoMode) {
        localStorage.removeItem('gymbios_demo_mode');
        console.log('Demo mode cleaned up on signout');
      }

      // Clean up backend auth storage
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('roles');
      localStorage.removeItem('gymbios_email');
      localStorage.removeItem('gymbios_auth');
      localStorage.removeItem('gymbios_auth_source');
      localStorage.removeItem('gymbios_user');
      
      this.user = null;
      this.accessToken = null;
      this.tokenSource = null;
    } catch (error) {
      console.error('Signout error:', error);
      // Clear local state even if API calls fail
      this.user = null;
      this.accessToken = null;
      this.tokenSource = null;
      localStorage.removeItem('gymbios_demo_mode');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('roles');
      localStorage.removeItem('gymbios_email');
      localStorage.removeItem('gymbios_auth');
      localStorage.removeItem('gymbios_auth_source');
      localStorage.removeItem('gymbios_user');
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Get access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Get current auth source
  getAuthSource(): "supabase" | "backend" | "demo" | null {
    if (this.tokenSource) return this.tokenSource;
    const storedSource = localStorage.getItem("gymbios_auth_source");
    if (storedSource === "backend" || storedSource === "supabase" || storedSource === "demo") {
      return storedSource;
    }
    return null;
  }

  // Check if authenticated via backend
  isBackendAuth(): boolean {
    return this.getAuthSource() === "backend";
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  // Check if currently using demo authentication
  isDemoMode(): boolean {
    return !!(
      this.accessToken?.startsWith('demo_') || 
      this.accessToken === 'demo_token' || 
      this.user?.id?.includes('demo') || 
      this.user?.id === 'demo_admin' ||
      this.user?.id === 'demo_admin_user' ||
      localStorage.getItem('gymbios_demo_mode') === 'true'
    );
  }

  // Test authentication by making a test API call
  async testAuthentication(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const response = await this.makeAuthenticatedRequest(`${supabaseUrl}/functions/v1/make-server-0a04502f/test-auth`);
      const result = await response.json();
      
      return {
        success: result.success,
        error: result.error,
        details: {
          status: response.status,
          authHeader: result.authHeader,
          user: result.user,
          localUser: this.user,
          localToken: this.accessToken ? this.accessToken.substring(0, 20) + '...' : null
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          localUser: this.user,
          localToken: this.accessToken ? this.accessToken.substring(0, 20) + '...' : null
        }
      };
    }
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const isSupabaseRequest =
      url.startsWith(supabaseUrl) || url.includes(".supabase.co") || url.includes("/functions/v1/");

    let token: string | null = null;

    if (isSupabaseRequest) {
      if (this.tokenSource === "supabase" && this.accessToken) {
        token = this.accessToken;
      } else if (this.tokenSource === "demo") {
        token = this.accessToken || "demo_token";
      } else {
        token = publicAnonKey;
      }
    } else {
      token = this.accessToken || localStorage.getItem("token");
    }

    if (!token) {
      console.log("No auth token available for request");
    }

    console.log(
      `Making authenticated request to: ${url} with token type: ${
        token?.startsWith("demo_")
          ? "demo"
          : token === publicAnonKey
            ? "anon"
            : this.tokenSource || "unknown"
      }`
    );

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Request failed with status ${response.status}:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        token: token.substring(0, 20) + '...',
        user: this.user,
        isAuthenticated: this.isAuthenticated()
      });
    }

    return response;
  }
}

// Export singleton instance
export const authService = new AuthService();
