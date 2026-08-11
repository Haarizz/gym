import React, { useState } from 'react';
import { CurrencyGlyph } from '../../utils/currency';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { Calendar, CheckCircle, User, Mail, Phone, MapPin, AlertCircle, UserPlus } from 'lucide-react';

interface MemberDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    duration: string;
    benefits: string[];
    discount?: number;
  } | null;
  onSubmitDraft: (draftData: any) => void;
}

export function MemberDraftModal({ open, onOpenChange, selectedPlan, onSubmitDraft }: MemberDraftModalProps) {
    const [formData, setFormData] = useState({
    // Identity & Registration
    memberId: '',
    nationalId: '',
    email: '',
    mobile: '',
    
    // Personal Information
    fullName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    
    // Health Information
    medicalConditions: '',
    emergencyContactName: '',
    emergencyContactNumber: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    else if (!/^\+?\d{10,15}$/.test(formData.mobile.replace(/\s/g, ''))) {
      newErrors.mobile = 'Invalid mobile number';
    }
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedPlan) {
      toast.error('No plan selected');
      return;
    }

    const draftData = {
      ...formData,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      planPrice: selectedPlan.price,
      planDuration: selectedPlan.duration,
      status: 'pending_approval',
      requestedDate: new Date().toISOString(),
      memberId: formData.memberId || `DRAFT-${Date.now()}`
    };

    onSubmitDraft(draftData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      memberId: '',
      nationalId: '',
      email: '',
      mobile: '',
      fullName: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      medicalConditions: '',
      emergencyContactName: '',
      emergencyContactNumber: ''
    });
    
    toast.success('Registration request submitted for approval', {
      description: 'The member will be added once approved by admin',
      icon: <CheckCircle className="h-5 w-5" />
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <UserPlus className="h-6 w-6 text-[#2B7A78]" />
            <span>Member Registration Request</span>
          </DialogTitle>
          <DialogDescription>
            Step 1 of 2 - Draft Registration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Plan Summary */}
          {selectedPlan && (
            <div className="p-4 bg-gradient-to-r from-[#2B7A78] to-[#21615f] text-white rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    {selectedPlan.name}
                    {selectedPlan.discount && selectedPlan.discount > 0 ? (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {selectedPlan.discount}% OFF
                      </Badge>
                    ) : null}
                  </h3>
                  <p className="text-sm opacity-90">{selectedPlan.duration}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold"><CurrencyGlyph /> {selectedPlan.price}</div>
                  <p className="text-xs opacity-90">Total Amount</p>
                </div>
              </div>
              <Separator className="my-3 bg-white/30" />
              <div className="flex flex-wrap gap-2">
                {selectedPlan.benefits.slice(0, 3).map((benefit, index) => (
                  <Badge key={index} variant="outline" className="bg-white/20 text-white border-white/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {benefit}
                  </Badge>
                ))}
                {selectedPlan.benefits.length > 3 && (
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                    +{selectedPlan.benefits.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Identity & Registration */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-[#2B7A78]" />
              <h3 className="font-semibold text-lg text-[#1E293B]">Identity & Registration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Member ID</Label>
                <Input
                  placeholder="Auto-generated (leave blank)"
                  value={formData.memberId}
                  onChange={(e) => handleChange('memberId', e.target.value)}
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for auto-generation</p>
              </div>

              <div>
                <Label>National ID / Emirates ID</Label>
                <Input
                  placeholder="Enter Emirates ID"
                  value={formData.nationalId}
                  onChange={(e) => handleChange('nationalId', e.target.value)}
                  className={errors.nationalId ? 'border-red-500' : ''}
                />
                {errors.nationalId && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.nationalId}
                  </p>
                )}
              </div>

              <div>
                <Label>Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="member@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <Label>Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="+971 50 123 4567"
                    value={formData.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    className={`pl-10 ${errors.mobile ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.mobile && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.mobile}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-[#2B7A78]" />
              <h3 className="font-semibold text-lg text-[#1E293B]">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <Label>Date of Birth *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className={`pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>

              <div>
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                  <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.gender}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Address (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows={2}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Health Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="h-5 w-5 text-[#E63946]" />
              <h3 className="font-semibold text-lg text-[#1E293B]">Health & Emergency Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Known Medical Conditions</Label>
                <Textarea
                  placeholder="List any medical conditions, allergies, or health concerns (e.g., asthma, diabetes, heart condition)"
                  value={formData.medicalConditions}
                  onChange={(e) => handleChange('medicalConditions', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">This information is kept confidential and used for safety purposes</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-[#E63946] mb-3">Emergency Contact Details</p>
                </div>
                
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    placeholder="Full name"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                    className={`bg-white ${errors.emergencyContactName ? 'border-red-500' : ''}`}
                  />
                  {errors.emergencyContactName && (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.emergencyContactName}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Emergency Contact Number</Label>
                  <Input
                    type="tel"
                    placeholder="+971 50 123 4567"
                    value={formData.emergencyContactNumber}
                    onChange={(e) => handleChange('emergencyContactNumber', e.target.value)}
                    className={`bg-white ${errors.emergencyContactNumber ? 'border-red-500' : ''}`}
                  />
                  {errors.emergencyContactNumber && (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.emergencyContactNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#2B7A78] hover:bg-[#21615f] text-white"
              onClick={handleSubmit}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Request for On-board
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            * Required fields must be completed before submission
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

