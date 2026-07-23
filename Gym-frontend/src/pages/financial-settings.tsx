import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Separator } from "../components/ui/separator";
import { toast } from 'sonner';
import { cn } from "../components/ui/utils";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  Building2,
  CreditCard,
  FileText,
  Calculator,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  financialSettingsService,
  FinancialSetting,
  FinancialSettingRequest,
} from '../utils/supabase/financial-settings-service';

const CATEGORIES = ['GENERAL', 'ACCOUNTING', 'TAX', 'BANK'] as const;
type Category = typeof CATEGORIES[number];

const categoryMeta: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  GENERAL: { label: 'General', icon: <Settings className="h-4 w-4" />, color: 'text-gray-600' },
  ACCOUNTING: { label: 'Accounting', icon: <Calculator className="h-4 w-4" />, color: 'text-blue-600' },
  TAX: { label: 'Tax', icon: <FileText className="h-4 w-4" />, color: 'text-orange-600' },
  BANK: { label: 'Bank', icon: <CreditCard className="h-4 w-4" />, color: 'text-green-600' },
};

export function FinancialSettings() {
  const panelCardShell = "bg-white border-0 shadow-sm";
  const statCardShell =
    "bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer";
  const tabContentShell = "animate-in fade-in-0 zoom-in-95 duration-200";

  const [settings, setSettings] = useState<FinancialSetting[]>([]);
  const [activeTab, setActiveTab] = useState<string>('GENERAL');
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<FinancialSetting | null>(null);
  const [form, setForm] = useState<FinancialSettingRequest>({
    settingKey: '',
    settingValue: '',
    category: 'GENERAL',
    description: '',
    isActive: true,
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financialSettingsService.getSettings();
      setSettings(data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const settingsForCategory = (cat: string) =>
    settings.filter(s => s.category === cat);

  const openAdd = () => {
    setEditingSetting(null);
    setForm({ settingKey: '', settingValue: '', category: activeTab, description: '', isActive: true });
    setShowDialog(true);
  };

  const openEdit = (s: FinancialSetting) => {
    setEditingSetting(s);
    setForm({
      settingKey: s.settingKey,
      settingValue: s.settingValue,
      category: s.category,
      description: s.description ?? '',
      isActive: s.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.settingKey || !form.category) {
      toast.error('Key and category are required');
      return;
    }
    try {
      await financialSettingsService.upsertSetting(form);
      toast.success(editingSetting ? 'Setting updated' : 'Setting created');
      setShowDialog(false);
      await loadSettings();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save setting');
    }
  };

  const handleToggleActive = async (s: FinancialSetting) => {
    try {
      await financialSettingsService.upsertSetting({
        settingKey: s.settingKey,
        settingValue: s.settingValue,
        category: s.category,
        description: s.description ?? undefined,
        isActive: !s.isActive,
      });
      toast.success(`Setting ${!s.isActive ? 'activated' : 'deactivated'}`);
      await loadSettings();
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const handleDelete = async (s: FinancialSetting) => {
    if (!window.confirm(`Delete setting "${s.settingKey}"?`)) return;
    try {
      await financialSettingsService.deleteSetting(s.id);
      toast.success('Setting deleted');
      await loadSettings();
    } catch {
      toast.error('Failed to delete setting');
    }
  };

  const handleInlineEdit = async (s: FinancialSetting, newValue: string) => {
    try {
      await financialSettingsService.upsertSetting({
        settingKey: s.settingKey,
        settingValue: newValue,
        category: s.category,
        description: s.description ?? undefined,
        isActive: s.isActive,
      });
      toast.success('Setting saved');
      await loadSettings();
    } catch {
      toast.error('Failed to save setting');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Settings</h1>
          <p className="text-gray-600 mt-1">Configure system-wide financial parameters and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Setting
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map(cat => {
          const count = settingsForCategory(cat).length;
          const active = settingsForCategory(cat).filter(s => s.isActive).length;
          const meta = categoryMeta[cat];
          return (
            <Card key={cat} className={cn(statCardShell, activeTab === cat && "ring-2 ring-primary/50")}
              onClick={() => setActiveTab(cat)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={meta.color}>{meta.icon}</span>
                  <Badge variant={activeTab === cat ? 'default' : 'outline'}>{count}</Badge>
                </div>
                <p className="font-medium text-sm">{meta.label}</p>
                <p className="text-xs text-gray-500">{active} active</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {categoryMeta[cat].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat} value={cat} className={cn("mt-4", tabContentShell)}>
            <Card className={panelCardShell}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={categoryMeta[cat].color}>{categoryMeta[cat].icon}</span>
                    {categoryMeta[cat].label} Settings
                  </CardTitle>
                  <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={openAdd}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settingsForCategory(cat).length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No {categoryMeta[cat].label.toLowerCase()} settings yet</p>
                    <Button size="sm" className="mt-3 shadow-sm hover:shadow-md transition-all" onClick={openAdd}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Setting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settingsForCategory(cat).map(s => (
                      <SettingRow
                        key={s.id}
                        setting={s}
                        onEdit={() => openEdit(s)}
                        onDelete={() => handleDelete(s)}
                        onToggle={() => handleToggleActive(s)}
                        onInlineSave={(val) => handleInlineEdit(s, val)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSetting ? 'Edit Setting' : 'Add Setting'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Setting Key *</Label>
              <Input
                value={form.settingKey}
                onChange={e => setForm(f => ({ ...f, settingKey: e.target.value }))}
                placeholder="e.g. fiscal_year_start"
                disabled={!!editingSetting}
              />
            </div>
            <div>
              <Label>Value</Label>
              <Input
                value={form.settingValue}
                onChange={e => setForm(f => ({ ...f, settingValue: e.target.value }))}
                placeholder="Setting value"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{categoryMeta[c].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this setting control?"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingRow({
  setting,
  onEdit,
  onDelete,
  onToggle,
  onInlineSave,
}: {
  setting: FinancialSetting;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onInlineSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting.settingValue);

  const save = () => {
    onInlineSave(value);
    setEditing(false);
  };

  const cancel = () => {
    setValue(setting.settingValue);
    setEditing(false);
  };

  return (
    <div className="flex items-start justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{setting.settingKey}</span>
          {setting.isActive ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          )}
        </div>
        {setting.description && (
          <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
        )}
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={e => setValue(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            />
            <Button size="sm" className="h-7 px-2" onClick={save}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancel}>
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className="text-sm text-gray-700 bg-white rounded px-2 py-0.5 inline-block cursor-pointer hover:bg-gray-50 ring-1 ring-black/5"
            onClick={() => setEditing(true)}
            title="Click to edit value"
          >
            {setting.settingValue || <span className="italic text-gray-400">empty</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Switch
          checked={setting.isActive}
          onCheckedChange={onToggle}
          className="scale-75"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
