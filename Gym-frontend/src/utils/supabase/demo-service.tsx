/**
 * Demo service — stub only.
 * Demo/Supabase mode has been removed. All data comes from the Spring Boot backend.
 * This file is kept to avoid breaking any remaining imports across page components.
 */
class DemoService {
  isDemoMode(): boolean { return false; }
  getDemoMembers(): never[] { return []; }
  getDemoStaff(): never[] { return []; }
  getDemoProducts(): never[] { return []; }
  getDemoBilling(): never[] { return []; }
  getDemoAttendance(): never[] { return []; }
}

export const demoService = new DemoService();
