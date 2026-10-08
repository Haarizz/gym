import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseClient = createClient(supabaseUrl, publicAnonKey);

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
              console.log('Session restored successfully');
              return true;
            }
          }
        } catch (sessionError) {
          console.log('Session validation failed, checking fallback options');
        }
      }

      // Check localStorage for fallback (temporary during migration)
      const savedAuth = localStorage.getItem("gymbios_auth");
      const savedUser = localStorage.getItem("gymbios_user");

      if (savedAuth === "true" && savedUser) {
        const userData = JSON.parse(savedUser);
        this.user = {
          id: 'demo_fallback_user',
          email: userData.email,
          name: userData.name,
          role: 'gym_manager'
        };
        this.accessToken = 'demo_token';
        console.log('Using localStorage fallback authentication');
        // Clear old localStorage auth - this is temporary
        localStorage.removeItem("gymbios_auth");
        localStorage.removeItem("gymbios_user");
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
      // Always use demo authentication for demo credentials
      if (email === 'admin@gymbios.com' && password === 'Gbu@bios') {
        
        console.log('Demo credentials detected, using demo authentication');
        
        // Set demo user and token
        this.user = {
          id: 'demo_admin_user',
          email: 'admin@gymbios.com',
          name: 'Gym Manager',
          role: 'gym_manager'
        };
        this.accessToken = 'demo_token_' + Date.now();
        
        // Mark demo mode as active
        localStorage.setItem('gymbios_demo_mode', 'true');
        
        console.log('Demo authentication successful:', {
          user: this.user,
          hasToken: !!this.accessToken,
          demoMode: true
        });
        
        return { success: true };
      }

      // Try Supabase auth for non-demo accounts
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Supabase auth failed - this is expected if no user exists in Supabase auth
        // Silently fallback to backend signin without logging error
        
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
      
      if (this.accessToken && !wasDemoMode) {
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
      if (!wasDemoMode) {
        await supabaseClient.auth.signOut();
      }
      
      // Clean up demo mode if it was active
      if (wasDemoMode) {
        localStorage.removeItem('gymbios_demo_mode');
        console.log('Demo mode cleaned up on signout');
      }
      
      this.user = null;
      this.accessToken = null;
    } catch (error) {
      console.error('Signout error:', error);
      // Clear local state even if API calls fail
      this.user = null;
      this.accessToken = null;
      localStorage.removeItem('gymbios_demo_mode');
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
      this.user?.email === 'admin@gymbios.com' ||
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
    let token = this.accessToken;
    
    // If no access token but user is authenticated (demo mode), use demo token
    if (!token && this.user) {
      token = 'demo_token';
      console.log('Using demo token for authenticated request');
    }
    
    // Fallback to public anon key
    if (!token) {
      token = publicAnonKey;
      console.log('Using public anon key for request');
    }
    
    console.log(`Making authenticated request to: ${url} with token type: ${token.startsWith('demo_') ? 'demo' : token === publicAnonKey ? 'anon' : 'supabase'}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
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