import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Snowflake,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Sun,
  BarChart3,
} from 'lucide-react';
import { format, addDays, differenceInDays } from "date-fns";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

interface FreezeUnfreezeProps {
  onNavigate?: (section: string) => void;
}

// Sample data for frozen members
const frozenMembersData = [
  {
    id: 'MBR-123456',
    name: 'Ahmed Al-Mansoori',
    planName: 'Premium Fitness',
    freezeStartDate: '2024-10-15',
    freezeEndDate: '2024-11-15',
    daysFrozen: 31,
    status: 'Frozen',
    autoUnfreeze: true,
    freezeCount: 1,
    maxFreezeCount: 2,
    maxFreezeDays: 60,
    usedDays: 31,
    phone: '+971 50 123 4567',
  },
  {
    id: 'MBR-234567',
    name: 'Fatima Hassan',
    planName: 'Basic Gym',
    freezeStartDate: '2024-10-20',
    freezeEndDate: '2024-11-05',
    daysFrozen: 16,
    status: 'Frozen',
    autoUnfreeze: true,
    freezeCount: 1,
    maxFreezeCount: 1,
    maxFreezeDays: 30,
    usedDays: 16,
    phone: '+971 52 234 5678',
  },
  {
    id: 'MBR-345678',
    name: 'Mohammed Khalid',
    planName: 'Premium Plus',
    freezeStartDate: '2024-10-10',
    freezeEndDate: '2024-12-10',
    daysFrozen: 61,
    status: 'Frozen',
    autoUnfreeze: false,
    freezeCount: 1,
    maxFreezeCount: 3,
    maxFreezeDays: 90,
    usedDays: 61,
    phone: '+971 55 345 6789',
  },
  {
    id: 'MBR-456789',
    name: 'Sara Abdullah',
    planName: 'Family Plan',
    freezeStartDate: '2024-10-18',
    freezeEndDate: '2024-11-18',
    daysFrozen: 31,
    status: 'Frozen',
    autoUnfreeze: true,
    freezeCount: 2,
    maxFreezeCount: 2,
    maxFreezeDays: 60,
    usedDays: 45,
    phone: '+971 56 456 7890',
  },
];

// Sample members for search
const allMembers = [
  {
    id: 'MBR-111111',
    name: 'Ali Rashid',
    phone: '+971 50 111 1111',
    email: 'ali.rashid@email.com',
    planName: 'Premium Fitness',
    planId: 'PLN-001',
    status: 'Active',
    maxFreezeDays: 60,
    maxFreezeCount: 2,
    usedFreezeDays: 0,
    usedFreezeCount: 0,
    chargePerExtraDay: 10,
    autoUnfreezeDefault: true,
  },
  {
    id: 'MBR-222222',
    name: 'Layla Ahmed',
    phone: '+971 52 222 2222',
    email: 'layla.ahmed@email.com',
    planName: 'Basic Gym',
    planId: 'PLN-002',
    status: 'Active',
    maxFreezeDays: 30,
    maxFreezeCount: 1,
    usedFreezeDays: 0,
    usedFreezeCount: 0,
    chargePerExtraDay: 5,
    autoUnfreezeDefault: true,
  },
  ...frozenMembersData,
];

export function FreezeUnfreeze({ onNavigate }: FreezeUnfreezeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [freezeStartDate, setFreezeStartDate] = useState<Date | undefined>(undefined);
  const [freezeEndDate, setFreezeEndDate] = useState<Date | undefined>(undefined);
  const [autoUnfreeze, setAutoUnfreeze] = useState(true);
  const [freezeNotes, setFreezeNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('frozen');
  const [showFreezeHistory, setShowFreezeHistory] = useState(false);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<any>(null);

  // Calculate freeze days and charges
  const calculateFreezeDays = () => {
    if (!freezeStartDate || !freezeEndDate) return 0;
    return differenceInDays(freezeEndDate, freezeStartDate) + 1;
  };

  const totalDays = calculateFreezeDays();
  const freeDaysAvailable = selectedMember
    ? Math.max(0, selectedMember.maxFreezeDays - selectedMember.usedFreezeDays)
    : 0;
  const extraDays = Math.max(0, totalDays - freeDaysAvailable);
  const chargeForExtraDays = selectedMember
    ? extraDays * (selectedMember.chargePerExtraDay || 0)
    : 0;

  // Filter members
  const filteredMembers = frozenMembersData.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'frozen' && member.status === 'Frozen') ||
      (filterStatus === 'active' && member.status === 'Active');

    return matchesSearch && matchesStatus;
  });

  // Search member for freezing
  const searchResults = allMembers.filter((member) => {
    if (!searchQuery) return false;
    return (
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Handle freeze submission
  const handleFreezeMembership = () => {
    if (!selectedMember || !freezeStartDate || !freezeEndDate) {
      toast.error('Please fill all required fields');
      return;
    }

    if (freezeStartDate >= freezeEndDate) {
      toast.error('End date must be after start date');
      return;
    }

    // Check if member has exceeded freeze count
    if (selectedMember.usedFreezeCount >= selectedMember.maxFreezeCount) {
      toast.error(`Member has already used all ${selectedMember.maxFreezeCount} freezes allowed for this plan`);
      return;
    }

    toast.success(`Membership frozen for ${selectedMember.name}`, {
      description: `${totalDays} days from ${format(freezeStartDate, 'dd MMM yyyy')} to ${format(freezeEndDate, 'dd MMM yyyy')}${chargeForExtraDays > 0 ? ` | Charge: AED ${chargeForExtraDays}` : ''}`,
    });

    // Reset form
    setSelectedMember(null);
    setFreezeStartDate(undefined);
    setFreezeEndDate(undefined);
    setFreezeNotes('');
    setSearchQuery('');
  };

  // Handle unfreeze
  const handleUnfreeze = (member: any) => {
    toast.success(`Membership unfrozen for ${member.name}`, {
      description: `Member status updated to Active`,
    });
  };

  // Mock freeze history data
  const freezeHistory = [
    {
      id: 1,
      startDate: '2024-06-15',
      endDate: '2024-07-15',
      days: 30,
      reason: 'Travel',
      status: 'Completed',
      chargedAmount: 0,
    },
    {
      id: 2,
      startDate: '2024-10-15',
      endDate: '2024-11-15',
      days: 31,
      reason: 'Medical',
      status: 'Active',
      chargedAmount: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('members')}
              className="text-gray-600 hover:text-[#2B7A78]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Members
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#2B7A78] to-[#1a4d4b] flex items-center justify-center">
            <Snowflake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-gray-900">Freeze / Unfreeze Memberships</h1>
            <p className="text-sm text-gray-600">Manage membership freeze requests with plan-based limits and automated notifications</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Freeze New Member */}
        <div className="lg:col-span-1">
          <Card className="border-[#2B7A78]/20">
            <CardHeader className="bg-gradient-to-r from-[#DFF5F4] to-white border-b border-[#2B7A78]/10">
              <CardTitle className="flex items-center space-x-2">
                <Snowflake className="h-5 w-5 text-[#2B7A78]" />
                <span>Freeze Member</span>
              </CardTitle>
              <CardDescription>Search and freeze a member's membership</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Search Member */}
              <div className="space-y-2">
                <Label>Search Member</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Name, ID, Phone, or Email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedMember(null);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Search Results Dropdown */}
                {searchQuery && searchResults.length > 0 && !selectedMember && (
                  <Card className="mt-2 border-[#2B7A78]/20 max-h-64 overflow-y-auto">
                    <CardContent className="p-2">
                      {searchResults.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => {
                            setSelectedMember(member);
                            setSearchQuery(member.name);
                            setAutoUnfreeze(member.autoUnfreezeDefault);
                          }}
                          className="w-full p-3 hover:bg-[#DFF5F4] rounded-lg text-left transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border-2 border-[#2B7A78]">
                              <AvatarFallback className="bg-[#2B7A78] text-white">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-600">{member.id} • {member.planName}</p>
                            </div>
                            <Badge
                              className={
                                member.status === 'Active'
                                  ? 'bg-green-100 text-green-700'
                                  : member.status === 'Frozen'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }
                            >
                              {member.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Selected Member Details */}
              {selectedMember && (
                <Card className="border-[#2B7A78]/30 bg-[#DFF5F4]/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12 border-2 border-[#2B7A78]">
                          <AvatarFallback className="bg-[#2B7A78] text-white">
                            {selectedMember.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900">{selectedMember.name}</p>
                          <p className="text-xs text-gray-600">{selectedMember.id}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(null);
                          setSearchQuery('');
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2B7A78]/20">
                      <div>
                        <p className="text-xs text-gray-600">Plan</p>
                        <p className="font-medium text-sm">{selectedMember.planName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {selectedMember.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Max Freeze Days</p>
                        <p className="font-semibold text-[#2B7A78]">{selectedMember.maxFreezeDays} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Used Days</p>
                        <p className="font-semibold text-orange-600">{selectedMember.usedFreezeDays} days</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Freezes Allowed</p>
                        <p className="font-semibold text-[#2B7A78]">{selectedMember.maxFreezeCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Freezes Used</p>
                        <p className="font-semibold text-orange-600">{selectedMember.usedFreezeCount}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#2B7A78]/20">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">Balance Days Remaining</p>
                        <p className="font-bold text-[#2B7A78]">
                          {selectedMember.maxFreezeDays - selectedMember.usedFreezeDays} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Freeze Dates */}
              {selectedMember && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Freeze Start Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {freezeStartDate ? format(freezeStartDate, 'dd MMM yyyy') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={freezeStartDate}
                            onSelect={setFreezeStartDate}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Freeze End Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={freezeEndDate}
                            onSelect={setFreezeEndDate}
                            disabled={(date) => !freezeStartDate || date <= freezeStartDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Freeze Summary */}
                  {freezeStartDate && freezeEndDate && (
                    <Card className="border-[#2B7A78]/30 bg-white">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Total Days</p>
                          <p className="font-bold text-gray-900">{totalDays} days</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Free Days Available</p>
                          <p className="font-semibold text-green-600">{freeDaysAvailable} days</p>
                        </div>
                        {extraDays > 0 && (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600">Extra Days</p>
                              <p className="font-semibold text-orange-600">{extraDays} days</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-900">Charge for Extra Days</p>
                              <p className="font-bold text-[#E63946]">AED {chargeForExtraDays}</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Auto Unfreeze */}
                  <div className="flex items-center justify-between p-4 border border-[#2B7A78]/20 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Auto Unfreeze on End Date</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Automatically activate membership on {freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : 'end date'}
                      </p>
                    </div>
                    <Switch checked={autoUnfreeze} onCheckedChange={setAutoUnfreeze} />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add reason or notes for this freeze..."
                      value={freezeNotes}
                      onChange={(e) => setFreezeNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Freeze Button */}
                  <Button
                    onClick={handleFreezeMembership}
                    className="w-full bg-[#E63946] hover:bg-[#d12935] text-white"
                    disabled={!freezeStartDate || !freezeEndDate}
                  >
                    <Snowflake className="h-4 w-4 mr-2" />
                    Freeze Membership
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Frozen Members List */}
        <div className="lg:col-span-2">
          <Card className="border-[#2B7A78]/20">
            <CardHeader className="bg-gradient-to-r from-[#DFF5F4] to-white border-b border-[#2B7A78]/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Sun className="h-5 w-5 text-[#2B7A78]" />
                    <span>Currently Frozen Members</span>
                  </CardTitle>
                  <CardDescription>View and manage all frozen memberships</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search frozen members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Frozen Members Table */}
              <div className="border border-[#2B7A78]/20 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#DFF5F4]/50">
                      <TableHead>Member Name</TableHead>
                      <TableHead>Member ID</TableHead>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Freeze Start</TableHead>
                      <TableHead>Freeze End</TableHead>
                      <TableHead>Days Frozen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto Unfreeze</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id} className="hover:bg-[#DFF5F4]/20">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8 border border-[#2B7A78]">
                                <AvatarFallback className="bg-[#2B7A78] text-white text-xs">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{member.name}</p>
                                <p className="text-xs text-gray-600">{member.phone}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{member.id}</TableCell>
                          <TableCell>{member.planName}</TableCell>
                          <TableCell>{format(new Date(member.freezeStartDate), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{format(new Date(member.freezeEndDate), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-700">
                              {member.daysFrozen} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                member.status === 'Frozen'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }
                            >
                              <Snowflake className="h-3 w-3 mr-1" />
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.autoUnfreeze ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">
                                <XCircle className="h-3 w-3 mr-1" />
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMemberHistory(member);
                                  setShowFreezeHistory(true);
                                }}
                                className="border-[#2B7A78]/30 text-[#2B7A78] hover:bg-[#DFF5F4]"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                History
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnfreeze(member)}
                                className="border-green-300 text-green-700 hover:bg-green-50"
                              >
                                <Sun className="h-3 w-3 mr-1" />
                                Unfreeze
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          <Snowflake className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No frozen members found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <Card className="border-[#2B7A78]/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Total Frozen</p>
                        <p className="font-bold text-gray-900">{frozenMembersData.length}</p>
                      </div>
                      <Snowflake className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#2B7A78]/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Auto Unfreeze</p>
                        <p className="font-bold text-gray-900">
                          {frozenMembersData.filter(m => m.autoUnfreeze).length}
                        </p>
                      </div>
                      <RefreshCw className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#2B7A78]/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Total Days</p>
                        <p className="font-bold text-gray-900">
                          {frozenMembersData.reduce((acc, m) => acc + m.daysFrozen, 0)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#2B7A78]/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Avg Duration</p>
                        <p className="font-bold text-gray-900">
                          {Math.round(frozenMembersData.reduce((acc, m) => acc + m.daysFrozen, 0) / frozenMembersData.length)} days
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Freeze History Dialog */}
      <Dialog open={showFreezeHistory} onOpenChange={setShowFreezeHistory}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Freeze History</DialogTitle>
            <DialogDescription>
              Complete freeze/unfreeze history for {selectedMemberHistory?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border-[#2B7A78]/20 bg-[#DFF5F4]/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Member ID</p>
                    <p className="font-medium">{selectedMemberHistory?.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Current Plan</p>
                    <p className="font-medium">{selectedMemberHistory?.planName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Freezes Used</p>
                    <p className="font-medium">
                      {selectedMemberHistory?.freezeCount} / {selectedMemberHistory?.maxFreezeCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="border border-[#2B7A78]/20 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#DFF5F4]/50">
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Charged</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freezeHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.startDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(record.endDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700">{record.days} days</Badge>
                      </TableCell>
                      <TableCell>{record.reason}</TableCell>
                      <TableCell>
                        {record.chargedAmount > 0 ? (
                          <span className="font-medium text-[#E63946]">AED {record.chargedAmount}</span>
                        ) : (
                          <span className="text-gray-600">Free</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.status === 'Active'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

