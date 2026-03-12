import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, AlertTriangle, Phone, Heart, Activity, Clock } from 'lucide-react';
import { Member, membersService } from '../utils/supabase/members-service';
import { calculateHealthRisk, getRiskBadgeConfig, formatEmergencyData } from '../utils/health-risk';

interface EmergencyProfileProps {
  memberId: string;
}

export function EmergencyProfile({ memberId }: EmergencyProfileProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const loadMemberData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In demo mode, use demo data
      const demoMembers = [
        {
          id: 'mem_001',
          name: 'Sarah Johnson',
          date_of_birth: '1990-05-15',
          blood_type: 'A+',
          medical_conditions: 'Mild Asthma, Controlled with inhaler',
          allergies: 'Penicillin, Shellfish',
          current_medications: 'Ventolin inhaler (as needed)',
          emergency_contact_name: 'Mike Johnson (Husband)',
          emergency_contact_phone: '+971-50-123-4568',
        },
        {
          id: 'mem_002',
          name: 'Ahmed Al-Rashid',
          date_of_birth: '1985-08-20',
          blood_type: 'O+',
          medical_conditions: 'Type 2 Diabetes (Controlled)',
          allergies: 'None',
          current_medications: 'Metformin 500mg (twice daily)',
          emergency_contact_name: 'Fatima Al-Rashid (Wife)',
          emergency_contact_phone: '+971-55-234-5679',
        },
        {
          id: 'mem_003',
          name: 'Maria Santos',
          date_of_birth: '1992-03-10',
          blood_type: 'B+',
          medical_conditions: 'None',
          allergies: 'Latex',
          current_medications: 'None',
          emergency_contact_name: 'Carlos Santos (Brother)',
          emergency_contact_phone: '+971-56-345-6790',
        },
      ];

      const demoMember = demoMembers.find(m => m.id === memberId);
      
      if (demoMember) {
        setMember(demoMember as any);
      } else {
        // Try to fetch from backend (would work in production)
        try {
          const memberData = await membersService.getMemberById(memberId);
          setMember(memberData);
        } catch {
          setError('Member not found');
        }
      }
    } catch (err) {
      console.error('Failed to load emergency profile:', err);
      setError('Failed to load emergency information');
    } finally {
      setLoading(false);
    }
  };

  const getAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardContent className="pt-20 pb-20 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#E63946]" />
            <p className="text-lg text-muted-foreground">Loading emergency information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-2 border-red-200">
          <CardContent className="pt-12 pb-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-[#E63946]" />
            <h2 className="text-2xl font-bold text-slateText mb-2">
              Member Not Found
            </h2>
            <p className="text-muted-foreground">
              {error || 'Unable to load emergency information'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const age = getAge(member.date_of_birth);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Emergency Header Alert */}
        <Alert className="bg-[#E63946] border-[#E63946] text-white shadow-lg">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="ml-2">
            <strong className="text-lg">🚨 EMERGENCY MEDICAL INFORMATION 🚨</strong>
            <br />
            <span className="text-sm">
              This is a read-only emergency profile. No login required. Time-critical data accessible for medical personnel.
            </span>
          </AlertDescription>
        </Alert>

        {/* Member Identity Card */}
        <Card className="shadow-2xl border-2 border-[#E63946]/30">
          <CardHeader className="bg-gradient-to-r from-[#E63946] to-[#E63946]/80 text-white pb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 border-4 border-white">
                  <AvatarFallback className="text-2xl bg-white text-[#E63946]">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{member.name}</h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-white/90">Age: {age} years</span>
                    {member.blood_type && (
                      <>
                        <span className="text-white/60">•</span>
                        <span className="text-white/90">Blood Type: {member.blood_type}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Badge className={`${riskBadgeConfig.className} text-base px-4 py-2`}>
                {riskBadgeConfig.icon} {riskBadgeConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Timestamp */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground pb-4 border-b">
              <Clock className="h-4 w-4" />
              <span>Accessed: {new Date().toLocaleString('en-GB', { 
                dateStyle: 'full', 
                timeStyle: 'medium' 
              })}</span>
            </div>

            {/* Critical Medical Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slateText flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-[#E63946]" />
                <span>Critical Medical Information</span>
              </h2>

              {/* Medical Conditions */}
              <div className={`p-4 rounded-lg border-2 ${
                emergencyData.medicalConditions !== 'None reported'
                  ? 'bg-red-50 border-red-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-start space-x-2">
                  <Heart className="h-5 w-5 text-[#E63946] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slateText mb-1">Medical Conditions</h3>
                    <p className="text-slateText">
                      {emergencyData.medicalConditions}
                    </p>
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div className={`p-4 rounded-lg border-2 ${
                emergencyData.allergies !== 'None reported'
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slateText mb-1">Allergies</h3>
                    <p className="text-slateText">
                      {emergencyData.allergies}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Medications */}
              <div className={`p-4 rounded-lg border-2 ${
                emergencyData.medications !== 'None reported'
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-start space-x-2">
                  <Activity className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slateText mb-1">Current Medications</h3>
                    <p className="text-slateText">
                      {emergencyData.medications}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="pt-4 border-t-2">
              <h2 className="text-xl font-bold text-slateText flex items-center space-x-2 mb-4">
                <Phone className="h-6 w-6 text-[#2B7A78]" />
                <span>Emergency Contact</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#2B7A78]/10 border-2 border-[#2B7A78]/30">
                  <label className="text-sm text-muted-foreground block mb-1">Contact Name</label>
                  <p className="text-lg font-semibold text-slateText">
                    {emergencyData.emergencyContact}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[#2B7A78]/10 border-2 border-[#2B7A78]/30">
                  <label className="text-sm text-muted-foreground block mb-1">Contact Phone</label>
                  <p className="text-lg font-semibold text-slateText">
                    <a 
                      href={`tel:${emergencyData.emergencyPhone}`}
                      className="text-[#2B7A78] hover:underline"
                    >
                      {emergencyData.emergencyPhone}
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                This emergency profile is provided by GymBios Health & Safety System
                <br />
                For facility staff: Access full member profile through GymBios dashboard
                <br />
                Last updated: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Safety Notice */}
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-700 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Important Notice for Medical Personnel
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>This information is self-reported by the member</li>
                  <li>Always verify critical information when possible</li>
                  <li>Contact the emergency contact for additional medical history</li>
                  <li>This system is designed to provide quick access in time-critical situations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

