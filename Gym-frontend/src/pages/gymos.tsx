import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CurrencyGlyph } from '../utils/currency';
import { moduleService, PlatformModuleResponse, ModuleAuditLogEntry } from '../utils/supabase/module-service';
import { staffService, StaffTarget } from '../utils/supabase/staff-service';
import { rolesService, Role } from '../utils/supabase/roles-service';
import { integrationService, IntegrationResponse, IntegrationStatus } from '../utils/supabase/integration-service';
import { accessControlDeviceService, AccessControlDeviceResponse, DeviceStatus } from '../utils/supabase/access-control-device-service';
import { notificationService, AppNotification } from '../utils/supabase/notification-service';
import { NotificationPanel } from '../components/shared/NotificationPanel';
import { gymOsSettingsService, settingsToMap } from '../utils/supabase/gymos-settings-service';
import { deactivationReasonService, DeactivationReason } from '../utils/supabase/deactivation-reason-service';
import { catalogDisplaySectionService, CatalogDisplaySection } from '../utils/supabase/catalog-display-section-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SetTargets } from "./set-targets";
import { TargetsOverview } from "./targets-overview";
import { 
  Cog,
  Folder,
  Shield,
  Plug,
  Smartphone,
  Database,
  Bell,
  Monitor,
  Settings,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Activity,
  Wifi,
  WifiOff,
  Server,
  Eye,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  Power,
  PowerOff,
  BarChart3,
  Calendar,
  MapPin,
  Zap,
  Globe,
  Lock,
  Unlock,
  Camera,
  CreditCard,
  UserCheck,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  BookOpen,
  ShoppingCart,
  Calculator,
  CheckSquare,
  Square,
  ChefHat,
  Star,
  Target,
  Gauge,
  Crosshair,
  TrendingUpDown
} from 'lucide-react';

interface GymOSProps {
  onNavigate?: (section: string) => void;
}

export function GymOS({ onNavigate }: GymOSProps = {}) {
    const [catalogSections, setCatalogSections] = useState<CatalogDisplaySection[]>([]);
  const [catalogSectionsLoading, setCatalogSectionsLoading] = useState(true);
  const [catalogSectionsError, setCatalogSectionsError] = useState<string | null>(null);
  const [catalogToggleId, setCatalogToggleId] = useState<number | null>(null);
  const [posModeSavingId, setPosModeSavingId] = useState<string | null>(null);
  const [showCatalogConfig, setShowCatalogConfig] = useState(false);
  const [showPOSConfig, setShowPOSConfig] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [modules, setModules] = useState<PlatformModuleResponse[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [moduleActionKey, setModuleActionKey] = useState<string | null>(null);
  const [performanceTargets, setPerformanceTargets] = useState<StaffTarget[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<ModuleAuditLogEntry[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(true);
  const [auditLogError, setAuditLogError] = useState<string | null>(null);

  const [transferPolicy, setTransferPolicy] = useState<Record<string, string>>({});
  const [transferPolicyLoading, setTransferPolicyLoading] = useState(true);
  const [transferPolicyError, setTransferPolicyError] = useState<string | null>(null);
  const [transferPolicySaving, setTransferPolicySaving] = useState(false);
  const [transferPolicyDraft, setTransferPolicyDraft] = useState({
    allow_transfer: 'true',
    fee_structure: 'flat',
    default_transfer_fee: '100',
    min_days_after_joining: '15',
    require_admin_approval: 'false',
  });

  const loadTransferPolicy = useCallback(async () => {
    setTransferPolicyLoading(true);
    setTransferPolicyError(null);
    try {
      const data = await gymOsSettingsService.getByCategory('TRANSFER_POLICY');
      const map = settingsToMap(data);
      setTransferPolicy(map);
      setTransferPolicyDraft(prev => ({ ...prev, ...map }));
    } catch (err) {
      setTransferPolicyError('Failed to load transfer policy');
    } finally {
      setTransferPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransferPolicy();
  }, [loadTransferPolicy]);

  const saveTransferPolicy = async () => {
    setTransferPolicySaving(true);
    setTransferPolicyError(null);
    try {
      const data = await gymOsSettingsService.bulkUpsert('TRANSFER_POLICY', transferPolicyDraft);
      setTransferPolicy(settingsToMap(data));
    } catch (err) {
      setTransferPolicyError('Failed to save transfer policy');
    } finally {
      setTransferPolicySaving(false);
    }
  };

  const [deactivationPolicy, setDeactivationPolicy] = useState<Record<string, string>>({});
  const [deactivationPolicyLoading, setDeactivationPolicyLoading] = useState(true);
  const [deactivationPolicyError, setDeactivationPolicyError] = useState<string | null>(null);
  const [deactivationPolicySaving, setDeactivationPolicySaving] = useState(false);
  const [deactivationPolicyDraft, setDeactivationPolicyDraft] = useState({
    allow_deactivation: 'true',
    allow_refund: 'true',
    refund_method: 'prorated',
    approval_required: 'true',
  });

  const loadDeactivationPolicy = useCallback(async () => {
    setDeactivationPolicyLoading(true);
    setDeactivationPolicyError(null);
    try {
      const data = await gymOsSettingsService.getByCategory('DEACTIVATION_POLICY');
      const map = settingsToMap(data);
      setDeactivationPolicy(map);
      setDeactivationPolicyDraft(prev => ({ ...prev, ...map }));
    } catch (err) {
      setDeactivationPolicyError('Failed to load deactivation policy');
    } finally {
      setDeactivationPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeactivationPolicy();
  }, [loadDeactivationPolicy]);

  const saveDeactivationPolicy = async () => {
    setDeactivationPolicySaving(true);
    setDeactivationPolicyError(null);
    try {
      const data = await gymOsSettingsService.bulkUpsert('DEACTIVATION_POLICY', deactivationPolicyDraft);
      setDeactivationPolicy(settingsToMap(data));
    } catch (err) {
      setDeactivationPolicyError('Failed to save deactivation policy');
    } finally {
      setDeactivationPolicySaving(false);
    }
  };

  const [deactivationReasons, setDeactivationReasons] = useState<DeactivationReason[]>([]);
  const [deactivationReasonsLoading, setDeactivationReasonsLoading] = useState(true);
  const [deactivationReasonsError, setDeactivationReasonsError] = useState<string | null>(null);
  const [newDeactivationReason, setNewDeactivationReason] = useState('');
  const [addReasonSaving, setAddReasonSaving] = useState(false);

  const loadDeactivationReasons = useCallback(async () => {
    setDeactivationReasonsLoading(true);
    setDeactivationReasonsError(null);
    try {
      const data = await deactivationReasonService.getAll();
      setDeactivationReasons(data);
    } catch (err) {
      setDeactivationReasonsError('Failed to load deactivation reasons');
    } finally {
      setDeactivationReasonsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeactivationReasons();
  }, [loadDeactivationReasons]);

  const toggleDeactivationReason = async (reason: DeactivationReason) => {
    try {
      const updated = await deactivationReasonService.update(reason.id, { active: !reason.active });
      setDeactivationReasons(prev => prev.map(r => (r.id === reason.id ? updated : r)));
    } catch (err) {
      setDeactivationReasonsError('Failed to update reason');
    }
  };

  const addDeactivationReason = async () => {
    if (!newDeactivationReason.trim()) return;
    setAddReasonSaving(true);
    try {
      const created = await deactivationReasonService.create({ reason: newDeactivationReason.trim() });
      setDeactivationReasons(prev => [...prev, created]);
      setNewDeactivationReason('');
    } catch (err: any) {
      setDeactivationReasonsError(err?.response?.data?.message || 'Failed to add reason');
    } finally {
      setAddReasonSaving(false);
    }
  };

  const removeDeactivationReason = async (id: number) => {
    try {
      await deactivationReasonService.remove(id);
      setDeactivationReasons(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setDeactivationReasonsError('Failed to remove reason');
    }
  };

  const [systemConfig, setSystemConfig] = useState<Record<string, string>>({});
  const [systemConfigLoading, setSystemConfigLoading] = useState(true);
  const [systemConfigError, setSystemConfigError] = useState<string | null>(null);
  const [systemConfigSaving, setSystemConfigSaving] = useState(false);
  const [showSystemConfig, setShowSystemConfig] = useState(false);
  const [systemConfigDraft, setSystemConfigDraft] = useState({ session_timeout_minutes: '30', auto_logout_minutes: '60' });

  const loadSystemConfig = useCallback(async () => {
    setSystemConfigLoading(true);
    setSystemConfigError(null);
    try {
      const data = await gymOsSettingsService.getByCategory('SYSTEM_CONFIG');
      const map = settingsToMap(data);
      setSystemConfig(map);
      setSystemConfigDraft({
        session_timeout_minutes: map.session_timeout_minutes || '30',
        auto_logout_minutes: map.auto_logout_minutes || '60',
      });
    } catch (err) {
      setSystemConfigError('Failed to load system configuration');
    } finally {
      setSystemConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemConfig();
  }, [loadSystemConfig]);

  const saveSystemConfig = async () => {
    setSystemConfigSaving(true);
    setSystemConfigError(null);
    try {
      const data = await gymOsSettingsService.bulkUpsert('SYSTEM_CONFIG', systemConfigDraft);
      setSystemConfig(settingsToMap(data));
      setShowSystemConfig(false);
    } catch (err) {
      setSystemConfigError('Failed to save system configuration');
    } finally {
      setSystemConfigSaving(false);
    }
  };

  const loadCatalogSections = useCallback(async () => {
    setCatalogSectionsLoading(true);
    setCatalogSectionsError(null);
    try {
      const data = await catalogDisplaySectionService.getAll();
      setCatalogSections(data);
    } catch (err) {
      setCatalogSectionsError('Failed to load catalog sections');
    } finally {
      setCatalogSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogSections();
  }, [loadCatalogSections]);

  const toggleCatalogSection = async (id: number) => {
    setCatalogToggleId(id);
    try {
      const updated = await catalogDisplaySectionService.toggle(id);
      setCatalogSections(prev => prev.map(s => (s.id === id ? updated : s)));
    } catch (err) {
      setCatalogSectionsError('Failed to update section');
    } finally {
      setCatalogToggleId(null);
    }
  };

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await rolesService.getRoles('', 1, 100);
      setRoles(res.data);
    } catch (err) {
      setRolesError('Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const totalUsersWithRoles = roles.reduce((sum, r) => sum + (r.user_count || 0), 0);
  const adminRoleUserCount = roles
    .filter(r => r.is_system || /admin/i.test(r.role_name))
    .reduce((sum, r) => sum + (r.user_count || 0), 0);
  const topRolesByUsers = [...roles].sort((a, b) => b.user_count - a.user_count).slice(0, 2);

  const loadAuditLog = useCallback(async () => {
    setAuditLogLoading(true);
    setAuditLogError(null);
    try {
      const data = await moduleService.getAuditLog(20);
      setAuditLog(data);
    } catch (err) {
      setAuditLogError('Failed to load recent activity');
    } finally {
      setAuditLogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const [integrations, setIntegrations] = useState<IntegrationResponse[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationActionId, setIntegrationActionId] = useState<number | null>(null);

  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    try {
      const data = await integrationService.getAll();
      setIntegrations(data);
    } catch (err) {
      setIntegrationsError('Failed to load integrations');
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const connectedIntegrationsCount = integrations.filter(i => i.status === 'CONNECTED').length;
  const erroredIntegrationsCount = integrations.filter(i => i.status === 'ERROR').length;
  const avgIntegrationSuccessRate = integrations.filter(i => i.successRate != null).length > 0
    ? integrations.filter(i => i.successRate != null).reduce((sum, i) => sum + (i.successRate || 0), 0)
      / integrations.filter(i => i.successRate != null).length
    : 0;

  const [showAddIntegration, setShowAddIntegration] = useState(false);
  const [newIntegration, setNewIntegration] = useState({ integrationKey: '', name: '', category: '' });
  const [addIntegrationError, setAddIntegrationError] = useState<string | null>(null);
  const [addIntegrationSaving, setAddIntegrationSaving] = useState(false);

  const submitNewIntegration = async () => {
    if (!newIntegration.integrationKey.trim() || !newIntegration.name.trim() || !newIntegration.category.trim()) {
      setAddIntegrationError('Key, name, and category are required');
      return;
    }
    setAddIntegrationSaving(true);
    setAddIntegrationError(null);
    try {
      const created = await integrationService.create(newIntegration);
      setIntegrations(prev => [...prev, created]);
      setShowAddIntegration(false);
      setNewIntegration({ integrationKey: '', name: '', category: '' });
    } catch (err: any) {
      setAddIntegrationError(err?.response?.data?.message || 'Failed to create integration');
    } finally {
      setAddIntegrationSaving(false);
    }
  };

  const cycleIntegrationStatus = async (integration: IntegrationResponse) => {
    const next: IntegrationStatus = integration.status === 'DISCONNECTED' ? 'CONNECTED'
      : integration.status === 'CONNECTED' ? 'ERROR' : 'DISCONNECTED';
    setIntegrationActionId(integration.id);
    try {
      const updated = await integrationService.setStatus(integration.id, next);
      setIntegrations(prev => prev.map(i => (i.id === integration.id ? updated : i)));
    } catch (err) {
      setIntegrationsError('Failed to update integration status');
    } finally {
      setIntegrationActionId(null);
    }
  };

  const [devices, setDevices] = useState<AccessControlDeviceResponse[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [deviceActionId, setDeviceActionId] = useState<number | null>(null);

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    setDevicesError(null);
    try {
      const data = await accessControlDeviceService.getAll();
      setDevices(data);
    } catch (err) {
      setDevicesError('Failed to load access control devices');
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const onlineDevicesCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineDevicesCount = devices.filter(d => d.status === 'OFFLINE').length;

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({ deviceCode: '', name: '', deviceType: '', location: '' });
  const [addDeviceError, setAddDeviceError] = useState<string | null>(null);
  const [addDeviceSaving, setAddDeviceSaving] = useState(false);

  const submitNewDevice = async () => {
    if (!newDevice.deviceCode.trim() || !newDevice.name.trim() || !newDevice.deviceType.trim()) {
      setAddDeviceError('Code, name, and type are required');
      return;
    }
    setAddDeviceSaving(true);
    setAddDeviceError(null);
    try {
      const created = await accessControlDeviceService.create(newDevice);
      setDevices(prev => [...prev, created]);
      setShowAddDevice(false);
      setNewDevice({ deviceCode: '', name: '', deviceType: '', location: '' });
    } catch (err: any) {
      setAddDeviceError(err?.response?.data?.message || 'Failed to create device');
    } finally {
      setAddDeviceSaving(false);
    }
  };

  const cycleDeviceStatus = async (device: AccessControlDeviceResponse) => {
    const next: DeviceStatus = device.status === 'OFFLINE' ? 'ONLINE'
      : device.status === 'ONLINE' ? 'MAINTENANCE' : 'OFFLINE';
    setDeviceActionId(device.id);
    try {
      const updated = await accessControlDeviceService.setStatus(device.id, next);
      setDevices(prev => prev.map(d => (d.id === device.id ? updated : d)));
    } catch (err) {
      setDevicesError('Failed to update device status');
    } finally {
      setDeviceActionId(null);
    }
  };

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsTotal, setNotificationsTotal] = useState(0);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const page = await notificationService.getNotifications(0, 10);
      setNotifications(page.content);
      setNotificationsTotal(page.totalElements);
    } catch (err) {
      setNotificationsError('Failed to load notifications');
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadNotifications = notifications.filter(n => !n.isRead);

  const markNotificationRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setNotificationsError('Failed to update notification');
    }
  };

  const loadPerformanceTargets = useCallback(async () => {
    setPerformanceLoading(true);
    setPerformanceError(null);
    try {
      const now = new Date();
      const data = await staffService.getTargets(now.getFullYear(), now.getMonth() + 1);
      setPerformanceTargets(data);
    } catch (err) {
      setPerformanceError('Failed to load performance metrics');
    } finally {
      setPerformanceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPerformanceTargets();
  }, [loadPerformanceTargets]);

  const individualPerformanceTargets = performanceTargets.filter(t => t.scope === 'individual');
  const activeStaffCount = new Set(individualPerformanceTargets.map(t => t.staff_db_id)).size;
  const targetsMetCount = individualPerformanceTargets.filter(t => (t.percentage || 0) >= 100).length;
  const targetsInProgressCount = individualPerformanceTargets.filter(t => (t.percentage || 0) < 100).length;
  const totalPerformanceCommission = individualPerformanceTargets.reduce((sum, t) => sum + (t.commission_earned || 0), 0);
  const overallPerformancePercentage = individualPerformanceTargets.length > 0
    ? individualPerformanceTargets.reduce((sum, t) => sum + (t.percentage || 0), 0) / individualPerformanceTargets.length
    : 0;

  const loadModules = useCallback(async () => {
    setModulesLoading(true);
    setModulesError(null);
    try {
      const data = await moduleService.getAll();
      setModules(data);
    } catch (err) {
      setModulesError('Failed to load modules');
    } finally {
      setModulesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const toggleModuleEnabled = async (moduleKey: string, enabled: boolean) => {
    setModuleActionKey(moduleKey);
    try {
      const updated = await moduleService.setEnabled(moduleKey, enabled);
      setModules(prev => prev.map(m => (m.moduleKey === moduleKey ? updated : m)));
    } catch (err) {
      setModulesError('Failed to update module');
    } finally {
      setModuleActionKey(null);
    }
  };

  const activeModuleCount = modules.filter(m => m.status === 'ACTIVE').length;
  const maintenanceModuleCount = modules.filter(m => m.status === 'MAINTENANCE').length;

  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
      case 'Success': return 'bg-green-100 text-green-800';
      case 'maintenance':
      case 'Warning': return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'offline':
      case 'Error': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Face Recognition': return <Camera className="h-4 w-4" />;
      case 'NFC/Card Reader': return <CreditCard className="h-4 w-4" />;
      case 'QR Scanner': return <Monitor className="h-4 w-4" />;
      case 'Fingerprint': return <UserCheck className="h-4 w-4" />;
      case 'PIN Entry': return <Lock className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  const updateRolePOSMode = async (roleId: string, posMode: string) => {
    setPosModeSavingId(roleId);
    try {
      const updated = await rolesService.updateRole(roleId, { pos_mode: posMode });
      setRoles(prev => prev.map(r => (r.id === roleId ? updated : r)));
    } catch (err) {
      setRolesError('Failed to update POS mode');
    } finally {
      setPosModeSavingId(null);
    }
  };

  const getTotalUsers = () => totalUsersWithRoles;
  const getRetailPOSCount = () => roles.filter(role => role.pos_mode === 'Retail POS').reduce((sum, role) => sum + (role.user_count || 0), 0);
  const getFnBPOSCount = () => roles.filter(role => role.pos_mode === 'F&B POS').reduce((sum, role) => sum + (role.user_count || 0), 0);

  const getEnabledCatalogCount = () => catalogSections.filter(s => s.enabled).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GymOS</h1>
          <p className="text-gray-600 mt-1">
            Business Operating System - System Configuration & Management for {getCurrentPeriod()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="pos-mode">POS Mode</TabsTrigger>
          <TabsTrigger value="performance-metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        {/* System Overview Tab */}
        <TabsContent value="overview" className="space-y-6">

      {/* NEW: Configuration Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Plans & Services Catalog Configuration Card */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Plans & Services Catalog Configuration</CardTitle>
                  <CardDescription>
                    Control what information is shown in the walk-in inquiry view
                  </CardDescription>
                </div>
              </div>
              <Dialog open={showCatalogConfig} onOpenChange={setShowCatalogConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Configure</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Plans & Services Catalog Configuration</DialogTitle>
                    <DialogDescription>
                      Select which sections will be displayed in the Plans & Services Catalog for walk-in inquiries.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {catalogSectionsError && (
                      <p className="text-sm text-red-600">{catalogSectionsError}</p>
                    )}
                    {catalogSectionsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading sections...</p>
                    ) : catalogSections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sections configured yet.</p>
                    ) : catalogSections.map((section) => (
                      <div key={section.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={catalogToggleId === section.id}
                            onClick={() => toggleCatalogSection(section.id)}
                            className="p-0 h-auto"
                          >
                            {section.enabled ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <h4 className="font-medium">{section.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {section.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button onClick={() => setShowCatalogConfig(false)}>
                      Done
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {catalogSectionsError && (
              <p className="text-sm text-red-600">{catalogSectionsError}</p>
            )}
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Active Sections</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {catalogSectionsLoading ? '—' : getEnabledCatalogCount()}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Total Sections</p>
                    <p className="text-2xl font-bold text-green-700">
                      {catalogSectionsLoading ? '—' : catalogSections.length}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded">
                    <Star className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Configuration Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Currently Displayed:</h4>
              {catalogSectionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  {catalogSections.filter(s => s.enabled).map((section) => (
                    <div key={section.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{section.title}</span>
                      </div>
                    </div>
                  ))}
                  {catalogSections.filter(s => !s.enabled).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      + {catalogSections.filter(s => !s.enabled).length} hidden section(s)
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => toast.info('Add Option is coming soon.')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCatalogConfig(true)}>
                <Eye className="h-4 w-4 mr-1" />
                View All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* POS Mode Options Card */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calculator className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>POS Mode Options</CardTitle>
                  <CardDescription>
                    Assign POS access type to user roles
                  </CardDescription>
                </div>
              </div>
              <Dialog open={showPOSConfig} onOpenChange={setShowPOSConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Manage</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>POS Mode Role Assignment</DialogTitle>
                    <DialogDescription>
                      Configure which POS mode each user role can access. Each role must be assigned to either Retail POS or F&B POS.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    {rolesError && (
                      <p className="text-sm text-red-600 mb-3">{rolesError}</p>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role Name</TableHead>
                          <TableHead>User Count</TableHead>
                          <TableHead>Assigned POS Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.role_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{role.user_count} users</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={role.pos_mode || ''}
                                disabled={posModeSavingId === role.id}
                                onValueChange={(value) => updateRolePOSMode(role.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Retail POS">
                                    <div className="flex items-center space-x-2">
                                      <ShoppingCart className="h-4 w-4" />
                                      <span>Retail POS</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="F&B POS">
                                    <div className="flex items-center space-x-2">
                                      <ChefHat className="h-4 w-4" />
                                      <span>F&B POS</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setShowPOSConfig(false)}>
                      Done
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Panel */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm text-purple-600">Total Roles</p>
                <p className="text-2xl font-bold text-purple-700">{rolesLoading ? '—' : roles.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-green-600">Retail POS</p>
                <p className="text-2xl font-bold text-green-700">{rolesLoading ? '—' : getRetailPOSCount()}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm text-orange-600">F&B POS</p>
                <p className="text-2xl font-bold text-orange-700">{rolesLoading ? '—' : getFnBPOSCount()}</p>
              </div>
            </div>

            {/* Role Assignment Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Current Assignments:</h4>
              <div className="space-y-2">
                {rolesLoading ? (
                  <div className="text-sm text-gray-400">Loading roles...</div>
                ) : roles.length === 0 ? (
                  <div className="text-sm text-gray-400">No roles configured</div>
                ) : roles.slice(0, 3).map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{role.role_name}</span>
                      <Badge variant="secondary" className="text-xs">{role.user_count}</Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      {role.pos_mode === 'Retail POS' ? (
                        <ShoppingCart className="h-3 w-3 text-green-600" />
                      ) : role.pos_mode === 'F&B POS' ? (
                        <ChefHat className="h-3 w-3 text-orange-600" />
                      ) : null}
                      <span className="text-xs">{role.pos_mode || 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
                {roles.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    + {roles.length - 3} more role(s)
                  </div>
                )}
              </div>
            </div>

            {/* Validation Status */}
            {!rolesLoading && roles.length > 0 && (
              roles.every(r => r.pos_mode) ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">All roles properly assigned</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      {roles.filter(r => !r.pos_mode).length} role(s) missing a POS mode assignment
                    </span>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Modules Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {activeModuleCount} / {modules.length}
                </p>
                <div className="flex items-center mt-2">
                  <Progress
                    value={modules.length ? (activeModuleCount / modules.length) * 100 : 0}
                    className="w-16 h-2 mr-2"
                  />
                  <span className="text-sm text-blue-600">
                    {modules.length ? Math.round((activeModuleCount / modules.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Folder className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Users with Permissions</p>
                <p className="text-2xl font-bold text-green-600">
                  {rolesLoading ? '—' : totalUsersWithRoles}
                </p>
                <div className="flex items-center mt-2">
                  <Shield className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">Across {roles.length} role{roles.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Integrations Active</p>
                <p className="text-2xl font-bold text-purple-600">
                  {integrationsLoading ? '—' : connectedIntegrationsCount}
                </p>
                <div className="flex items-center mt-2">
                  <Plug className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">
                    {integrationsLoading ? 'Loading…' : `${erroredIntegrationsCount} with errors`}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Devices Online</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {devicesLoading ? '—' : onlineDevicesCount}
                </p>
                <div className="flex items-center mt-2">
                  <Wifi className="h-4 w-4 text-cyan-500 mr-1" />
                  <span className="text-sm text-cyan-600">
                    {devicesLoading ? 'Loading…' : `${offlineDevicesCount} offline`}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-cyan-100 rounded-lg">
                <Smartphone className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Notifications</p>
                <p className="text-2xl font-bold text-orange-600">
                  {notificationsLoading ? '—' : unreadNotifications.length}
                </p>
                <div className="flex items-center mt-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">
                    {unreadNotifications.length > 0 ? 'Requires attention' : 'All caught up'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Head Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module Management */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Folder className="h-5 w-5 text-blue-600" />
                <CardTitle>Module Management</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadModules} disabled={modulesLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${modulesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Modules Installed</span>
                <span className="font-semibold">{modules.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Currently Active</span>
                <Badge className="bg-green-100 text-green-800">{activeModuleCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Under Maintenance</span>
                <Badge className="bg-yellow-100 text-yellow-800">{maintenanceModuleCount}</Badge>
              </div>
              <Progress value={modules.length ? (activeModuleCount / modules.length) * 100 : 0} className="h-2" />
              {modulesError && (
                <p className="text-xs text-red-600">{modulesError}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Roles & Permissions */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <CardTitle>User Roles & Permissions</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('administration/roles-permissions')}>Manage</Button>
            </div>
          </CardHeader>
          <CardContent>
            {rolesError && (
              <p className="text-xs text-red-600 mb-2">{rolesError}</p>
            )}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Roles</span>
                <span className="font-semibold">{rolesLoading ? '—' : roles.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Users with Admin Role</span>
                <Badge className="bg-red-100 text-red-800">{rolesLoading ? '—' : adminRoleUserCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <Badge className="bg-green-100 text-green-800">{rolesLoading ? '—' : totalUsersWithRoles}</Badge>
              </div>
              <div className="pt-2 space-y-1">
                {rolesLoading ? (
                  <div className="text-sm text-gray-400">Loading roles...</div>
                ) : topRolesByUsers.length === 0 ? (
                  <div className="text-sm text-gray-400">No roles configured</div>
                ) : topRolesByUsers.map((role) => (
                  <div key={role.id} className="flex justify-between text-sm">
                    <span>{role.role_name}</span>
                    <span>{role.user_count}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => onNavigate?.('administration/roles-permissions')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Role
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onNavigate?.('administration/roles-permissions')}>
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Integration */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plug className="h-5 w-5 text-purple-600" />
                <CardTitle>API Integration</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadIntegrations} disabled={integrationsLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${integrationsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {integrationsError && (
              <p className="text-xs text-red-600 mb-2">{integrationsError}</p>
            )}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Connected APIs</span>
                <span className="font-semibold">{integrationsLoading ? '—' : `${connectedIntegrationsCount} / ${integrations.length}`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Health Status</span>
                <Badge className={erroredIntegrationsCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                  {integrationsLoading ? '—' : erroredIntegrationsCount > 0 ? `${erroredIntegrationsCount} Error${erroredIntegrationsCount === 1 ? '' : 's'}` : 'Healthy'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Success Rate</span>
                <span className="text-sm font-semibold text-green-600">
                  {integrationsLoading ? '—' : `${avgIntegrationSuccessRate.toFixed(1)}%`}
                </span>
              </div>
              <Progress value={avgIntegrationSuccessRate} className="h-2" />
              <div className="pt-2 space-y-1">
                {integrationsLoading ? (
                  <div className="text-sm text-gray-400">Loading integrations...</div>
                ) : integrations.length === 0 ? (
                  <div className="text-sm text-gray-400">No integrations configured</div>
                ) : integrations.map((integration) => (
                  <div key={integration.id} className="flex justify-between items-center text-sm">
                    <span>{integration.name}</span>
                    <button
                      onClick={() => cycleIntegrationStatus(integration)}
                      disabled={integrationActionId === integration.id}
                      title="Click to change status"
                    >
                      <Badge className={
                        integration.status === 'CONNECTED' ? 'bg-green-100 text-green-800' :
                        integration.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {integration.status === 'CONNECTED' ? 'Connected' : integration.status === 'ERROR' ? 'Error' : 'Disconnected'}
                      </Badge>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Control Devices */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-cyan-600" />
                <CardTitle>Access Control Devices</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadDevices} disabled={devicesLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${devicesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {devicesError && (
              <p className="text-xs text-red-600 mb-2">{devicesError}</p>
            )}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Devices</span>
                <span className="font-semibold">{devicesLoading ? '—' : devices.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Online</span>
                <Badge className="bg-green-100 text-green-800">{devicesLoading ? '—' : onlineDevicesCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Offline</span>
                <Badge className="bg-red-100 text-red-800">{devicesLoading ? '—' : offlineDevicesCount}</Badge>
              </div>
              <div className="pt-2 space-y-1">
                {devicesLoading ? (
                  <div className="text-sm text-gray-400">Loading devices...</div>
                ) : devices.length === 0 ? (
                  <div className="text-sm text-gray-400">No devices registered</div>
                ) : devices.slice(0, 4).map((device) => (
                  <div key={device.id} className="flex justify-between items-center text-sm">
                    <span>{device.name}</span>
                    <button
                      onClick={() => cycleDeviceStatus(device)}
                      disabled={deviceActionId === device.id}
                      title="Click to change status"
                    >
                      <Badge className={
                        device.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                        device.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {device.status === 'ONLINE' ? 'Online' : device.status === 'MAINTENANCE' ? 'Maintenance' : 'Offline'}
                      </Badge>
                    </button>
                  </div>
                ))}
                {devices.length > 4 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    + {devices.length - 4} more device(s)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-gray-600" />
                <CardTitle>System Configuration</CardTitle>
              </div>
              <Dialog open={showSystemConfig} onOpenChange={setShowSystemConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Settings</Button>
                </DialogTrigger>
                <DialogContent className="w-auto max-w-[340px]">
                  <DialogHeader>
                    <DialogTitle>System Configuration</DialogTitle>
                    <DialogDescription>Session and auto-logout timing for this gym.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    {systemConfigError && (
                      <p className="text-sm text-red-600">{systemConfigError}</p>
                    )}
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        value={systemConfigDraft.session_timeout_minutes}
                        onChange={(e) => setSystemConfigDraft(prev => ({ ...prev, session_timeout_minutes: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600">Auto-logout Inactive Users (minutes)</label>
                      <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        value={systemConfigDraft.auto_logout_minutes}
                        onChange={(e) => setSystemConfigDraft(prev => ({ ...prev, auto_logout_minutes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowSystemConfig(false)}>Cancel</Button>
                    <Button onClick={saveSystemConfig} disabled={systemConfigSaving}>
                      {systemConfigSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemConfigError && (
                <p className="text-xs text-red-600">{systemConfigError}</p>
              )}
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Session Timeout</span>
                  <span>{systemConfigLoading ? '—' : `${systemConfig.session_timeout_minutes || '30'} min`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Auto-logout</span>
                  <span>{systemConfigLoading ? '—' : `${systemConfig.auto_logout_minutes || '60'} min`}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowSystemConfig(true)}>
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadNotifications} disabled={notificationsLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${notificationsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notificationsError && (
              <p className="text-xs text-red-600 mb-2">{notificationsError}</p>
            )}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <Badge className="bg-orange-100 text-orange-800">{notificationsLoading ? '—' : unreadNotifications.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-semibold">{notificationsLoading ? '—' : notificationsTotal}</span>
              </div>
              <div className="space-y-2 pt-2">
                {notificationsLoading ? (
                  <div className="text-sm text-gray-400">Loading notifications...</div>
                ) : unreadNotifications.length === 0 ? (
                  <div className="text-sm text-gray-400">No pending notifications</div>
                ) : unreadNotifications.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className={`text-sm p-2 rounded ${
                      n.type === 'DANGER' ? 'bg-red-50' :
                      n.type === 'WARNING' ? 'bg-yellow-50' :
                      n.type === 'SUCCESS' ? 'bg-green-50' : 'bg-blue-50'
                    }`}
                  >
                    <div className={`font-medium ${
                      n.type === 'DANGER' ? 'text-red-800' :
                      n.type === 'WARNING' ? 'text-yellow-800' :
                      n.type === 'SUCCESS' ? 'text-green-800' : 'text-blue-800'
                    }`}>{n.title}</div>
                    <div className={`text-xs ${
                      n.type === 'DANGER' ? 'text-red-600' :
                      n.type === 'WARNING' ? 'text-yellow-600' :
                      n.type === 'SUCCESS' ? 'text-green-600' : 'text-blue-600'
                    }`}>{n.message}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unreadNotifications.length === 0}
                  onClick={() => unreadNotifications.forEach(n => markNotificationRead(n.id))}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Read
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setNotificationPanelOpen(true)}>
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NotificationPanel
        open={notificationPanelOpen}
        onClose={() => {
          setNotificationPanelOpen(false);
          loadNotifications();
        }}
        onCountChange={() => {}}
      />

      {/* Bottom Section - Tabbed Tables */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="modules">Module Status</TabsTrigger>
          <TabsTrigger value="apis">API Health</TabsTrigger>
          <TabsTrigger value="devices">Device Status</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Recent Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Recent System Activity</span>
                  </CardTitle>
                  <CardDescription>Latest module management changes</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadAuditLog} disabled={auditLogLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${auditLogLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogError && (
                <p className="text-sm text-red-600 mb-3">{auditLogError}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-6">
                        Loading activity...
                      </TableCell>
                    </TableRow>
                  ) : auditLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-6">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  ) : auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {new Date(entry.createdAt).toLocaleString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.action.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.moduleKey}</TableCell>
                      <TableCell className="text-sm text-gray-600">{entry.summary}</TableCell>
                      <TableCell>{entry.performedBy || 'System'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Status */}
        <TabsContent value="modules" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Folder className="h-5 w-5 text-blue-600" />
                    <span>Module Status & Performance</span>
                  </CardTitle>
                  <CardDescription>Real-time status of all system modules</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadModules} disabled={modulesLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {modulesError && (
                <p className="text-sm text-red-600 mb-3">{modulesError}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Changed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modulesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-6">
                        Loading modules...
                      </TableCell>
                    </TableRow>
                  ) : modules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-6">
                        No modules found
                      </TableCell>
                    </TableRow>
                  ) : modules.map((module) => (
                    <TableRow key={module.moduleKey}>
                      <TableCell className="font-medium">{module.displayName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(module.status.toLowerCase())}>
                          {module.status === 'ACTIVE' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : module.status === 'MAINTENANCE' ? (
                            <><Clock className="h-3 w-3 mr-1" /> Maintenance</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {module.lastStatusChangeAt
                          ? new Date(module.lastStatusChangeAt).toLocaleDateString('en-GB')
                          : new Date(module.createdAt).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {module.enabled ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={moduleActionKey === module.moduleKey}
                              onClick={() => toggleModuleEnabled(module.moduleKey, false)}
                              title="Disable module"
                            >
                              <Pause className="h-4 w-4 text-yellow-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={moduleActionKey === module.moduleKey}
                              onClick={() => toggleModuleEnabled(module.moduleKey, true)}
                              title="Enable module"
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Health */}
        <TabsContent value="apis" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Plug className="h-5 w-5 text-purple-600" />
                    <span>API Integration Health</span>
                  </CardTitle>
                  <CardDescription>Performance and status of all API connections</CardDescription>
                </div>
                <Dialog open={showAddIntegration} onOpenChange={setShowAddIntegration}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle>Add Integration</DialogTitle>
                      <DialogDescription>Register a new third-party integration to track.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      {addIntegrationError && (
                        <p className="text-sm text-red-600">{addIntegrationError}</p>
                      )}
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Key (e.g. PAYMENT_GATEWAY)</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          value={newIntegration.integrationKey}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, integrationKey: e.target.value.toUpperCase() }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Name</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          value={newIntegration.name}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Category</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          placeholder="Payments, Messaging, ..."
                          value={newIntegration.category}
                          onChange={(e) => setNewIntegration(prev => ({ ...prev, category: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddIntegration(false)}>Cancel</Button>
                      <Button onClick={submitNewIntegration} disabled={addIntegrationSaving}>
                        {addIntegrationSaving ? 'Saving...' : 'Add Integration'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {integrationsError && (
                <p className="text-sm text-red-600 mb-3">{integrationsError}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        Loading integrations...
                      </TableCell>
                    </TableRow>
                  ) : integrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        No integrations configured
                      </TableCell>
                    </TableRow>
                  ) : integrations.map((api) => (
                    <TableRow key={api.id}>
                      <TableCell className="font-medium">{api.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{api.category}</TableCell>
                      <TableCell>
                        <Badge className={
                          api.status === 'CONNECTED' ? 'bg-green-100 text-green-800' :
                          api.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {api.status === 'CONNECTED' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                          ) : api.status === 'ERROR' ? (
                            <><XCircle className="h-3 w-3 mr-1" /> Error</>
                          ) : (
                            <>Disconnected</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {api.lastSyncAt ? new Date(api.lastSyncAt).toLocaleString('en-GB') : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={api.successRate || 0} className="w-16 h-2" />
                          <span className="text-sm">{api.successRate != null ? `${api.successRate}%` : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Cycle status"
                            disabled={integrationActionId === api.id}
                            onClick={() => cycleIntegrationStatus(api)}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove integration"
                            onClick={async () => {
                              await integrationService.remove(api.id);
                              setIntegrations(prev => prev.filter(i => i.id !== api.id));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Status */}
        <TabsContent value="devices" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-cyan-600" />
                    <span>Access Control Device Status</span>
                  </CardTitle>
                  <CardDescription>Real-time status of all access control devices</CardDescription>
                </div>
                <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Device
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle>Add Access Control Device</DialogTitle>
                      <DialogDescription>Register a new device for this branch.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      {addDeviceError && (
                        <p className="text-sm text-red-600">{addDeviceError}</p>
                      )}
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Device Code (e.g. AC-006)</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          value={newDevice.deviceCode}
                          onChange={(e) => setNewDevice(prev => ({ ...prev, deviceCode: e.target.value.toUpperCase() }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Name</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          value={newDevice.name}
                          onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Type</label>
                        <Select
                          value={newDevice.deviceType}
                          onValueChange={(value) => setNewDevice(prev => ({ ...prev, deviceType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Face Recognition">Face Recognition</SelectItem>
                            <SelectItem value="NFC/Card Reader">NFC / Card Reader</SelectItem>
                            <SelectItem value="QR Scanner">QR Scanner</SelectItem>
                            <SelectItem value="Fingerprint">Fingerprint</SelectItem>
                            <SelectItem value="PIN Entry">PIN Entry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Location</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                          placeholder="Main Entrance, Gym Floor, ..."
                          value={newDevice.location}
                          onChange={(e) => setNewDevice(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddDevice(false)}>Cancel</Button>
                      <Button onClick={submitNewDevice} disabled={addDeviceSaving}>
                        {addDeviceSaving ? 'Saving...' : 'Add Device'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {devicesError && (
                <p className="text-sm text-red-600 mb-3">{devicesError}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        Loading devices...
                      </TableCell>
                    </TableRow>
                  ) : devices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        No devices registered
                      </TableCell>
                    </TableRow>
                  ) : devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(device.deviceType)}
                          <span>{device.deviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{device.location || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          device.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                          device.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {device.status === 'ONLINE' ? (
                            <><Wifi className="h-3 w-3 mr-1" /> Online</>
                          ) : device.status === 'MAINTENANCE' ? (
                            <><Clock className="h-3 w-3 mr-1" /> Maintenance</>
                          ) : (
                            <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString('en-GB') : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Cycle status"
                            disabled={deviceActionId === device.id}
                            onClick={() => cycleDeviceStatus(device)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove device"
                            onClick={async () => {
                              await accessControlDeviceService.remove(device.id);
                              setDevices(prev => prev.filter(d => d.id !== device.id));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    <span>System Notifications</span>
                  </CardTitle>
                  <CardDescription>Important alerts and system notifications</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unreadNotifications.length === 0}
                  onClick={async () => {
                    await notificationService.markAllRead();
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsError && (
                <p className="text-sm text-red-600 mb-3">{notificationsError}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        Loading notifications...
                      </TableCell>
                    </TableRow>
                  ) : notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                        No notifications
                      </TableCell>
                    </TableRow>
                  ) : notifications.map((notification) => (
                    <TableRow key={notification.id} className={notification.isRead ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell className="text-sm text-gray-600">{notification.message}</TableCell>
                      <TableCell>
                        <Badge className={
                          notification.priority === 'CRITICAL' || notification.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {notification.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{notification.module}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(notification.createdAt).toLocaleString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Mark read"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={async () => {
                              await notificationService.deleteNotification(notification.id);
                              setNotifications(prev => prev.filter(n => n.id !== notification.id));
                              setNotificationsTotal(prev => Math.max(0, prev - 1));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </TabsContent>

        {/* POS Mode Tab */}
        <TabsContent value="pos-mode" className="space-y-6">
          <div className="p-6 text-center bg-white border-0 shadow-sm rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">POS Mode</h3>
              <p className="text-muted-foreground mb-6">
                Access Point of Sale functionality for retail and F&B operations.
              </p>
              <Button onClick={() => onNavigate?.('point-of-sale')} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Launch POS Mode
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance-metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Targets Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Set Targets</CardTitle>
                      <CardDescription>
                        Configure staff revenue and unit-based targets
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => onNavigate?.('set-targets')}>
                    <Target className="h-4 w-4 mr-2" />
                    Configure Targets
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Active Targets</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {performanceLoading ? '—' : individualPerformanceTargets.length}
                        </p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Manage individual staff and institution-wide performance targets.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Targets Overview Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Gauge className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Targets Overview</CardTitle>
                      <CardDescription>
                        Monitor staff performance and target achievement
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => onNavigate?.('targets-overview')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Overall Progress</p>
                        <p className="text-2xl font-bold text-green-700">
                          {performanceLoading ? '—' : `${overallPerformancePercentage.toFixed(1)}%`}
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 rounded">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Real-time performance tracking and analytics dashboard.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance Summary</CardTitle>
                  <CardDescription>Overview of current staff performance metrics</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={performanceLoading}
                  onClick={loadPerformanceTargets}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${performanceLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {performanceError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {performanceError}
                </div>
              )}
              {!performanceLoading && !performanceError && individualPerformanceTargets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No performance targets set for this period yet.
                  <div className="mt-3">
                    <Button size="sm" onClick={() => onNavigate?.('set-targets')}>
                      <Target className="h-4 w-4 mr-2" />
                      Set a Target
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-blue-600">Active Staff</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {performanceLoading ? '—' : activeStaffCount}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-sm text-green-600">Targets Met</p>
                    <p className="text-2xl font-bold text-green-700">
                      {performanceLoading ? '—' : targetsMetCount}
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <p className="text-sm text-yellow-600">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {performanceLoading ? '—' : targetsInProgressCount}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Calculator className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-sm text-purple-600">Total Commission</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {performanceLoading ? '—' : <><CurrencyGlyph /> {totalPerformanceCommission.toLocaleString()}</>}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Header Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>GymOS Configuration & Policies</CardTitle>
                    <CardDescription>
                      Manage system-wide operational policies and member management rules
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Transfer Policy Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Transfer Policy</CardTitle>
                      <CardDescription>
                        Configure rules for transferring memberships between members
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={transferPolicyDraft.allow_transfer === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {transferPolicyDraft.allow_transfer === 'true' ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {transferPolicyError && (
                  <p className="text-sm text-red-600">{transferPolicyError}</p>
                )}
                {/* Allow Transfer Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Allow Transfer</h4>
                    <p className="text-sm text-gray-600">Enable or disable membership transfer feature</p>
                  </div>
                  <Switch
                    checked={transferPolicyDraft.allow_transfer === 'true'}
                    onCheckedChange={(checked) => setTransferPolicyDraft(prev => ({ ...prev, allow_transfer: String(checked) }))}
                  />
                </div>

                {/* Transfer Fee Policy */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Transfer Fee Policy</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-2">Fee Structure</label>
                      <Select
                        value={transferPolicyDraft.fee_structure}
                        onValueChange={(value) => setTransferPolicyDraft(prev => ({ ...prev, fee_structure: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Fee</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-2">Default Transfer Fee</label>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2"><CurrencyGlyph /></span>
                        <input
                          type="number"
                          value={transferPolicyDraft.default_transfer_fee}
                          onChange={(e) => setTransferPolicyDraft(prev => ({ ...prev, default_transfer_fee: e.target.value }))}
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Window */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Transfer Window</h4>
                  <p className="text-sm text-gray-600">
                    Restrict when transfers can be initiated after member joins
                  </p>
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Minimum Days After Joining</label>
                    <input
                      type="number"
                      placeholder="15"
                      value={transferPolicyDraft.min_days_after_joining}
                      onChange={(e) => setTransferPolicyDraft(prev => ({ ...prev, min_days_after_joining: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">e.g., Transfer allowed only after 15 days of joining</p>
                  </div>
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Require Admin Approval</h4>
                    <p className="text-sm text-gray-600">All transfer requests need manager approval</p>
                  </div>
                  <Switch
                    checked={transferPolicyDraft.require_admin_approval === 'true'}
                    onCheckedChange={(checked) => setTransferPolicyDraft(prev => ({ ...prev, require_admin_approval: String(checked) }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveTransferPolicy} disabled={transferPolicySaving || transferPolicyLoading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {transferPolicySaving ? 'Saving...' : 'Save Transfer Policy'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Deactivation Policy Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle>Member Deactivation Policy</CardTitle>
                      <CardDescription>
                        Control conditions for membership deactivation and refunds
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={deactivationPolicyDraft.allow_deactivation === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {deactivationPolicyDraft.allow_deactivation === 'true' ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {deactivationPolicyError && (
                  <p className="text-sm text-red-600">{deactivationPolicyError}</p>
                )}
                {/* Allow Deactivation Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Allow Deactivation</h4>
                    <p className="text-sm text-gray-600">Global toggle for membership deactivation feature</p>
                  </div>
                  <Switch
                    checked={deactivationPolicyDraft.allow_deactivation === 'true'}
                    onCheckedChange={(checked) => setDeactivationPolicyDraft(prev => ({ ...prev, allow_deactivation: String(checked) }))}
                  />
                </div>

                {/* Allow Refund Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Allow Refund</h4>
                    <p className="text-sm text-gray-600">Enable refund processing during deactivation</p>
                  </div>
                  <Switch
                    checked={deactivationPolicyDraft.allow_refund === 'true'}
                    onCheckedChange={(checked) => setDeactivationPolicyDraft(prev => ({ ...prev, allow_refund: String(checked) }))}
                  />
                </div>

                {/* Refund Method */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Refund Method</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Determines how refund amounts are calculated
                  </p>
                  <Select
                    value={deactivationPolicyDraft.refund_method}
                    onValueChange={(value) => setDeactivationPolicyDraft(prev => ({ ...prev, refund_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                      <SelectItem value="prorated">Pro-Rated (Days Remaining)</SelectItem>
                      <SelectItem value="none">No Refund</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Pro-Rated:</strong> Refund = (Days Remaining / Total Days) × Amount Paid
                  </p>
                </div>

                {/* Approval Required */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Approval Required</h4>
                    <p className="text-sm text-gray-600">Require manager approval for deactivation</p>
                  </div>
                  <Switch
                    checked={deactivationPolicyDraft.approval_required === 'true'}
                    onCheckedChange={(checked) => setDeactivationPolicyDraft(prev => ({ ...prev, approval_required: String(checked) }))}
                  />
                </div>

                {/* Default Deactivation Reasons */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Default Deactivation Reasons</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Pre-defined reasons for reporting consistency
                  </p>
                  {deactivationReasonsError && (
                    <p className="text-sm text-red-600">{deactivationReasonsError}</p>
                  )}
                  <div className="space-y-2">
                    {deactivationReasonsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading reasons...</p>
                    ) : deactivationReasons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No reasons configured yet.</p>
                    ) : deactivationReasons.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                        <span className="text-sm">{r.reason}</span>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={`text-xs cursor-pointer ${r.active ? '' : 'opacity-50'}`}
                            onClick={() => toggleDeactivationReason(r)}
                          >
                            {r.active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => removeDeactivationReason(r.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                      placeholder="New reason..."
                      value={newDeactivationReason}
                      onChange={(e) => setNewDeactivationReason(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addDeactivationReason(); }}
                    />
                    <Button variant="outline" size="sm" onClick={addDeactivationReason} disabled={addReasonSaving}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveDeactivationPolicy} disabled={deactivationPolicySaving || deactivationPolicyLoading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {deactivationPolicySaving ? 'Saving...' : 'Save Deactivation Policy'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

