// Health check utility to identify potential issues in the GymBios app

export const healthCheck = {
  // Check if all required services are available
  checkServices: () => {
    const issues: string[] = [];
    
    try {
      // Check auth service
      const { authService } = require('./supabase/auth-service');
      if (!authService) {
        issues.push('Auth service not available');
      }
    } catch (error) {
      issues.push(`Auth service import error: ${error}`);
    }

    try {
      // Check demo service
      const { demoService } = require('./supabase/demo-service');
      if (!demoService) {
        issues.push('Demo service not available');
      }
    } catch (error) {
      issues.push(`Demo service import error: ${error}`);
    }

    try {
      // Check members service
      const { membersService } = require('./supabase/members-service');
      if (!membersService) {
        issues.push('Members service not available');
      }
    } catch (error) {
      issues.push(`Members service import error: ${error}`);  
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  },

  // Check if demo mode is working
  checkDemoMode: () => {
    try {
      const { authService } = require('./supabase/auth-service');
      const { demoService } = require('./supabase/demo-service');
      
      const isDemoMode = authService.isDemoMode();
      const demoMembers = demoService.getDemoMembers();
      const demoUser = demoService.getDemoUser();
      
      return {
        healthy: true,
        demoMode: isDemoMode,
        demoUser: !!demoUser,
        demoMembersCount: demoMembers?.length || 0
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Check environment setup
  checkEnvironment: () => {
    const issues: string[] = [];
    
    // Check if running in browser
    if (typeof window === 'undefined') {
      issues.push('Not running in browser environment');
    }
    
    // Check sessionStorage availability
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
    } catch (error) {
      issues.push('sessionStorage not available');
    }
    
    // Check fetch availability
    if (typeof fetch === 'undefined') {
      issues.push('Fetch API not available');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  },

  // Run all checks
  runAll: () => {
    const services = healthCheck.checkServices();
    const demoMode = healthCheck.checkDemoMode();
    const environment = healthCheck.checkEnvironment();
    
    return {
      overall: services.healthy && demoMode.healthy && environment.healthy,
      services,
      demoMode,
      environment,
      timestamp: new Date().toISOString()
    };
  }
};

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).gymBiosHealthCheck = healthCheck;
}
