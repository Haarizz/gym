import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
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
import { Community } from "./pages/community";
import { PromotionsCampaign } from "./pages/promotions-campaign";
import { SalesPurchases } from "./pages/sales-purchases";
import { Financials } from "./pages/financials";
import { PayrollEmployees } from "./pages/payroll-employees";
import { Assets } from "./pages/assets";
import { GymOS } from "./pages/gymos";
import { POSMode } from "./pages/pos-mode";
import { BiOS } from "./pages/bios";
import { MemberHub } from "./pages/member-hub";
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
import { AddProduct } from "./pages/add-product";
import { Products } from "./pages/products";
import { WastageReturns } from "./pages/wastage-returns";
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
  },
  {
    title: "Community",
    icon: Heart,
    id: "community",
    subItems: [
      {
        title: "Members",
        icon: Users,
        id: "members",
      },
      {
        title: "Billing",
        icon: Receipt,
        id: "billing",
      },
      {
        title: "Manage Plans",
        icon: Settings,
        id: "manage-plans",
      },
      {
        title: "Attendance",
        icon: UserCheck,
        id: "attendance",
      },
      {
        title: "Check In",
        icon: LogIn,
        id: "check-in",
      },
      {
        title: "Training Streams",
        icon: Video,
        id: "training-streams",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "analytics",
      },
    ],
  },
  {
    title: "Member Connect",
    icon: UserPlus,
    id: "member-connect",
    subItems: [
      {
        title: "Promotions & Campaign",
        icon: Megaphone,
        id: "promotions-campaign",
      },
      {
        title: "Referrals",
        icon: Share,
        id: "referrals",
      },
      {
        title: "Leads",
        icon: Target,
        id: "leads",
      },
      {
        title: "Follow-ups",
        icon: Phone,
        id: "follow-ups",
      },
      {
        title: "Messaging",
        icon: MessageSquare,
        id: "messaging",
      },
      {
        title: "Automations",
        icon: Zap,
        id: "automations",
      },
      {
        title: "Post-Workout Check-in",
        icon: CheckCircle,
        id: "post-workout-checkin",
      },
      {
        title: "Plans & Services Catalog",
        icon: BookOpen,
        id: "plans-services-catalog",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "member-connect-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "member-connect-analytics",
      },
    ],
  },
  {
    title: "Sales & Purchases",
    icon: ShoppingCart,
    id: "sales-purchases",
    subItems: [
      {
        title: "Point of Sale",
        icon: CreditCard,
        id: "point-of-sale",
      },
      {
        title: "Products",
        icon: Package,
        id: "products",
      },
      {
        title: "Category",
        icon: Tag,
        id: "category",
      },
      {
        title: "Purchase Order",
        icon: ClipboardList,
        id: "purchase-order",
      },
      {
        title: "Purchase",
        icon: ShoppingBag,
        id: "purchase",
      },
      {
        title: "Wastage / Returns",
        icon: ArrowLeftRight,
        id: "wastage-returns",
      },
      {
        title: "Production / Recipe",
        icon: ChefHat,
        id: "production-recipe",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "sales-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "sales-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "sales-settings",
      },
    ],
  },
  {
    title: "Financials",
    icon: Calculator,
    id: "financials",
    subItems: [
      {
        title: "Ledgers",
        icon: BookOpen,
        id: "ledgers",
      },
      {
        title: "Receipt Voucher",
        icon: Receipt,
        id: "receipt-voucher",
      },
      {
        title: "Journal Voucher",
        icon: FileText,
        id: "journal-voucher",
      },
      {
        title: "Payment Voucher",
        icon: Banknote,
        id: "payment-voucher",
      },
      {
        title: "Bank Reconciliations",
        icon: Landmark,
        id: "bank-reconciliations",
      },
      {
        title: "Expenses",
        icon: TrendingDown,
        id: "expenses",
      },
      {
        title: "Tax Compliance",
        icon: Receipt,
        id: "tax-compliance",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "financial-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "financial-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "financial-settings",
      },
    ],
  },
  {
    title: "Payroll & Employees",
    icon: UserCog,
    id: "payroll-employees",
    subItems: [
      {
        title: "Staffs & Trainers",
        icon: Users,
        id: "staffs-trainers",
      },
      {
        title: "Trainings & Classes",
        icon: GraduationCap,
        id: "trainings-classes",
      },
      {
        title: "Bookings",
        icon: Calendar,
        id: "bookings",
      },
      {
        title: "Payroll",
        icon: DollarSign,
        id: "payroll",
      },
      {
        title: "Salary Payments",
        icon: Wallet,
        id: "salary-payments",
      },
      {
        title: "Salary Advances",
        icon: TrendingUp,
        id: "salary-advances",
      },
      {
        title: "Recruitment",
        icon: Briefcase,
        id: "recruitment",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "payroll-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "payroll-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "payroll-settings",
      },
    ],
  },
  {
    title: "Assets",
    icon: Building2,
    id: "assets",
    subItems: [
      {
        title: "Manage Assets",
        icon: Package,
        id: "manage-assets",
      },
      {
        title: "Transactions",
        icon: RefreshCcw,
        id: "asset-transactions",
      },
      {
        title: "Reports",
        icon: BarChart3,
        id: "asset-reports",
      },
      {
        title: "Analytics",
        icon: PieChart,
        id: "asset-analytics",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "asset-settings",
      },
    ],
  },
  {
    title: "GymOS",
    icon: Cog,
    id: "gymos",
  },
  {
    title: "BiOS",
    icon: Brain,
    id: "bios",
  },
  {
    title: "Member Hub",
    icon: Users,
    id: "member-hub",
  },
  {
    title: "GymBios Pricing",
    icon: CreditCard,
    id: "gymbios-pricing",
  },
  {
    title: "My Profile",
    icon: UserIcon,
    id: "my-profile",
    subItems: [
      {
        title: "My Targets",
        icon: TargetIcon,
        id: "my-targets",
      },
      {
        title: "My Performance",
        icon: Activity,
        id: "my-performance",
      },
      {
        title: "Settings",
        icon: Settings,
        id: "profile-settings",
      },
    ],
  },
];

export default function App() {
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

  // App state
  const [activeSection, setActiveSection] =
    useState("dashboard");
  const [expandedItems, setExpandedItems] = useState<string[]>(
    [],
  );
  const [navigationParams, setNavigationParams] = useState<Record<string, any>>({});
  
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
      setActiveSection("dashboard");
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on error
      setIsAuthenticated(false);
      setUser(null);
      setActiveSection("dashboard");
    }
  }, []);

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  }, []);

  const handleNavClick = useCallback(
    (sectionId: string, params?: Record<string, any>) => {
      setActiveSection(sectionId);
      setNavigationParams(params || {});

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

  const renderContent = useMemo(() => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavClick} />;
      case "community":
        return <Community />;
      case "members":
        return <Members onNavigate={handleNavClick} initialTab={navigationParams.tab} />;
      case "add-member":
        return <AddMember onNavigate={handleNavClick} />;
      case "billing":
        return <Billing onNavigate={handleNavClick} />;
      case "create-receipt":
        return <CreateReceipt onNavigate={handleNavClick} />;
      case "manage-plans":
        return <ManagePlans />;
      case "attendance":
        return <Attendance onNavigate={handleNavClick} />;
      case "attendance-reports":
        return <AttendanceReports onNavigate={handleNavClick} />;
      case "member-history-analytics":
        return <MemberHistoryAnalytics onNavigate={handleNavClick} memberId={navigationParams.memberId} />;
      case "check-in":
        return <CheckIn />;
      case "training-streams":
        return <TrainingStreams onNavigate={handleNavClick} />;
      case "facilities":
        return <Facilities onNavigate={handleNavClick} />;
      case "reports":
        return <ReportsAnalytics onNavigate={handleNavClick} />;
      case "custom-reports":
        return <CustomReports onNavigate={handleNavClick} />;
      case "member-addons":
        return <MemberAddons onNavigate={handleNavClick} />;
      case "member-receipts":
        return <MemberReceipts onNavigate={handleNavClick} />;
      case "freeze-unfreeze":
        return <FreezeUnfreeze onNavigate={handleNavClick} />;
      case "analytics":
        return <CommunityAnalytics />;
      case "member-connect":
        return <MemberConnect />;
      case "promotions-campaign":
        return <PromotionsCampaign />;
      case "referrals":
        return <Referrals />;
      case "leads":
        return <Leads />;
      case "follow-ups":
        return <FollowUps />;
      case "messaging":
        return <Messaging />;
      case "automations":
        return <Automations />;
      case "post-workout-checkin":
        return <PostWorkoutCheckin />;
      case "plans-services-catalog":
        return <PlansServicesCatalog />;
      case "member-connect-reports":
        return <MemberConnectReports />;
      case "member-connect-analytics":
        return <MemberConnectAnalytics />;
      case "sales-purchases":
        return <SalesPurchases />;
      case "point-of-sale":
        return <PointOfSale />;
      case "products":
        return <Products onNavigate={handleNavClick} />;
      case "add-product":
        return <AddProduct onNavigate={handleNavClick} />;
      case "category":
        return (
          <div className="p-6">
            <h1>Category</h1>
            <p className="text-muted-foreground">
              Organize products and services into categories for
              better inventory management and sales tracking.
            </p>
          </div>
        );
      case "purchase-order":
        return <PurchaseOrder />;
      case "purchase":
        return <Purchase />;
      case "wastage-returns":
        return <WastageReturns />;
      case "production-recipe":
        return (
          <div className="p-6">
            <h1>Production / Recipe</h1>
            <p className="text-muted-foreground">
              Manage recipes for gym cafe items, protein shakes,
              and track production costs and ingredients.
            </p>
          </div>
        );
      case "sales-reports":
        return (
          <div className="p-6">
            <h1>Sales Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive sales reporting including revenue
              tracking, product performance, and transaction
              analysis.
            </p>
          </div>
        );
      case "sales-analytics":
        return (
          <div className="p-6">
            <h1>Sales Analytics</h1>
            <p className="text-muted-foreground">
              Advanced analytics for sales performance, customer
              purchasing patterns, and revenue optimization
              insights.
            </p>
          </div>
        );
      case "sales-settings":
        return (
          <div className="p-6">
            <h1>Sales Settings</h1>
            <p className="text-muted-foreground">
              Configure sales system settings including tax
              rates, payment methods, and transaction
              preferences.
            </p>
          </div>
        );
      case "financials":
        return <Financials />;
      case "ledgers":
        return <Ledgers />;
      case "receipt-voucher":
        return <ReceiptVoucher />;
      case "journal-voucher":
        return (
          <div className="p-6">
            <h1>Journal Voucher</h1>
            <p className="text-muted-foreground">
              Create journal entries for adjustments,
              corrections, and non-cash transactions.
            </p>
          </div>
        );
      case "payment-voucher":
        return <PaymentVoucher />;
      case "bank-reconciliations":
        return <BankReconciliation />;
      case "expenses":
        return <Expenses />;
      case "tax-compliance":
        return <TaxCompliance />;
      case "financial-reports":
        return <FinancialReports />;
      case "financial-analytics":
        return <FinancialAnalytics />;
      case "financial-settings":
        return (
          <div className="p-6">
            <h1>Financial Settings</h1>
            <p className="text-muted-foreground">
              Configure financial system settings including
              accounting periods, tax rates, and chart of
              accounts.
            </p>
          </div>
        );
      case "payroll-employees":
        return <PayrollEmployees />;
      case "staffs-trainers":
        return <StaffsTrainers onNavigate={handleNavClick} />;
      case "set-targets":
        return <SetTargets onNavigate={handleNavClick} />;
      case "targets-overview":
        return <TargetsOverview onNavigate={handleNavClick} />;
      case "my-targets":
        return <MyTargets />;
      case "my-performance":
        return <MyPerformance onNavigate={handleNavClick} />;
      case "profile-settings":
        return (
          <div className="p-6">
            <h1>Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your personal profile, notification preferences, and account settings.
            </p>
          </div>
        );
      case "my-profile":
        return <MyProfile onNavigate={handleNavClick} />;
      case "trainings-classes":
        return <TrainingsClasses onNavigate={handleNavClick} />;
      case "bookings":
        return <Bookings onNavigate={handleNavClick} />;
      case "payroll":
        return <Payroll onNavigate={handleNavClick} />;
      case "salary-payments":
        return <SalaryPayments onNavigate={handleNavClick} />;
      case "salary-advances":
        return <SalaryAdvances onNavigate={handleNavClick} />;
      case "recruitment":
        return <Recruitment />;
      case "payroll-reports":
        return (
          <div className="p-6">
            <h1>Payroll Reports</h1>
            <p className="text-muted-foreground">
              Generate comprehensive payroll reports including
              salary summaries, tax reports, and employee
              earnings.
            </p>
          </div>
        );
      case "payroll-analytics":
        return (
          <div className="p-6">
            <h1>Payroll Analytics</h1>
            <p className="text-muted-foreground">
              Advanced analytics for payroll costs, employee
              performance metrics, and workforce insights.
            </p>
          </div>
        );
      case "payroll-settings":
        return (
          <div className="p-6">
            <h1>Payroll Settings</h1>
            <p className="text-muted-foreground">
              Configure payroll system settings including tax
              rates, benefit calculations, and payment
              schedules.
            </p>
          </div>
        );
      case "assets":
        return <Assets />;
      case "manage-assets":
        return <ManageAssets />;
      case "asset-transactions":
        return <AssetTransactions />;
      case "asset-reports":
        return (
          <div className="p-6">
            <h1>Asset Reports</h1>
            <p className="text-muted-foreground">
              Generate detailed asset reports including
              depreciation schedules, asset registers, and
              valuation summaries.
            </p>
          </div>
        );
      case "asset-analytics":
        return (
          <div className="p-6">
            <h1>Asset Analytics</h1>
            <p className="text-muted-foreground">
              Advanced analytics for asset utilization, ROI
              tracking, maintenance costs, and performance
              optimization insights.
            </p>
          </div>
        );
      case "asset-settings":
        return (
          <div className="p-6">
            <h1>Asset Settings</h1>
            <p className="text-muted-foreground">
              Configure asset management settings including
              depreciation methods, category classifications,
              and maintenance schedules.
            </p>
          </div>
        );
      case "gymos":
        return <GymOS onNavigate={handleNavClick} />;

      case "bios":
        return <BiOS />;
      case "member-hub":
        return <MemberHub />;
      case "gymbios-pricing":
        return <GymBiosPricing />;
      default:
        return <Dashboard onNavigate={handleNavClick} />;
      }
  }, [activeSection, navigationParams, handleNavClick]);

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
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (item.subItems) {
                        toggleExpanded(item.id);
                        setActiveSection(item.id);
                      } else {
                        setActiveSection(item.id);
                      }
                    }}
                    isActive={activeSection === item.id}
                    className={`w-full justify-start sidebar-item text-white hover:bg-white/10 transition-all duration-300 ${
                      activeSection === item.id ? 'sidebar-item-active' : ''
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
                              handleNavClick(subItem.id)
                            }
                            isActive={
                              activeSection === subItem.id
                            }
                            className={`w-full justify-start text-sm py-2 sidebar-item text-white/90 hover:bg-white/10 transition-all duration-300 ${
                              activeSection === subItem.id ? 'sidebar-item-active' : ''
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
              {renderContent}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

