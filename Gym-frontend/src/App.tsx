import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { NotificationBell } from "./components/shared/NotificationBell";
import { authService, User } from "./utils/supabase/auth-service";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { Dashboard } from "./pages/dashboard";
import { Members } from "./pages/members";
import { MemberConnect } from "./pages/member-connect";
import { Billing } from "./pages/billing";
import { TrainingStreams } from "./pages/training-streams";
import { Attendance } from "./pages/attendance";
import { CheckIn } from "./pages/check-in";
import { ReportsAnalytics } from "./pages/reports-analytics";
import { ManagePlans } from "./pages/manage-plans";
import { Community } from "./pages/community-redesign";
import { PromotionsCampaign } from "./pages/promotions-campaign";
import { SalesPurchases } from "./pages/sales-purchases";
import { SalesReports } from "./pages/sales-reports";
import { SalesAnalytics } from "./pages/sales-analytics";
import { SalesSettings } from "./pages/sales-settings";
import { Financials } from "./pages/financials";
import { PayrollEmployees } from "./pages/payroll-employees";
import { Assets } from "./pages/assets";
import { GymOS } from "./pages/gymos";
import { POSMode } from "./pages/pos-mode";
import { BiOS } from "./pages/bios";
import { MemberHub } from "./pages/member-hub";
import { BookSession } from "./pages/book-session";
import { JoinClass } from "./pages/join-class";
import { AddChallenge } from "./pages/add-challenge";
import { MembershipRenewal } from "./pages/membership-renewal";
import { MyStats } from "./pages/my-stats";
import { PointOfSale } from "./pages/point-of-sale";
import { AddMember } from "./pages/add-member";
import { Referrals } from "./pages/referrals";
import { Leads } from "./pages/leads";
import { FollowUps } from "./pages/follow-ups";
import { Messaging } from "./pages/messaging";
import { Automations } from "./pages/automations";
import { PostWorkoutCheckin } from "./pages/post-workout-checkin";
import { PlansServicesCatalog } from "./pages/plans-services-catalog";
import { StaffsTrainers } from "./pages/staffs-trainers";
import { ManageAssets } from "./pages/manage-assets";
import { AssetTransactions } from "./pages/asset-transactions";
import { AssetHistoryPage } from "./pages/asset-history";
import { AssetReports } from "./pages/asset-reports";
import { AssetAnalytics } from "./pages/asset-analytics";
import { Ledgers } from "./pages/ledgers";
import { ReceiptVoucher } from "./pages/receipt-voucher";
import { MemberConnectAnalytics } from "./pages/member-connect-analytics";
import { MemberConnectReports } from "./pages/member-connect-reports";
import { PurchaseOrder } from "./pages/purchase-order";
import { Purchase } from "./pages/purchase";
import { PaymentVoucher } from "./pages/payment-voucher";
import { BankReconciliation } from "./pages/bank-reconciliation";
import { Expenses } from "./pages/expenses";
import { TaxCompliance } from "./pages/tax-compliance";
import { FinancialReports } from "./pages/financial-reports";
import { FinancialAnalytics } from "./pages/financial-analytics";
import { JournalVoucherPage } from "./pages/journal-voucher";
import { FinancialSettings } from "./pages/financial-settings";
import { AddProduct } from "./pages/add-product";
import { Products } from "./pages/products";
import { WastageReturns } from "./pages/wastage-returns";
import { ProductionRecipe } from "./pages/production-recipe";
import { Categories } from "./pages/categories";
import { GymBiosPricing } from "./pages/gymbios-pricing";
import { CommunityAnalytics } from "./pages/community-analytics";
import { SetTargets } from "./pages/set-targets";
import { TargetsOverview } from "./pages/targets-overview";
import { MyTargets } from "./pages/my-targets";
import { TrainingsClasses } from "./pages/trainings-classes";
import { Bookings } from "./pages/bookings";
import { Payroll } from "./pages/payroll";
import { SalaryPayments } from "./pages/salary-payments";
import { SalaryAdvances } from "./pages/salary-advances";
import { MyProfile } from "./pages/my-profile";
import { AppSettings } from "./pages/settings";
import { MyPerformance } from "./pages/my-performance";
import AttendanceReports from "./pages/attendance-reports";
import { MemberHistoryAnalytics } from "./pages/member-history-analytics";
import { CustomReports } from "./pages/custom-reports";
import { MemberAddons } from "./pages/member-addons";
import { MemberReceipts } from "./pages/member-receipts";
import { FreezeUnfreeze } from "./pages/freeze-unfreeze";
import { CreateReceipt } from "./pages/create-receipt";
import { Facilities } from "./pages/facilities";
import { Login } from "./pages/login";
import { EmergencyProfile } from "./pages/emergency-profile";
import { Recruitment } from "./pages/recruitment";
import ErrorBoundary from "./components/shared/error-boundary";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Receipt,
  Video,
  UserCheck,
  LogIn,
  BarChart3,
  PieChart,
  LogOut,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Heart,
  ShoppingCart,
  Settings,
  Megaphone,
  Share,
  Target,
  Phone,
  MessageSquare,
  Zap,
  CheckCircle,
  Package,
  Tag,
  ClipboardList,
  ShoppingBag,
  ArrowLeftRight,
  ChefHat,
  Calculator,
  BookOpen,
  Banknote,
  Landmark,
  TrendingDown,
  UserCog,
  GraduationCap,
  Calendar,
  DollarSign,
  Wallet,
  TrendingUp,
  Building2,
  RefreshCcw,
  Cog,
  Brain,
  Target as TargetIcon,
  Activity,
  Dumbbell,
  User as UserIcon,
  FileText,
  Briefcase,
  Clock,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./components/ui/avatar";
import { Toaster } from "./components/ui/sonner";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    path: "/dashboard",
  },
  {
    title: "Community",
    icon: Heart,
    id: "community",
    path: "/community",
    subItems: [
      {
        title: "Members",
        icon: Users,
        id: "members",
        path: "/members",
      },
      {
        title: "Billing",
        icon: Receipt,
        id: "billing",
        path: "/billing",
      },
      {
        title: "Manage Plans",
        icon: Settings,
        id: "manage-plans",
        path: "/manage-plans",
      },
      {
        title: "Attendance",
        icon: UserCheck,
        id: "attendance",
        path: "/attendance",
      },
      {
        title: "Check In",
        icon: LogIn,
        id: "check-in",
        path: "/check-in",
      },
      {
        title: "Training Streams",
        icon: Video,
        id: "training-streams",
        path: "/training-streams",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "reports",
        path: "/reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "analytics",
        path: "/analytics",
      },
    ],
  },
  {
    title: "Member Connect",
    icon: UserPlus,
    id: "member-connect",
    path: "/member-connect",
    subItems: [
      {
        title: "Promotions & Campaign",
        icon: Megaphone,
        id: "promotions-campaign",
        path: "/promotions-campaign",
      },
      {
        title: "Referrals",
        icon: Share,
        id: "referrals",
        path: "/referrals",
      },
      {
        title: "Leads",
        icon: Target,
        id: "leads",
        path: "/leads",
      },
      {
        title: "Follow-ups",
        icon: Phone,
        id: "follow-ups",
        path: "/follow-ups",
      },
      {
        title: "Messaging",
        icon: MessageSquare,
        id: "messaging",
        path: "/messaging",
      },
      {
        title: "Automations",
        icon: Zap,
        id: "automations",
        path: "/automations",
      },
      {
        title: "Post-Workout Check-in",
        icon: CheckCircle,
        id: "post-workout-checkin",
        path: "/post-workout-checkin",
      },
      {
        title: "Plans & Services Catalog",
        icon: BookOpen,
        id: "plans-services-catalog",
        path: "/plans-services-catalog",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "member-connect-reports",
        path: "/member-connect-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "member-connect-analytics",
        path: "/member-connect-analytics",
      },
    ],
  },
  {
    title: "Sales & Purchases",
    icon: ShoppingCart,
    id: "sales-purchases",
    path: "/sales-purchases",
    subItems: [
      {
        title: "Point of Sale",
        icon: CreditCard,
        id: "point-of-sale",
        path: "/point-of-sale",
      },
      {
        title: "Products",
        icon: Package,
        id: "products",
        path: "/products",
      },
      {
        title: "Category",
        icon: Tag,
        id: "category",
        path: "/category",
      },
      {
        title: "Purchase Order",
        icon: ClipboardList,
        id: "purchase-order",
        path: "/purchase-order",
      },
      {
        title: "Purchase",
        icon: ShoppingBag,
        id: "purchase",
        path: "/purchase",
      },
      {
        title: "Wastage / Returns",
        icon: ArrowLeftRight,
        id: "wastage-returns",
        path: "/wastage-returns",
      },
      {
        title: "Production / Recipe",
        icon: ChefHat,
        id: "production-recipe",
        path: "/production-recipe",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "sales-reports",
        path: "/sales-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "sales-analytics",
        path: "/sales-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "sales-settings",
        path: "/sales-settings",
      },
    ],
  },
  {
    title: "Financials",
    icon: Calculator,
    id: "financials",
    path: "/financials",
    subItems: [
      {
        title: "Ledgers",
        icon: BookOpen,
        id: "ledgers",
        path: "/ledgers",
      },
      {
        title: "Receipt Voucher",
        icon: Receipt,
        id: "receipt-voucher",
        path: "/receipt-voucher",
      },
      {
        title: "Journal Voucher",
        icon: FileText,
        id: "journal-voucher",
        path: "/journal-voucher",
      },
      {
        title: "Payment Voucher",
        icon: Banknote,
        id: "payment-voucher",
        path: "/payment-voucher",
      },
      {
        title: "Bank Reconciliations",
        icon: Landmark,
        id: "bank-reconciliations",
        path: "/bank-reconciliations",
      },
      {
        title: "Expenses",
        icon: TrendingDown,
        id: "expenses",
        path: "/expenses",
      },
      {
        title: "Tax Compliance",
        icon: Receipt,
        id: "tax-compliance",
        path: "/tax-compliance",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "financial-reports",
        path: "/financial-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "financial-analytics",
        path: "/financial-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "financial-settings",
        path: "/financial-settings",
      },
    ],
  },
  {
    title: "Payroll & Employees",
    icon: UserCog,
    id: "payroll-employees",
    path: "/payroll-employees",
    subItems: [
      {
        title: "Staffs & Trainers",
        icon: Users,
        id: "staffs-trainers",
        path: "/staffs-trainers",
      },
      {
        title: "Trainings & Classes",
        icon: GraduationCap,
        id: "trainings-classes",
        path: "/trainings-classes",
      },
      {
        title: "Bookings",
        icon: Calendar,
        id: "bookings",
        path: "/bookings",
      },
      {
        title: "Payroll",
        icon: DollarSign,
        id: "payroll",
        path: "/payroll",
      },
      {
        title: "Salary Payments",
        icon: Wallet,
        id: "salary-payments",
        path: "/salary-payments",
      },
      {
        title: "Salary Advances",
        icon: TrendingUp,
        id: "salary-advances",
        path: "/salary-advances",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "payroll-reports",
        path: "/payroll-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "payroll-analytics",
        path: "/payroll-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "payroll-settings",
        path: "/payroll-settings",
      },
    ],
  },
  {
    title: "Assets",
    icon: Building2,
    id: "assets",
    path: "/assets",
    subItems: [
      {
        title: "Manage Assets",
        icon: Package,
        id: "manage-assets",
        path: "/manage-assets",
      },
      {
        title: "Transactions",
        icon: RefreshCcw,
        id: "asset-transactions",
        path: "/asset-transactions",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "asset-reports",
        path: "/asset-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "asset-analytics",
        path: "/asset-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "asset-settings",
        path: "/asset-settings",
      },
    ],
  },
  {
    title: "GymOS",
    icon: Cog,
    id: "gymos",
    path: "/gymos",
  },
  {
    title: "BiOS",
    icon: Brain,
    id: "bios",
    path: "/bios",
  },
  {
    title: "Member Hub",
    icon: Users,
    id: "member-hub",
    path: "/member-hub",
  },
  {
    title: "GymBios Pricing",
    icon: CreditCard,
    id: "gymbios-pricing",
    path: "/gymbios-pricing",
  },
  {
    title: "My Profile",
    icon: UserIcon,
    id: "my-profile",
    path: "/my-profile",
    subItems: [
      {
        title: "My Targets",
        icon: TargetIcon,
        id: "my-targets",
        path: "/my-targets",
      },
      {
        title: "My Performance",
        icon: Activity,
        id: "my-performance",
        path: "/my-performance",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "profile-settings",
        path: "/profile-settings",
      },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    id: "settings",
    path: "/settings",
  },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use location.pathname to figure out active section for styling mostly
  const currentPath = location.pathname;
  const activeSectionPathId = currentPath === '/' ? 'dashboard' : currentPath.slice(1);

  const [expandedItems, setExpandedItems] = useState<string[]>(
    [],
  );
  
  // Provide navigation params from location state if available
  const navigationParams = location.state || {};
  
  // Emergency route detection
  const [isEmergencyRoute, setIsEmergencyRoute] = useState(false);
  const [emergencyMemberId, setEmergencyMemberId] = useState<string | null>(null);

  // Check for emergency route on app load
  useEffect(() => {
    const path = window.location.pathname;
    const emergencyMatch = path.match(/^\/emergency\/(.+)$/);
    
    if (emergencyMatch) {
      setIsEmergencyRoute(true);
      setEmergencyMemberId(emergencyMatch[1]);
      setIsLoading(false); // Skip auth loading for emergency route
    }
  }, []);

  // Check for existing authentication on app load
  useEffect(() => {
    // Skip auth initialization if this is an emergency route
    if (isEmergencyRoute) return;
    const initializeAuth = async () => {
      try {
        console.log('Initializing GymBios authentication...');
        const isAuth = await authService.initialize();
        if (isAuth) {
          setIsAuthenticated(true);
          setUser(authService.getCurrentUser());
          console.log('Authentication successful');
        } else {
          console.log('No existing authentication found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Ensure we don't stay in loading state on error
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('Auth initialization complete');
      }
    };

    initializeAuth();
  }, []);

  // Authentication handlers
  const handleLogin = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      try {
        console.log('Attempting login for:', email);
        const result = await authService.signIn(email, password, rememberMe);
        
        if (result.success) {
          const currentUser = authService.getCurrentUser();
          setIsAuthenticated(true);
          setUser(currentUser);
          console.log('Login successful for user:', currentUser?.email);
          return { success: true };
        } else {
          console.log('Login failed:', result.error);
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Login error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Login failed' 
        };
      }
    },
    [],
  );

  const handleLogout = useCallback(async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      navigate("/dashboard");
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on error
      setIsAuthenticated(false);
      setUser(null);
      navigate("/dashboard");
    }
  }, [navigate]);

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  }, []);

  const handleNavClick = useCallback(
    (sectionId: string, params?: Record<string, any>) => {
      // Create path from sectionId
      let path = sectionId.startsWith('/') ? sectionId : `/${sectionId}`;
      
      // Execute React Router navigation
      navigate(path, { state: params });

      // Auto-expand Community for its sub-items
      const communitySubItems = [
        "members",
        "billing",
        "manage-plans",
        "attendance",
        "check-in",
        "training-streams",
        "reports",
        "analytics",
      ];

      // Auto-expand Member Connect for its sub-items
      const memberConnectSubItems = [
        "promotions-campaign",
        "referrals",
        "leads",
        "follow-ups",
        "messaging",
        "automations",
        "post-workout-checkin",
        "plans-services-catalog",
        "member-connect-reports",
        "member-connect-analytics",
      ];

      // Auto-expand Sales & Purchases for its sub-items
      const salesPurchasesSubItems = [
        "point-of-sale",
        "products",
        "category",
        "purchase-order",
        "purchase",
        "wastage-returns",
        "production-recipe",
        "sales-reports",
        "sales-analytics",
        "sales-settings",
      ];

      // Auto-expand Financials for its sub-items
      const financialsSubItems = [
        "ledgers",
        "receipt-voucher",
        "journal-voucher",
        "payment-voucher",
        "bank-reconciliations",
        "expenses",
        "financial-reports",
        "financial-analytics",
        "financial-settings",
      ];

      // Auto-expand Payroll & Employees for its sub-items
      const payrollEmployeesSubItems = [
        "staffs-trainers",
        "trainings-classes",
        "bookings",
        "payroll",
        "salary-payments",
        "salary-advances",
        "recruitment",
        "payroll-reports",
        "payroll-analytics",
        "payroll-settings",
      ];

      // Auto-expand My Profile for its sub-items
      const myProfileSubItems = [
        "my-targets",
        "my-performance",
        "profile-settings",
      ];

      // Auto-expand Assets for its sub-items
      const assetsSubItems = [
        "manage-assets",
        "asset-transactions",
        "asset-reports",
        "asset-analytics",
        "asset-settings",
      ];

      // GymOS no longer has sub-items

      const newExpanded = [...expandedItems];

      if (communitySubItems.includes(sectionId)) {
        if (!newExpanded.includes("community")) {
          newExpanded.push("community");
          setExpandedItems(newExpanded);
        }
      } else if (memberConnectSubItems.includes(sectionId)) {
        if (!newExpanded.includes("member-connect")) {
          newExpanded.push("member-connect");
          setExpandedItems(newExpanded);
        }
      } else if (salesPurchasesSubItems.includes(sectionId)) {
        if (!newExpanded.includes("sales-purchases")) {
          newExpanded.push("sales-purchases");
          setExpandedItems(newExpanded);
        }
      } else if (financialsSubItems.includes(sectionId)) {
        if (!newExpanded.includes("financials")) {
          newExpanded.push("financials");
          setExpandedItems(newExpanded);
        }
      } else if (payrollEmployeesSubItems.includes(sectionId)) {
        if (!newExpanded.includes("payroll-employees")) {
          newExpanded.push("payroll-employees");
          setExpandedItems(newExpanded);
        }
      } else if (assetsSubItems.includes(sectionId)) {
        if (!newExpanded.includes("assets")) {
          newExpanded.push("assets");
          setExpandedItems(newExpanded);
        }
      } else if (myProfileSubItems.includes(sectionId)) {
        if (!newExpanded.includes("my-profile")) {
          newExpanded.push("my-profile");
          setExpandedItems(newExpanded);
        }
      }
    },
    [expandedItems],
  );

  const renderContent = (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard onNavigate={handleNavClick} />} />
      <Route path="/community" element={<Community />} />
      <Route path="/members" element={<Members onNavigate={handleNavClick} initialTab={navigationParams.tab} />} />
      <Route path="/members/add" element={<AddMember onNavigate={handleNavClick} />} />
      <Route path="/members/edit/:memberId" element={<AddMember onNavigate={handleNavClick} />} />
      <Route path="/add-member" element={<Navigate to="/members/add" replace />} />
      <Route path="/billing" element={<Billing onNavigate={handleNavClick} />} />
      <Route path="/create-receipt" element={<CreateReceipt onNavigate={handleNavClick} />} />
      <Route path="/manage-plans" element={<ManagePlans />} />
      <Route path="/attendance" element={<Attendance onNavigate={handleNavClick} />} />
      <Route path="/attendance-reports" element={<AttendanceReports onNavigate={handleNavClick} />} />
      <Route path="/member-history-analytics" element={<MemberHistoryAnalytics onNavigate={handleNavClick} memberId={navigationParams.memberId} />} />
      <Route path="/check-in" element={<CheckIn />} />
      <Route path="/training-streams" element={<TrainingStreams onNavigate={handleNavClick} />} />
      <Route path="/facilities" element={<Facilities onNavigate={handleNavClick} />} />
      <Route path="/reports" element={<ReportsAnalytics onNavigate={handleNavClick} />} />
      <Route path="/custom-reports" element={<CustomReports onNavigate={handleNavClick} />} />
      <Route path="/member-addons" element={<MemberAddons onNavigate={handleNavClick} />} />
      <Route path="/member-receipts" element={<MemberReceipts onNavigate={handleNavClick} />} />
      <Route path="/freeze-unfreeze" element={<FreezeUnfreeze onNavigate={handleNavClick} />} />
      <Route path="/analytics" element={<CommunityAnalytics />} />
      
      <Route path="/member-connect" element={<MemberConnect />} />
      <Route path="/promotions-campaign" element={<PromotionsCampaign />} />
      <Route path="/referrals" element={<Referrals />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/follow-ups" element={<FollowUps />} />
      <Route path="/messaging" element={<Messaging />} />
      <Route path="/automations" element={<Automations />} />
      <Route path="/post-workout-checkin" element={<PostWorkoutCheckin />} />
      <Route path="/plans-services-catalog" element={<PlansServicesCatalog />} />
      <Route path="/member-connect-reports" element={<MemberConnectReports />} />
      <Route path="/member-connect-analytics" element={<MemberConnectAnalytics />} />
      
      <Route path="/sales-purchases" element={<SalesPurchases />} />
      <Route path="/point-of-sale" element={<PointOfSale />} />
      <Route path="/products" element={<Products onNavigate={handleNavClick} />} />
      <Route path="/add-product" element={<AddProduct onNavigate={handleNavClick} />} />
      <Route path="/category" element={<Categories />} />
      <Route path="/purchase-order" element={<PurchaseOrder />} />
      <Route path="/purchase" element={<Purchase />} />
      <Route path="/wastage-returns" element={<WastageReturns />} />
      <Route path="/production-recipe" element={<ProductionRecipe />} />
      <Route path="/sales-reports" element={<SalesReports />} />
      <Route path="/sales-analytics" element={<SalesAnalytics />} />
      <Route path="/sales-settings" element={<SalesSettings />} />
      
      <Route path="/financials" element={<Financials />} />
      <Route path="/ledgers" element={<Ledgers />} />
      <Route path="/receipt-voucher" element={<ReceiptVoucher />} />
      <Route path="/journal-voucher" element={<JournalVoucherPage />} />
      <Route path="/payment-voucher" element={<PaymentVoucher />} />
      <Route path="/bank-reconciliations" element={<BankReconciliation />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/tax-compliance" element={<TaxCompliance />} />
      <Route path="/financial-reports" element={<FinancialReports />} />
      <Route path="/financial-analytics" element={<FinancialAnalytics />} />
      <Route path="/financial-settings" element={<FinancialSettings />} />
      
      <Route path="/payroll-employees" element={<PayrollEmployees />} />
      <Route path="/staffs-trainers" element={<StaffsTrainers onNavigate={handleNavClick} />} />
      <Route path="/set-targets" element={<SetTargets onNavigate={handleNavClick} />} />
      <Route path="/targets-overview" element={<TargetsOverview onNavigate={handleNavClick} />} />
      <Route path="/my-targets" element={<MyTargets />} />
      <Route path="/my-performance" element={<MyPerformance onNavigate={handleNavClick} />} />
      <Route path="/profile-settings" element={
        <div className="p-6">
          <h1>Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal profile, notification preferences, and account settings.
          </p>
        </div>
      } />
      <Route path="/my-profile" element={<MyProfile onNavigate={handleNavClick} />} />
      <Route path="/settings" element={<AppSettings />} />
      <Route path="/trainings-classes" element={<TrainingsClasses onNavigate={handleNavClick} />} />
      <Route path="/bookings" element={<Bookings onNavigate={handleNavClick} />} />
      <Route path="/payroll" element={<Payroll onNavigate={handleNavClick} />} />
      <Route path="/salary-payments" element={<SalaryPayments onNavigate={handleNavClick} />} />
      <Route path="/salary-advances" element={<SalaryAdvances onNavigate={handleNavClick} />} />
      <Route path="/recruitment" element={<Recruitment />} />
      <Route path="/payroll-reports" element={
        <div className="p-6">
          <h1>Payroll Reports</h1>
          <p className="text-muted-foreground">
            Generate comprehensive payroll reports including salary summaries, tax reports, and employee earnings.
          </p>
        </div>
      } />
      <Route path="/payroll-analytics" element={
        <div className="p-6">
          <h1>Payroll Analytics</h1>
          <p className="text-muted-foreground">
            Advanced analytics for payroll costs, employee performance metrics, and workforce insights.
          </p>
        </div>
      } />
      <Route path="/payroll-settings" element={
        <div className="p-6">
          <h1>Payroll Settings</h1>
          <p className="text-muted-foreground">
            Configure payroll system settings including tax rates, benefit calculations, and payment schedules.
          </p>
        </div>
      } />
      
      <Route path="/assets" element={<Assets />} />
      <Route path="/manage-assets" element={<ManageAssets />} />
      <Route path="/asset-history" element={<AssetHistoryPage />} />
      <Route path="/asset-transactions" element={<AssetTransactions />} />
      <Route path="/asset-reports" element={<AssetReports />} />
      <Route path="/asset-analytics" element={<AssetAnalytics />} />
      <Route path="/asset-settings" element={
        <div className="p-6">
          <h1>Asset Settings</h1>
          <p className="text-muted-foreground">
            Configure asset management settings including depreciation methods, category classifications, and maintenance schedules.
          </p>
        </div>
      } />
      
      <Route path="/gymos" element={<GymOS onNavigate={handleNavClick} />} />
      <Route path="/bios" element={<BiOS />} />
      <Route path="/member-hub" element={<MemberHub onNavigate={handleNavClick} />} />
      <Route path="/book-session" element={<BookSession onNavigate={handleNavClick} />} />
      <Route path="/join-class" element={<JoinClass onNavigate={handleNavClick} />} />
      <Route path="/add-challenge" element={<AddChallenge onNavigate={handleNavClick} />} />
      <Route path="/membership-renewal" element={<MembershipRenewal onNavigate={handleNavClick} />} />
      <Route path="/my-stats" element={<MyStats onNavigate={handleNavClick} />} />
      <Route path="/gymbios-pricing" element={<GymBiosPricing />} />
      
      <Route path="*" element={<Dashboard onNavigate={handleNavClick} />} />
    </Routes>
  );

  // Handle emergency route (bypass authentication)
  if (isEmergencyRoute && emergencyMemberId) {
    return (
      <>
        <EmergencyProfile memberId={emergencyMemberId} />
        <Toaster />
      </>
    );
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ minHeight: 'calc(100vh / 0.9)' }}>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-primary rounded-xl p-3">
              <Dumbbell className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                GymBios
              </h1>
              <p className="text-sm text-gray-600">
                Business OS
              </p>
            </div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  // Show main app if authenticated
  return (
    <SidebarProvider>
      <div className="flex w-full" style={{ minHeight: 'calc(100vh / 0.9)' }}>
        <Sidebar className="hidden md:flex bg-gradient-primary">
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 backdrop-blur-sm text-white rounded-xl p-3 shadow-lg">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-white">GymBios</h2>
                  <p className="text-sm text-white/80">
                    Business Operating System
                  </p>
                </div>
              </div>
              <NotificationBell className="text-white/80 hover:text-white hover:bg-white/10" />
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (item.subItems) {
                        toggleExpanded(item.id);
                        handleNavClick(item.path || item.id);
                      } else {
                        handleNavClick(item.path || item.id);
                      }
                    }}
                    isActive={activeSectionPathId === item.id}
                    className={`w-full justify-start sidebar-item text-white hover:bg-white/10 transition-all duration-300 ${
                      activeSectionPathId === item.id ? 'sidebar-item-active' : ''
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4 sidebar-icon" />
                    {item.title}
                    {item.subItems && (
                      <div className="ml-auto">
                        {expandedItems.includes(item.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </SidebarMenuButton>

                  {item.subItems &&
                    expandedItems.includes(item.id) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems.map((subItem) => (
                          <SidebarMenuButton
                            key={subItem.id}
                            onClick={() =>
                              handleNavClick(subItem.path || subItem.id)
                            }
                            isActive={
                              activeSectionPathId === subItem.id
                            }
                            className={`w-full justify-start text-sm py-2 sidebar-item text-white/90 hover:bg-white/10 transition-all duration-300 ${
                              activeSectionPathId === subItem.id ? 'sidebar-item-active' : ''
                            }`}
                          >
                            <subItem.icon className="mr-3 h-4 w-4 sidebar-icon" />
                            {subItem.title}
                          </SidebarMenuButton>
                        ))}
                      </div>
                    )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <AvatarImage src="/avatars/admin.jpg" />
                  <AvatarFallback className="bg-white/20 text-white">
                    {user?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "GM"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: isOnline ? '#4ade80' : '#ef4444' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">
                  {user?.name || "Gym Manager"}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto min-w-0">
          <header className="border-b border-primary/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 sticky top-0 z-40 shadow-sm md:hidden">
            <div className="flex h-16 items-center px-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-primary text-white rounded-xl p-2 shadow-md">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold" style={{ color: '#2B7A78' }}>GymBios</h2>
                </div>
              </div>
              <div className="flex-1" />
              <NotificationBell className="mr-2" />
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-primary text-white">
                    {user?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "GM"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: isOnline ? '#4ade80' : '#ef4444' }}
                />
              </div>
            </div>
          </header>

          <div className="flex-1">
            <ErrorBoundary>
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                {renderContent}
              </ProtectedRoute>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

