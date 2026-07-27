import React, { useState } from 'react';
import { useCurrency, CurrencyGlyph } from '../../utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { InfoRow } from './info-row';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  AlertTriangle,
  User,
  CreditCard,
  Activity,
  QrCode,
  Download,
  Printer,
  Smartphone,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Member, membersService } from '../../utils/supabase/members-service';
import { calculateHealthRisk, getRiskBadgeConfig, formatEmergencyData } from '../../utils/health-risk';
import QRCode from 'react-qr-code';

interface MemberDetailProps {
  member: Member;
  onClose: () => void;
  onNavigate?: (section: string) => void;
}

export function MemberDetail({ member, onClose, onNavigate }: MemberDetailProps) {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('profile');
  const [showQRModal, setShowQRModal] = useState(false);
  const [appAccessEnabled, setAppAccessEnabled] = useState<boolean | null>(
    member.app_access_enabled ?? null
  );
  const [isTogglingAccess, setIsTogglingAccess] = useState(false);

  const handleToggleAccess = async () => {
    if (!member.user_id) return;
    const newState = !appAccessEnabled;
    setIsTogglingAccess(true);
    try {
      await membersService.toggleMemberAccess(member.id, newState);
      setAppAccessEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle app access', err);
    } finally {
      setIsTogglingAccess(false);
    }
  };

  // Calculate health risk level
  const healthRisk = calculateHealthRisk({
    medical_conditions: member.medical_conditions,
    allergies: member.allergies,
    current_medications: member.current_medications,
    emergency_contact_name: member.emergency_contact_name,
    emergency_contact_phone: member.emergency_contact_phone,
  });

  const riskBadgeConfig = getRiskBadgeConfig(healthRisk);
  const emergencyData = formatEmergencyData({
    medical_conditions: member.medical_conditions,
    allergies: member.allergies,
    current_medications: member.current_medications,
    emergency_contact_name: member.emergency_contact_name,
    emergency_contact_phone: member.emergency_contact_phone,
  });

  // Generate emergency QR code URL
  const emergencyQRUrl = `${window.location.origin}/emergency/${member.id}`;

  const getMemberId = () => member.member_id || member.id;
  const getMembershipPlan = () => member.membership_plan || member.membership_type;

  const getAge = () => {
    if (!member.date_of_birth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(member.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#2B7A78] hover:text-[#2B7A78]/80 hover:bg-[#2B7A78]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Members
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQRModal(true)}
              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Emergency QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Profile
            </Button>
          </div>
        </div>

        {/* Member Header Card */}
        <Card className="border-2 border-[#2B7A78]/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-[#2B7A78] to-[#2B7A78]/80 text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-3xl">{member.name}</h1>
                    <Badge className={riskBadgeConfig.className}>
                      {riskBadgeConfig.icon} {riskBadgeConfig.label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">Member ID: {getMemberId()}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{member.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  className={`text-sm ${
                    member.membership_status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : member.membership_status === 'inactive'
                      ? 'bg-slate-100 text-slate-600'
                      : member.membership_status === 'suspended'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {member.membership_status.toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {getMembershipPlan()}
                </p>
                <p className="text-muted-foreground mt-1">
                  <CurrencyGlyph /> {member.monthly_fee || member.membership_fee}/month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="membership">Membership</TabsTrigger>
            <TabsTrigger value="health">Health Info</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-[#2B7A78]" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InfoRow label="Full Name" value={member.name} icon={<User className="h-4 w-4" />} />
                  <InfoRow label="Email Address" value={member.email} icon={<Mail className="h-4 w-4" />} />
                  <InfoRow label="Phone Number" value={member.phone} icon={<Phone className="h-4 w-4" />} />
                  <InfoRow
                    label="Date of Birth"
                    value={member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString('en-GB') : null}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <InfoRow label="Age" value={getAge().toString()} icon={<User className="h-4 w-4" />} />
                  <InfoRow label="Blood Type" value={member.blood_type} icon={<Activity className="h-4 w-4" />} />
                </div>
              </CardContent>
            </Card>

            {/* App Access Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5 text-[#2B7A78]" />
                  <span>App Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {member.user_id ? (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Username: <span className="font-mono">{member.app_username}</span></p>
                      <div className="flex items-center space-x-2">
                        {appAccessEnabled ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700">
                            <ShieldOff className="h-3 w-3 mr-1" /> Disabled
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {appAccessEnabled ? 'Member can log into the app.' : 'Member is blocked from the app.'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAccess}
                      disabled={isTogglingAccess}
                      className={appAccessEnabled
                        ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                        : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                      }
                    >
                      {isTogglingAccess ? 'Updating...' : (appAccessEnabled ? 'Disable Access' : 'Enable Access')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No app account created for this member.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membership Tab */}
          <TabsContent value="membership">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-[#2B7A78]" />
                  <span>Membership Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InfoRow label="Plan Type" value={getMembershipPlan()} />
                  <InfoRow label="Membership Status" value={member.membership_status} />
                  <InfoRow label="Payment Status" value={member.payment_status} />
                  <InfoRow
                    label="Join Date"
                    value={new Date(member.join_date).toLocaleDateString('en-GB')}
                  />
                  <InfoRow
                    label="Expiry Date"
                    value={member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-GB') : null}
                  />
                  <InfoRow label="Monthly Fee" value={`${currencyCode} ${member.monthly_fee || member.membership_fee}`} />
                  <InfoRow label="Total Visits" value={member.total_visits?.toString()} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Info Tab */}
          <TabsContent value="health">
            <Card className="border-2 border-[#2B7A78]/20">
              <CardHeader className="bg-gradient-to-r from-[#2B7A78]/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-[#2B7A78]" />
                    <span>Health & Safety Information</span>
                  </CardTitle>
                  <Badge className={riskBadgeConfig.className}>
                    {riskBadgeConfig.icon} {riskBadgeConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {riskBadgeConfig.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Medical Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-slateText mb-4 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-[#E63946]" />
                    <span>Medical Information</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Medical Conditions</label>
                      <div className={`p-3 rounded-lg border ${
                        emergencyData.medicalConditions !== 'None reported'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className="text-sm text-slateText">
                          {emergencyData.medicalConditions}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        🔒 Visible to: Admin + Trainers
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Allergies</label>
                      <div className={`p-3 rounded-lg border ${
                        emergencyData.allergies !== 'None reported'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className="text-sm text-slateText">
                          {emergencyData.allergies}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        🔒 Visible to: All Staff
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Current Medications</label>
                      <div className={`p-3 rounded-lg border ${
                        emergencyData.medications !== 'None reported'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className="text-sm text-slateText">
                          {emergencyData.medications}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        🔒 Visible to: Admin Only
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Additional Health Notes</label>
                      <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                        <p className="text-sm text-slateText">
                          {member.health_notes || 'No additional notes'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-slateText mb-4 flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-[#2B7A78]" />
                    <span>Emergency Contact</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-lg bg-[#2B7A78]/5 border border-[#2B7A78]/20">
                      <label className="text-sm text-muted-foreground">Contact Name</label>
                      <p className="text-slateText mt-1">
                        {emergencyData.emergencyContact}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#2B7A78]/5 border border-[#2B7A78]/20">
                      <label className="text-sm text-muted-foreground">Contact Phone</label>
                      <p className="text-slateText mt-1">
                        {emergencyData.emergencyPhone}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    🔒 Visible to: All logged users
                  </p>
                </div>

                {/* QR Code Section */}
                <div className="pt-6 border-t">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slateText mb-2 flex items-center space-x-2">
                        <QrCode className="h-5 w-5 text-[#2B7A78]" />
                        <span>Emergency QR Code</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Scan this QR code to instantly access emergency medical information.
                        <br />
                        No login required. Critical for emergencies. 🚑
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border-2 border-[#2B7A78]/20 shadow-sm">
                      <QRCode value={emergencyQRUrl} size={120} />
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQRModal(true)}
                      className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      View Larger QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Card
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-[#2B7A78]" />
                  <span>Activity History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Activity history will be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-[#2B7A78]" />
              <span>Emergency QR Code</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-8 bg-white rounded-lg border">
              <QRCode value={emergencyQRUrl} size={256} />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-red-900 mb-2">
                🚨 Emergency Use Only
              </h4>
              <p className="text-xs text-red-700">
                This QR code provides instant access to critical medical information without login.
                Use in emergencies when immediate medical attention is required.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Member:</strong> {member.name}
              </p>
              <p className="text-sm">
                <strong>Risk Level:</strong>{' '}
                <Badge className={riskBadgeConfig.className}>
                  {riskBadgeConfig.label}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground break-all">
                <strong>URL:</strong> {emergencyQRUrl}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

