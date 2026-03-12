import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize demo user on startup
const initializeDemoData = async () => {
  try {
    // Check if demo user profile exists
    const demoProfile = await kv.get('user_profile_demo_admin_user');
    if (!demoProfile) {
      // Create demo user profile
      await kv.set('user_profile_demo_admin_user', {
        id: 'demo_admin_user',
        email: 'demo@example.com',
        name: 'Gym Manager',
        role: 'gym_manager',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      console.log('Demo user profile initialized');
    }
  } catch (error) {
    console.log('Failed to initialize demo data:', error);
  }
};

// Initialize demo data
initializeDemoData();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-0a04502f/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test auth endpoint
app.get("/make-server-0a04502f/test-auth", async (c) => {
  try {
    console.log('Test auth endpoint called');
    const authHeader = c.req.header('Authorization');
    console.log('Auth header received:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'null');
    
    const { user, error } = await validateUser(authHeader);
    console.log('Validation result:', { user: user ? { id: user.id, email: user.email } : null, error });
    
    const response = {
      success: !error,
      authHeader: authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : null,
      user: user ? { id: user.id, email: user.email } : null,
      error,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending response:', response);
    return c.json(response);
  } catch (error) {
    console.log('Test auth error:', error);
    return c.json({ 
      success: false, 
      error: `Test auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Dashboard KPI endpoint
app.get("/make-server-0a04502f/dashboard/kpis", async (c) => {
  try {
    const period = c.req.query('period') || 'today';
    
    // Get or initialize dashboard KPIs
    let kpiData = await kv.get(`dashboard_kpis_${period}`);
    
    if (!kpiData) {
      // Initialize with sample data if not exists
      const baseKPIs = {
        today: {
          revenue: 2850,
          revenueChange: 8.5,
          activeMembers: 410,
          membersChange: 3.2,
          todayAttendance: 127,
          attendanceChange: 12.5,
          availableStaff: 3
        },
        week: {
          revenue: 25500,
          revenueChange: 15.2,
          activeMembers: 410,
          membersChange: 3.2,
          todayAttendance: 892,
          attendanceChange: 8.7,
          availableStaff: 3
        },
        month: {
          revenue: 107000,
          revenueChange: 12.3,
          activeMembers: 410,
          membersChange: 8.1,
          todayAttendance: 3850,
          attendanceChange: 18.2,
          availableStaff: 3
        },
        lastMonth: {
          revenue: 95500,
          revenueChange: -2.1,
          activeMembers: 378,
          membersChange: -1.5,
          todayAttendance: 3260,
          attendanceChange: -5.2,
          availableStaff: 3
        }
      };
      
      // Store initial data
      for (const [key, value] of Object.entries(baseKPIs)) {
        await kv.set(`dashboard_kpis_${key}`, value);
      }
      
      kpiData = baseKPIs[period] || baseKPIs.today;
    }
    
    return c.json({ success: true, data: kpiData });
  } catch (error) {
    console.log('Dashboard KPIs error:', error);
    return c.json({ success: false, error: 'Failed to fetch KPI data' }, 500);
  }
});

// Dashboard revenue data endpoint
app.get("/make-server-0a04502f/dashboard/revenue", async (c) => {
  try {
    const period = c.req.query('period') || 'today';
    
    let revenueData = await kv.get(`dashboard_revenue_${period}`);
    
    if (!revenueData) {
      // Initialize with sample data
      const baseRevenue = {
        today: [
          { time: '9 AM', revenue: 450, target: 400 },
          { time: '12 PM', revenue: 1200, target: 1000 },
          { time: '3 PM', revenue: 1850, target: 1600 },
          { time: '6 PM', revenue: 2400, target: 2200 },
          { time: '9 PM', revenue: 2850, target: 2800 }
        ],
        week: [
          { day: 'Mon', revenue: 2850, target: 2800 },
          { day: 'Tue', revenue: 3200, target: 2800 },
          { day: 'Wed', revenue: 2950, target: 2800 },
          { day: 'Thu', revenue: 3400, target: 2800 },
          { day: 'Fri', revenue: 4200, target: 2800 },
          { day: 'Sat', revenue: 5100, target: 2800 },
          { day: 'Sun', revenue: 3800, target: 2800 }
        ],
        month: [
          { week: 'Week 1', revenue: 22000, target: 20000 },
          { week: 'Week 2', revenue: 25000, target: 20000 },
          { week: 'Week 3', revenue: 28000, target: 20000 },
          { week: 'Week 4', revenue: 32000, target: 20000 }
        ]
      };
      
      // Store initial data
      for (const [key, value] of Object.entries(baseRevenue)) {
        await kv.set(`dashboard_revenue_${key}`, value);
      }
      
      revenueData = baseRevenue[period] || baseRevenue.today;
    }
    
    return c.json({ success: true, data: revenueData });
  } catch (error) {
    console.log('Dashboard revenue error:', error);
    return c.json({ success: false, error: 'Failed to fetch revenue data' }, 500);
  }
});

// Dashboard membership distribution endpoint
app.get("/make-server-0a04502f/dashboard/membership-distribution", async (c) => {
  try {
    let membershipData = await kv.get('dashboard_membership_distribution');
    
    if (!membershipData) {
      // Initialize with sample data
      membershipData = [
        { name: 'Basic', value: 120, color: '#10b981', amount: 36000 },
        { name: 'Premium', value: 180, color: '#3b82f6', amount: 90000 },
        { name: 'VIP', value: 85, color: '#8b5cf6', amount: 68000 },
        { name: 'Corporate', value: 25, color: '#f59e0b', amount: 25000 }
      ];
      
      await kv.set('dashboard_membership_distribution', membershipData);
    }
    
    return c.json({ success: true, data: membershipData });
  } catch (error) {
    console.log('Dashboard membership distribution error:', error);
    return c.json({ success: false, error: 'Failed to fetch membership distribution' }, 500);
  }
});

// Dashboard class attendance endpoint
app.get("/make-server-0a04502f/dashboard/class-attendance", async (c) => {
  try {
    let classAttendanceData = await kv.get('dashboard_class_attendance');
    
    if (!classAttendanceData) {
      // Initialize with sample data
      classAttendanceData = [
        { class: 'Yoga', capacity: 20, attended: 18, percentage: 90 },
        { class: 'HIIT', capacity: 15, attended: 14, percentage: 93 },
        { class: 'Pilates', capacity: 12, attended: 10, percentage: 83 },
        { class: 'Strength Training', capacity: 25, attended: 22, percentage: 88 },
        { class: 'Cardio Blast', capacity: 20, attended: 19, percentage: 95 },
        { class: 'Zumba', capacity: 30, attended: 25, percentage: 83 }
      ];
      
      await kv.set('dashboard_class_attendance', classAttendanceData);
    }
    
    return c.json({ success: true, data: classAttendanceData });
  } catch (error) {
    console.log('Dashboard class attendance error:', error);
    return c.json({ success: false, error: 'Failed to fetch class attendance data' }, 500);
  }
});

// Dashboard recent members endpoint
app.get("/make-server-0a04502f/dashboard/recent-members", async (c) => {
  try {
    let recentMembers = await kv.get('dashboard_recent_members');
    
    if (!recentMembers) {
      // Initialize with sample data
      const now = new Date();
      recentMembers = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+971-50-123-4567',
          membershipType: 'Premium',
          joinDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: 'active'
        },
        {
          id: '2',
          name: 'Ahmed Al-Rashid',
          email: 'ahmed.rashid@email.com',
          phone: '+971-55-234-5678',
          membershipType: 'VIP',
          joinDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          status: 'active'
        },
        {
          id: '3',
          name: 'Maria Santos',
          email: 'maria.santos@email.com',
          phone: '+971-56-345-6789',
          membershipType: 'Basic',
          joinDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          status: 'active'
        },
        {
          id: '4',
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+971-52-456-7890',
          membershipType: 'Premium',
          joinDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          status: 'active'
        }
      ];
      
      await kv.set('dashboard_recent_members', recentMembers);
    }
    
    return c.json({ success: true, data: recentMembers });
  } catch (error) {
    console.log('Dashboard recent members error:', error);
    return c.json({ success: false, error: 'Failed to fetch recent members data' }, 500);
  }
});

// Dashboard notifications endpoint
app.get("/make-server-0a04502f/dashboard/notifications", async (c) => {
  try {
    let notifications = await kv.get('dashboard_notifications');
    
    if (!notifications) {
      // Initialize with sample data
      const now = new Date();
      notifications = [
        {
          id: '1',
          type: 'alert',
          title: 'Payment Reminder',
          message: '15 members have overdue payments',
          timestamp: now.toISOString(),
          isRead: false,
          actionUrl: '/billing'
        },
        {
          id: '2',
          type: 'warning',
          title: 'Expiring Memberships',
          message: '8 memberships expire this week',
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          actionUrl: '/members'
        },
        {
          id: '3',
          type: 'info',
          title: 'Equipment Maintenance',
          message: 'Treadmill 3 scheduled for maintenance tomorrow',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          isRead: true
        },
        {
          id: '4',
          type: 'success',
          title: 'Monthly Target Achieved',
          message: 'Revenue target for September reached!',
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          isRead: true
        },
        {
          id: '5',
          type: 'alert',
          title: 'Low Stock Alert',
          message: 'Protein supplements running low',
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          actionUrl: '/products'
        }
      ];
      
      await kv.set('dashboard_notifications', notifications);
    }
    
    return c.json({ success: true, data: notifications });
  } catch (error) {
    console.log('Dashboard notifications error:', error);
    return c.json({ success: false, error: 'Failed to fetch notifications data' }, 500);
  }
});

// Dashboard staff members endpoint
app.get("/make-server-0a04502f/dashboard/staff", async (c) => {
  try {
    let staffMembers = await kv.get('dashboard_staff_members');
    
    if (!staffMembers) {
      // Initialize with sample data
      staffMembers = [
        {
          id: '1',
          name: 'Mike Johnson',
          role: 'Personal Trainer',
          status: 'available',
          clockedIn: true
        },
        {
          id: '2',
          name: 'Lisa Ahmed',
          role: 'Reception',
          status: 'available',
          clockedIn: true
        },
        {
          id: '3',
          name: 'Carlos Rodriguez',
          role: 'Fitness Instructor',
          status: 'busy',
          clockedIn: true
        },
        {
          id: '4',
          name: 'Emma Wilson',
          role: 'Nutritionist',
          status: 'available',
          clockedIn: true
        },
        {
          id: '5',
          name: 'David Chen',
          role: 'Manager',
          status: 'offline',
          clockedIn: false
        }
      ];
      
      await kv.set('dashboard_staff_members', staffMembers);
    }
    
    return c.json({ success: true, data: staffMembers });
  } catch (error) {
    console.log('Dashboard staff error:', error);
    return c.json({ success: false, error: 'Failed to fetch staff data' }, 500);
  }
});

// Search members endpoint
app.get("/make-server-0a04502f/dashboard/search-members", async (c) => {
  try {
    const query = c.req.query('q') || '';
    
    if (!query.trim()) {
      return c.json({ success: true, data: [] });
    }
    
    // Get all members (in a real app, this would be optimized with proper search indexing)
    let allMembers = await kv.get('dashboard_all_members');
    
    if (!allMembers) {
      // Initialize with sample data
      allMembers = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+971-50-123-4567',
          membershipType: 'Premium',
          joinDate: new Date().toISOString(),
          status: 'active'
        },
        {
          id: '2',
          name: 'Ahmed Al-Rashid',
          email: 'ahmed.rashid@email.com',
          phone: '+971-55-234-5678',
          membershipType: 'VIP',
          joinDate: new Date().toISOString(),
          status: 'active'
        },
        {
          id: '3',
          name: 'Maria Santos',
          email: 'maria.santos@email.com',
          phone: '+971-56-345-6789',
          membershipType: 'Basic',
          joinDate: new Date().toISOString(),
          status: 'active'
        },
        {
          id: '4',
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+971-52-456-7890',
          membershipType: 'Premium',
          joinDate: new Date().toISOString(),
          status: 'active'
        },
        {
          id: '5',
          name: 'Emily Chen',
          email: 'emily.chen@email.com',
          phone: '+971-55-987-6543',
          membershipType: 'VIP',
          joinDate: new Date().toISOString(),
          status: 'active'
        }
      ];
      
      await kv.set('dashboard_all_members', allMembers);
    }
    
    // Filter members based on search query
    const filteredMembers = allMembers.filter(member => 
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.email.toLowerCase().includes(query.toLowerCase()) ||
      member.phone.includes(query) ||
      member.id.includes(query)
    );
    
    return c.json({ success: true, data: filteredMembers.slice(0, 10) }); // Limit to 10 results
  } catch (error) {
    console.log('Search members error:', error);
    return c.json({ success: false, error: 'Failed to search members' }, 500);
  }
});

// Update KPI endpoint
app.post("/make-server-0a04502f/dashboard/update-kpi", async (c) => {
  try {
    const { period, kpiData } = await c.req.json();
    
    if (!period || !kpiData) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    await kv.set(`dashboard_kpis_${period}`, kpiData);
    
    return c.json({ success: true, message: 'KPI data updated successfully' });
  } catch (error) {
    console.log('Update KPI error:', error);
    return c.json({ success: false, error: 'Failed to update KPI data' }, 500);
  }
});

// Helper function to validate user authentication
async function validateUser(authHeader: string | null) {
  console.log('Validating user with auth header:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'null');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid authorization header');
    return { user: null, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.split(' ')[1];
  
  // Handle demo tokens - be very permissive for demo
  if (token.startsWith('demo_') || token === 'demo_token' || token.includes('demo')) {
    console.log('Using demo token authentication - token:', token.substring(0, 20) + '...');
    const demoUser = { 
      id: 'demo_admin_user',
      email: 'demo@example.com',
      user_metadata: {
        name: 'Gym Manager',
        role: 'gym_manager'
      }
    };
    console.log('Demo user validated successfully:', demoUser);
    return { user: demoUser, error: null };
  }
  
  // Handle public anon key fallback
  if (token === supabaseAnonKey) {
    console.log('Using public anon key authentication');
    return { 
      user: { 
        id: 'anon_user',
        email: 'anonymous@gymbios.com',
        user_metadata: {
          name: 'Anonymous User',
          role: 'gym_manager'
        }
      }, 
      error: null 
    };
  }
  
  // Try Supabase validation
  try {
    console.log('Attempting Supabase token validation');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Supabase token validation failed:', error?.message || 'No user returned');
      return { user: null, error: 'Invalid or expired token' };
    }
    
    console.log('Supabase token validation successful');
    return { user, error: null };
  } catch (error) {
    console.log('Token validation error:', error);
    return { user: null, error: 'Invalid or expired token' };
  }
}

// ==================== AUTHENTICATION ENDPOINTS ====================

// User signup endpoint
app.post("/make-server-0a04502f/auth/signup", async (c) => {
  try {
    const { email, password, name, role = 'gym_manager' } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log('Signup error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
    
    // Create user profile in our system
    await kv.set(`user_profile_${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    return c.json({ 
      success: true, 
      data: { 
        user: data.user,
        profile: { name, role }
      } 
    });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }
});

// User signin endpoint
app.post("/make-server-0a04502f/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ success: false, error: 'Missing email or password' }, 400);
    }

    // Try Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log('Signin error:', error);
      return c.json({ success: false, error: 'Invalid email or password. Please try again.' }, 401);
    }
    
    // Get user profile
    const profile = await kv.get(`user_profile_${data.user.id}`);
    
    return c.json({ 
      success: true, 
      data: { 
        session: data.session,
        user: data.user,
        profile: profile || { 
          name: data.user.user_metadata?.name || 'User',
          role: data.user.user_metadata?.role || 'gym_manager'
        }
      } 
    });
  } catch (error) {
    console.log('Signin error:', error);
    return c.json({ success: false, error: 'Failed to sign in' }, 500);
  }
});

// Check current session endpoint
app.get("/make-server-0a04502f/auth/session", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error || !user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401);
    }
    
    // Get user profile
    const profile = await kv.get(`user_profile_${user.id}`);
    
    return c.json({ 
      success: true, 
      data: { 
        user,
        profile: profile || { 
          name: user.user_metadata?.name || 'User',
          role: user.user_metadata?.role || 'gym_manager'
        }
      } 
    });
  } catch (error) {
    console.log('Session check error:', error);
    return c.json({ success: false, error: 'Failed to check session' }, 500);
  }
});

// Signout endpoint
app.post("/make-server-0a04502f/auth/signout", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'No authorization header' }, 400);
    }
    
    const token = authHeader.split(' ')[1];
    const { error } = await supabase.auth.admin.signOut(token);
    
    if (error) {
      console.log('Signout error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
    
    return c.json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    console.log('Signout error:', error);
    return c.json({ success: false, error: 'Failed to sign out' }, 500);
  }
});

// ==================== MEMBERS MANAGEMENT ENDPOINTS ====================

// Get all members
app.get("/make-server-0a04502f/members", async (c) => {
  try {
    console.log('Members endpoint called');
    const authHeader = c.req.header('Authorization');
    console.log('Members auth header:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'null');
    
    const { user, error } = await validateUser(authHeader);
    console.log('Members auth validation:', { user: user ? { id: user.id, email: user.email } : null, error });
    
    if (error || !user) {
      console.log('Members auth failed:', error);
      return c.json({ success: false, error: error || 'Authentication required' }, 401);
    }
    
    // Get members with pagination
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const status = c.req.query('status') || '';
    
    // Get members from KV store (in production, use proper pagination)
    const membersKey = 'gym_members';
    let members = await kv.get(membersKey) || [];
    
    // Initialize with sample data if empty
    if (members.length === 0) {
      const sampleMembers = [
        {
          id: 'mem_001',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+971-50-123-4567',
          membership_type: 'Premium',
          membership_status: 'active',
          join_date: '2024-01-15T00:00:00Z',
          expiry_date: '2025-01-15T00:00:00Z',
          emergency_contact: 'Mike Johnson',
          emergency_phone: '+971-50-123-4568',
          payment_status: 'paid',
          monthly_fee: 750,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'mem_002',
          name: 'Ahmed Al-Rashid',
          email: 'ahmed.rashid@email.com',
          phone: '+971-55-234-5678',
          membership_type: 'VIP',
          membership_status: 'active',
          join_date: '2024-02-01T00:00:00Z',
          expiry_date: '2025-02-01T00:00:00Z',
          emergency_contact: 'Fatima Al-Rashid',
          emergency_phone: '+971-55-234-5679',
          payment_status: 'paid',
          monthly_fee: 1200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'mem_003',
          name: 'Maria Santos',
          email: 'maria.santos@email.com',
          phone: '+971-56-345-6789',
          membership_type: 'Basic',
          membership_status: 'active',
          join_date: '2024-03-10T00:00:00Z',
          expiry_date: '2025-03-10T00:00:00Z',
          emergency_contact: 'Carlos Santos',
          emergency_phone: '+971-56-345-6790',
          payment_status: 'overdue',
          monthly_fee: 300,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      await kv.set(membersKey, sampleMembers);
      members = sampleMembers;
    }
    
    // Filter members based on search and status
    let filteredMembers = members;
    
    if (search) {
      filteredMembers = filteredMembers.filter(member => 
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase()) ||
        member.phone.includes(search) ||
        member.id.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status) {
      filteredMembers = filteredMembers.filter(member => 
        member.membership_status === status
      );
    }
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMembers = filteredMembers.slice(startIndex, endIndex);
    
    return c.json({
      success: true,
      data: {
        members: paginatedMembers,
        pagination: {
          page,
          limit,
          total: filteredMembers.length,
          totalPages: Math.ceil(filteredMembers.length / limit)
        }
      }
    });
  } catch (error) {
    console.log('Get members error:', error);
    return c.json({ success: false, error: 'Failed to fetch members' }, 500);
  }
});

// Create new member
app.post("/make-server-0a04502f/members", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const memberData = await c.req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'membership_type'];
    for (const field of requiredFields) {
      if (!memberData[field]) {
        return c.json({ success: false, error: `Missing required field: ${field}` }, 400);
      }
    }
    
    // Generate member ID
    const memberId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newMember = {
      id: memberId,
      ...memberData,
      membership_status: 'active',
      join_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id
    };
    
    // Get existing members and add new one
    const membersKey = 'gym_members';
    const members = await kv.get(membersKey) || [];
    members.push(newMember);
    
    await kv.set(membersKey, members);
    
    // Update member count in dashboard
    const kpiData = await kv.get('dashboard_kpis_today') || {};
    kpiData.activeMembers = (kpiData.activeMembers || 0) + 1;
    await kv.set('dashboard_kpis_today', kpiData);
    
    return c.json({ success: true, data: newMember });
  } catch (error) {
    console.log('Create member error:', error);
    return c.json({ success: false, error: 'Failed to create member' }, 500);
  }
});

// Update member
app.put("/make-server-0a04502f/members/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const memberId = c.req.param('id');
    const updateData = await c.req.json();
    
    const membersKey = 'gym_members';
    const members = await kv.get(membersKey) || [];
    
    const memberIndex = members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      return c.json({ success: false, error: 'Member not found' }, 404);
    }
    
    // Update member data
    members[memberIndex] = {
      ...members[memberIndex],
      ...updateData,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    
    await kv.set(membersKey, members);
    
    return c.json({ success: true, data: members[memberIndex] });
  } catch (error) {
    console.log('Update member error:', error);
    return c.json({ success: false, error: 'Failed to update member' }, 500);
  }
});

// Delete member
app.delete("/make-server-0a04502f/members/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const memberId = c.req.param('id');
    
    const membersKey = 'gym_members';
    const members = await kv.get(membersKey) || [];
    
    const memberIndex = members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      return c.json({ success: false, error: 'Member not found' }, 404);
    }
    
    // Instead of deleting, mark as inactive
    members[memberIndex].membership_status = 'inactive';
    members[memberIndex].updated_at = new Date().toISOString();
    members[memberIndex].updated_by = user.id;
    
    await kv.set(membersKey, members);
    
    return c.json({ success: true, message: 'Member marked as inactive' });
  } catch (error) {
    console.log('Delete member error:', error);
    return c.json({ success: false, error: 'Failed to delete member' }, 500);
  }
});

// ==================== STAFF MANAGEMENT ENDPOINTS ====================

// Get all staff members
app.get("/make-server-0a04502f/staff", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const staffKey = 'gym_staff';
    let staff = await kv.get(staffKey) || [];
    
    // Initialize with sample data if empty
    if (staff.length === 0) {
      const sampleStaff = [
        {
          id: 'staff_001',
          name: 'Mike Johnson',
          email: 'mike.johnson@gymbios.com',
          phone: '+971-50-555-0001',
          role: 'Personal Trainer',
          department: 'Training',
          status: 'active',
          hire_date: '2023-06-01T00:00:00Z',
          salary: 8000,
          certifications: ['ACSM', 'NASM'],
          schedule: 'full_time',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'staff_002',
          name: 'Lisa Ahmed',
          email: 'lisa.ahmed@gymbios.com',
          phone: '+971-55-555-0002',
          role: 'Reception',
          department: 'Front Desk',
          status: 'active',
          hire_date: '2023-08-15T00:00:00Z',
          salary: 4500,
          certifications: [],
          schedule: 'full_time',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'staff_003',
          name: 'Carlos Rodriguez',
          email: 'carlos.rodriguez@gymbios.com',
          phone: '+971-56-555-0003',
          role: 'Fitness Instructor',
          department: 'Training',
          status: 'active',
          hire_date: '2023-07-01T00:00:00Z',
          salary: 6500,
          certifications: ['ACE', 'CPR'],
          schedule: 'part_time',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      await kv.set(staffKey, sampleStaff);
      staff = sampleStaff;
    }
    
    return c.json({ success: true, data: staff });
  } catch (error) {
    console.log('Get staff error:', error);
    return c.json({ success: false, error: 'Failed to fetch staff' }, 500);
  }
});

// ==================== PRODUCTS & INVENTORY ENDPOINTS ====================

// Get all products
app.get("/make-server-0a04502f/products", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const productsKey = 'gym_products';
    let products = await kv.get(productsKey) || [];
    
    // Initialize with sample data if empty
    if (products.length === 0) {
      const sampleProducts = [
        {
          id: 'prod_001',
          name: 'Whey Protein Powder',
          category: 'Supplements',
          price: 150,
          cost: 80,
          stock_quantity: 45,
          min_stock_level: 10,
          supplier: 'NutriSupply Co.',
          barcode: '1234567890123',
          description: 'Premium whey protein powder for muscle building',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prod_002',
          name: 'Energy Drink',
          category: 'Beverages',
          price: 12,
          cost: 6,
          stock_quantity: 120,
          min_stock_level: 50,
          supplier: 'Beverage Express',
          barcode: '2345678901234',
          description: 'Natural energy boost drink',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prod_003',
          name: 'Gym Towel',
          category: 'Accessories',
          price: 25,
          cost: 12,
          stock_quantity: 8,
          min_stock_level: 15,
          supplier: 'Textile World',
          barcode: '3456789012345',
          description: 'Premium microfiber gym towel',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      await kv.set(productsKey, sampleProducts);
      products = sampleProducts;
    }
    
    return c.json({ success: true, data: products });
  } catch (error) {
    console.log('Get products error:', error);
    return c.json({ success: false, error: 'Failed to fetch products' }, 500);
  }
});

// Create new product
app.post("/make-server-0a04502f/products", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const productData = await c.req.json();
    
    // Validate required fields
    const requiredFields = ['name', 'category', 'price', 'cost'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return c.json({ success: false, error: `Missing required field: ${field}` }, 400);
      }
    }
    
    const productId = `prod_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    
    const newProduct = {
      id: productId,
      ...productData,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id
    };
    
    const productsKey = 'gym_products';
    const products = await kv.get(productsKey) || [];
    products.push(newProduct);
    
    await kv.set(productsKey, products);
    
    return c.json({ success: true, data: newProduct });
  } catch (error) {
    console.log('Create product error:', error);
    return c.json({ success: false, error: 'Failed to create product' }, 500);
  }
});

// ==================== BILLING & PAYMENTS ENDPOINTS ====================

// Get billing information
app.get("/make-server-0a04502f/billing", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const billingKey = 'gym_billing';
    let billing = await kv.get(billingKey) || [];
    
    // Initialize with sample data if empty
    if (billing.length === 0) {
      const sampleBilling = [
        {
          id: 'bill_001',
          member_id: 'mem_001',
          member_name: 'Sarah Johnson',
          invoice_number: 'INV-2024-001',
          amount: 750,
          due_date: '2024-12-01T00:00:00Z',
          status: 'paid',
          payment_date: '2024-11-28T00:00:00Z',
          payment_method: 'card',
          description: 'Premium Membership - December 2024',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'bill_002',
          member_id: 'mem_003',
          member_name: 'Maria Santos',
          invoice_number: 'INV-2024-002',
          amount: 300,
          due_date: '2024-11-15T00:00:00Z',
          status: 'overdue',
          payment_date: null,
          payment_method: null,
          description: 'Basic Membership - November 2024',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      await kv.set(billingKey, sampleBilling);
      billing = sampleBilling;
    }
    
    return c.json({ success: true, data: billing });
  } catch (error) {
    console.log('Get billing error:', error);
    return c.json({ success: false, error: 'Failed to fetch billing data' }, 500);
  }
});

// ==================== ATTENDANCE TRACKING ENDPOINTS ====================

// Get attendance records
app.get("/make-server-0a04502f/attendance", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];
    const attendanceKey = `gym_attendance_${date}`;
    
    let attendance = await kv.get(attendanceKey) || [];
    
    // Initialize with sample data if empty
    if (attendance.length === 0) {
      const sampleAttendance = [
        {
          id: 'att_001',
          member_id: 'mem_001',
          member_name: 'Sarah Johnson',
          check_in_time: `${date}T09:30:00Z`,
          check_out_time: `${date}T11:00:00Z`,
          duration_minutes: 90,
          created_at: new Date().toISOString()
        },
        {
          id: 'att_002',
          member_id: 'mem_002',
          member_name: 'Ahmed Al-Rashid',
          check_in_time: `${date}T18:15:00Z`,
          check_out_time: null,
          duration_minutes: null,
          created_at: new Date().toISOString()
        }
      ];
      
      await kv.set(attendanceKey, sampleAttendance);
      attendance = sampleAttendance;
    }
    
    return c.json({ success: true, data: attendance });
  } catch (error) {
    console.log('Get attendance error:', error);
    return c.json({ success: false, error: 'Failed to fetch attendance data' }, 500);
  }
});

// Record member check-in
app.post("/make-server-0a04502f/attendance/checkin", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const { member_id, member_name } = await c.req.json();
    
    if (!member_id || !member_name) {
      return c.json({ success: false, error: 'Missing member_id or member_name' }, 400);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceKey = `gym_attendance_${today}`;
    const attendance = await kv.get(attendanceKey) || [];
    
    // Check if member is already checked in today
    const existingCheckin = attendance.find(record => 
      record.member_id === member_id && !record.check_out_time
    );
    
    if (existingCheckin) {
      return c.json({ success: false, error: 'Member already checked in' }, 400);
    }
    
    const checkinRecord = {
      id: `att_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
      member_id,
      member_name,
      check_in_time: new Date().toISOString(),
      check_out_time: null,
      duration_minutes: null,
      created_at: new Date().toISOString()
    };
    
    attendance.push(checkinRecord);
    await kv.set(attendanceKey, attendance);
    
    // Update today's attendance count in dashboard
    const kpiData = await kv.get('dashboard_kpis_today') || {};
    kpiData.todayAttendance = (kpiData.todayAttendance || 0) + 1;
    await kv.set('dashboard_kpis_today', kpiData);
    
    return c.json({ success: true, data: checkinRecord });
  } catch (error) {
    console.log('Check-in error:', error);
    return c.json({ success: false, error: 'Failed to record check-in' }, 500);
  }
});

// Record member check-out
app.post("/make-server-0a04502f/attendance/checkout", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await validateUser(authHeader);
    
    if (error) {
      return c.json({ success: false, error }, 401);
    }
    
    const { member_id } = await c.req.json();
    
    if (!member_id) {
      return c.json({ success: false, error: 'Missing member_id' }, 400);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceKey = `gym_attendance_${today}`;
    const attendance = await kv.get(attendanceKey) || [];
    
    // Find the active check-in record
    const recordIndex = attendance.findIndex(record => 
      record.member_id === member_id && !record.check_out_time
    );
    
    if (recordIndex === -1) {
      return c.json({ success: false, error: 'No active check-in found for this member' }, 400);
    }
    
    const now = new Date();
    const checkInTime = new Date(attendance[recordIndex].check_in_time);
    const durationMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
    
    attendance[recordIndex].check_out_time = now.toISOString();
    attendance[recordIndex].duration_minutes = durationMinutes;
    
    await kv.set(attendanceKey, attendance);
    
    return c.json({ success: true, data: attendance[recordIndex] });
  } catch (error) {
    console.log('Check-out error:', error);
    return c.json({ success: false, error: 'Failed to record check-out' }, 500);
  }
});

Deno.serve(app.fetch);
