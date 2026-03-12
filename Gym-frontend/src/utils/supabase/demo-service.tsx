import { authService } from './auth-service';

class DemoService {
  // Check if currently using demo authentication
  isDemoMode(): boolean {
    const currentUser = authService.getCurrentUser();
    const accessToken = authService.getAccessToken();
    
    return !!(
      accessToken?.startsWith('demo_') || 
      accessToken === 'demo_token' || 
      currentUser?.id?.includes('demo') || 
      currentUser?.id === 'demo_admin' ||
      currentUser?.id === 'demo_admin_user'
    );
  }

  // Log demo mode status
  logDemoStatus(): void {
    const isDemo = this.isDemoMode();
    const currentUser = authService.getCurrentUser();
    const accessToken = authService.getAccessToken();
    
    console.log('Demo Service Status:', {
      isDemoMode: isDemo,
      user: currentUser,
      tokenType: accessToken?.startsWith('demo_') ? 'demo' : 'other',
      tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null
    });
  }

  // Get demo user info
  getDemoUser() {
    return {
      id: 'demo_admin_user',
      email: 'demo@example.com',
      name: 'Gym Manager',
      role: 'gym_manager'
    };
  }

  // Initialize demo mode (called when demo auth is successful)
  initializeDemoMode(): void {
    console.log('Demo mode initialized successfully');
    localStorage.setItem('gymbios_demo_mode', 'true');
  }

  // Clean up demo mode
  cleanupDemoMode(): void {
    console.log('Demo mode cleaned up');
    localStorage.removeItem('gymbios_demo_mode');
  }

  // Check if demo mode was previously active
  wasDemoModeActive(): boolean {
    return localStorage.getItem('gymbios_demo_mode') === 'true';
  }

  // Get demo token
  generateDemoToken(): string {
    return 'demo_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate demo token
  isDemoToken(token: string | null): boolean {
    if (!token) return false;
    return token.startsWith('demo_') || token === 'demo_token' || token.includes('demo');
  }

  // Get demo members data
  getDemoMembers() {
    return [
      {
        id: 'mem_001',
        member_id: 'MEM-001',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+971-50-123-4567',
        membership_type: 'Premium',
        membership_plan: 'Premium Monthly',
        membership_status: 'active',
        join_date: '2024-01-15T00:00:00Z',
        membership_start_date: '2024-01-15T00:00:00Z',
        expiry_date: '2025-01-15T00:00:00Z',
        membership_end_date: '2025-01-15T00:00:00Z',
        emergency_contact: 'Mike Johnson',
        emergency_phone: '+971-50-123-4568',
        payment_status: 'paid',
        monthly_fee: 750,
        membership_fee: 750,
        total_visits: 45,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_002',
        member_id: 'MEM-002',
        name: 'Ahmed Al-Rashid',
        email: 'ahmed.rashid@email.com',
        phone: '+971-55-234-5678',
        membership_type: 'VIP',
        membership_plan: 'Platinum Annual',
        membership_status: 'active',
        join_date: '2024-02-01T00:00:00Z',
        membership_start_date: '2024-02-01T00:00:00Z',
        expiry_date: '2025-02-01T00:00:00Z',
        membership_end_date: '2025-02-01T00:00:00Z',
        emergency_contact: 'Fatima Al-Rashid',
        emergency_phone: '+971-55-234-5679',
        payment_status: 'paid',
        monthly_fee: 1200,
        membership_fee: 1200,
        total_visits: 62,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_003',
        member_id: 'MEM-003',
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '+971-56-345-6789',
        membership_type: 'Basic',
        membership_plan: 'Basic Monthly',
        membership_status: 'active',
        join_date: '2024-03-10T00:00:00Z',
        membership_start_date: '2024-03-10T00:00:00Z',
        expiry_date: '2025-03-10T00:00:00Z',
        membership_end_date: '2025-03-10T00:00:00Z',
        emergency_contact: 'Carlos Santos',
        emergency_phone: '+971-56-345-6790',
        payment_status: 'overdue',
        monthly_fee: 300,
        membership_fee: 300,
        total_visits: 28,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_004',
        member_id: 'MEM-004',
        name: 'James Wilson',
        email: 'james.wilson@email.com',
        phone: '+971-52-789-0123',
        membership_type: 'Premium',
        membership_plan: 'Premium Monthly',
        membership_status: 'inactive',
        join_date: '2023-08-22T00:00:00Z',
        membership_start_date: '2023-08-22T00:00:00Z',
        expiry_date: '2024-08-22T00:00:00Z',
        membership_end_date: '2024-08-22T00:00:00Z',
        emergency_contact: 'Emma Wilson',
        emergency_phone: '+971-52-789-0124',
        payment_status: 'pending',
        monthly_fee: 750,
        membership_fee: 750,
        total_visits: 12,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_fam_005',
        member_id: 'MEM-FAM-005',
        name: 'Robert Martinez',
        email: 'robert.martinez@email.com',
        phone: '+971-50-987-6543',
        membership_type: 'Premium',
        membership_plan: 'Gold Quarterly',
        membership_status: 'active',
        join_date: '2024-05-20T00:00:00Z',
        membership_start_date: '2024-05-20T00:00:00Z',
        expiry_date: '2025-08-20T00:00:00Z',
        membership_end_date: '2025-08-20T00:00:00Z',
        emergency_contact: 'Sofia Martinez',
        emergency_phone: '+971-50-987-6544',
        payment_status: 'paid',
        monthly_fee: 733,
        membership_fee: 733,
        total_visits: 38,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_corp_006',
        member_id: 'MEM-COR-006',
        name: 'Linda Chen',
        email: 'linda.chen@corporate.com',
        phone: '+971-55-876-5432',
        membership_type: 'Premium',
        membership_plan: 'Premium Monthly',
        membership_status: 'active',
        join_date: '2024-06-01T00:00:00Z',
        membership_start_date: '2024-06-01T00:00:00Z',
        expiry_date: '2025-06-01T00:00:00Z',
        membership_end_date: '2025-06-01T00:00:00Z',
        emergency_contact: 'David Chen',
        emergency_phone: '+971-55-876-5433',
        payment_status: 'paid',
        monthly_fee: 750,
        membership_fee: 750,
        total_visits: 52,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_007',
        member_id: 'MEM-007',
        name: 'Hassan Khalil',
        email: 'hassan.khalil@email.com',
        phone: '+971-56-765-4321',
        membership_type: 'Standard',
        membership_plan: 'Standard Monthly',
        membership_status: 'suspended',
        join_date: '2024-04-12T00:00:00Z',
        membership_start_date: '2024-04-12T00:00:00Z',
        expiry_date: '2025-04-12T00:00:00Z',
        membership_end_date: '2025-04-12T00:00:00Z',
        emergency_contact: 'Amina Khalil',
        emergency_phone: '+971-56-765-4322',
        payment_status: 'overdue',
        monthly_fee: 499,
        membership_fee: 499,
        total_visits: 15,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_008',
        member_id: 'MEM-008',
        name: 'Emily Brown',
        email: 'emily.brown@email.com',
        phone: '+971-52-654-3210',
        membership_type: 'Basic',
        membership_plan: 'Basic Monthly',
        membership_status: 'expired',
        join_date: '2023-10-05T00:00:00Z',
        membership_start_date: '2023-10-05T00:00:00Z',
        expiry_date: '2024-10-05T00:00:00Z',
        membership_end_date: '2024-10-05T00:00:00Z',
        emergency_contact: 'Tom Brown',
        emergency_phone: '+971-52-654-3211',
        payment_status: 'pending',
        monthly_fee: 299,
        membership_fee: 299,
        total_visits: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // Get demo staff data
  getDemoStaff() {
    return [
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
      }
    ];
  }

  // Get demo products data
  getDemoProducts() {
    return [
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
      }
    ];
  }

  // Check if should use demo data (bypass backend)
  shouldUseOfflineDemo(): boolean {
    return this.isDemoMode() && this.wasDemoModeActive();
  }

  // Get demo billing data
  getDemoBilling() {
    return [
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
  }

  // Get demo attendance data
  getDemoAttendance() {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'att_001',
        member_id: 'mem_001',
        member_name: 'Sarah Johnson',
        check_in_time: `${today}T09:30:00Z`,
        check_out_time: `${today}T11:00:00Z`,
        duration_minutes: 90,
        created_at: new Date().toISOString()
      },
      {
        id: 'att_002',
        member_id: 'mem_002',
        member_name: 'Ahmed Al-Rashid',
        check_in_time: `${today}T18:15:00Z`,
        check_out_time: null,
        duration_minutes: null,
        created_at: new Date().toISOString()
      }
    ];
  }
}

// Export singleton instance
export const demoService = new DemoService();
