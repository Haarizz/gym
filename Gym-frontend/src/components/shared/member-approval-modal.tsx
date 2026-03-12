import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";
import { 
  CheckCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  AlertCircle, 
  Camera, 
  CreditCard,
  Calendar,
  Tag,
  XCircle,
  UserCheck,
  DollarSign,
  Gift
} from 'lucide-react';

interface MemberApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftData: {
    memberId: string;
    nationalId: string;
    email: string;
    mobile: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    medicalConditions: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
    planId: string;
    planName: string;
    planPrice: number;
    planDuration: string;
    status: string;
    requestedDate: string;
  } | null;
  onApprove: (approvalData: any) => void;
  onReject: (draftId: string) => void;
}

export function MemberApprovalModal({ 
  open, 
  onOpenChange, 
  draftData, 
  onApprove, 
  onReject 
}: MemberApprovalModalProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [paymentData, setPaymentData] = useState({
    paymentMode: '',
    amount: draftData?.planPrice || 0,
    discountCode: '',
    discountAmount: 0,
    finalAmount: draftData?.planPrice || 0,
    transactionId: '',
    notes: ''
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiscountApply = () => {
    const code = paymentData.discountCode.toUpperCase();
    let discount = 0;

    // Simple discount logic - can be enhanced with backend validation
    if (code === 'WELCOME10') {
      discount = paymentData.amount * 0.1; // 10% off
      toast.success('Discount code applied: 10% off');
    } else if (code === 'MEMBER20') {
      discount = paymentData.amount * 0.2; // 20% off
      toast.success('Discount code applied: 20% off');
    } else if (code === 'SPECIAL50') {
      discount = 50; // Flat AED 50 off
      toast.success('Discount code applied: AED 50 off');
    } else if (code) {
      toast.error('Invalid discount code');
      return;
    }

    setPaymentData(prev => ({
      ...prev,
      discountAmount: discount,
      finalAmount: prev.amount - discount
    }));
  };

  const handleApprove = () => {
    if (!paymentData.paymentMode) {
      toast.error('Please select a payment mode');
      return;
    }

    if (!draftData) {
      toast.error('No draft data available');
      return;
    }

    const approvalData = {
      ...draftData,
      photo: photoPreview,
      photoFile: photoFile,
      payment: paymentData,
      approvedDate: new Date().toISOString(),
      status: 'active',
      membershipStartDate: new Date().toISOString(),
      membershipEndDate: calculateEndDate(draftData.planDuration),
      invoiceNumber: `INV-${Date.now()}`,
      receiptNumber: `RCP-${Date.now()}`
    };

    onApprove(approvalData);
    onOpenChange(false);
    
    toast.success('Member successfully onboarded!', {
      description: `${draftData.fullName} has been added to the system`,
      icon: <CheckCircle className="h-5 w-5" />
    });
  };

  const handleReject = () => {
    if (!draftData) return;
    
    onReject(draftData.memberId);
    onOpenChange(false);
    
    toast.error('Registration request rejected', {
      description: 'The draft has been deleted',
      icon: <XCircle className="h-5 w-5" />
    });
  };

  const calculateEndDate = (duration: string) => {
    const start = new Date();
    const months = parseInt(duration.match(/\d+/)?.[0] || '1');
    start.setMonth(start.getMonth() + months);
    return start.toISOString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!draftData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <UserCheck className="h-6 w-6 text-[#2B7A78]" />
            <span>Finalize Member Registration</span>
          </DialogTitle>
          <DialogDescription>
            Step 2 of 2 - Review & Approve
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Member Info Header */}
          <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
            <Avatar className="h-16 w-16 border-4 border-white">
              <AvatarImage src={photoPreview} />
              <AvatarFallback className="bg-[#2B7A78] text-white text-xl">
                {getInitials(draftData.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-[#1E293B]">{draftData.fullName}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {draftData.email}
                </div>
                <div className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {draftData.mobile}
                </div>
              </div>
              <Badge className="mt-2 bg-amber-100 text-amber-800 border-amber-200" variant="outline">
                Pending Approval
              </Badge>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Camera className="h-5 w-5 text-[#2B7A78]" />
              <h3 className="font-semibold text-lg text-[#1E293B]">Member Photo</h3>
            </div>
            
            <div className="flex items-center space-x-4">
              <Avatar className="h-24 w-24 border-4 border-[#2B7A78]">
                <AvatarImage src={photoPreview} />
                <AvatarFallback className="bg-gray-100 text-gray-400 text-2xl">
                  <Camera className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#2B7A78] hover:bg-gray-50 transition-colors">
                    <Camera className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {photoPreview ? 'Change Photo' : 'Upload or Capture Photo'}
                    </span>
                  </div>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </Label>
                <p className="text-xs text-gray-500 mt-2">
                  Recommended: Square image, min 400x400px
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Read-only Member Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-[#1E293B] flex items-center">
                <User className="h-5 w-5 mr-2 text-[#2B7A78]" />
                Personal Information
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <Label className="text-gray-600">Member ID</Label>
                  <p className="font-medium">{draftData.memberId}</p>
                </div>
                <div>
                  <Label className="text-gray-600">National ID</Label>
                  <p className="font-medium">{draftData.nationalId}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Date of Birth</Label>
                  <p className="font-medium">{new Date(draftData.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Gender</Label>
                  <p className="font-medium capitalize">{draftData.gender}</p>
                </div>
                {draftData.address && (
                  <div>
                    <Label className="text-gray-600">Address</Label>
                    <p className="font-medium">{draftData.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Health & Emergency */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-[#1E293B] flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-[#E63946]" />
                Health & Emergency
              </h3>
              
              <div className="space-y-3 text-sm">
                {draftData.medicalConditions && (
                  <div>
                    <Label className="text-gray-600">Medical Conditions</Label>
                    <p className="font-medium">{draftData.medicalConditions}</p>
                  </div>
                )}
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <Label className="text-gray-600">Emergency Contact</Label>
                  <p className="font-medium">{draftData.emergencyContactName}</p>
                  <p className="text-gray-600 mt-1">{draftData.emergencyContactNumber}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Selected Plan */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Tag className="h-5 w-5 text-[#2B7A78]" />
              <h3 className="font-semibold text-lg text-[#1E293B]">Selected Membership Plan</h3>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-[#2B7A78] to-[#21615f] text-white rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">{draftData.planName}</h4>
                  <p className="text-sm opacity-90">{draftData.planDuration}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">AED {draftData.planPrice}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard className="h-5 w-5 text-[#2B7A78]" />
              <h3 className="font-semibold text-lg text-[#1E293B]">Payment Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Payment Mode *</Label>
                  <Select 
                    value={paymentData.paymentMode} 
                    onValueChange={(value) => setPaymentData(prev => ({ ...prev, paymentMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="online">Online Transfer</SelectItem>
                      <SelectItem value="wallet">Digital Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Transaction ID (Optional)</Label>
                  <Input
                    placeholder="Enter transaction reference"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                  />
                </div>
              </div>

              {/* Discount Section */}
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Gift className="h-5 w-5 text-purple-600" />
                  <Label className="text-purple-900">Apply Discount or Promo Code</Label>
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter promo code"
                    value={paymentData.discountCode}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, discountCode: e.target.value }))}
                    className="bg-white"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleDiscountApply}
                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    Apply
                  </Button>
                </div>
                
                {paymentData.discountAmount > 0 && (
                  <p className="text-sm text-green-600 mt-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Discount applied: AED {paymentData.discountAmount.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Amount Summary */}
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plan Amount:</span>
                    <span className="font-medium">AED {paymentData.amount.toFixed(2)}</span>
                  </div>
                  
                  {paymentData.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">- AED {paymentData.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-[#1E293B]">Final Amount:</span>
                    <span className="text-[#2B7A78]">
                      <DollarSign className="inline h-5 w-5 mb-1" />
                      AED {paymentData.finalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Payment Notes (Optional)</Label>
                <Input
                  placeholder="Add any payment notes or remarks"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleReject}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject / Delete Draft
            </Button>
            <Button
              className="flex-1 bg-[#2B7A78] hover:bg-[#21615f] text-white"
              onClick={handleApprove}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Add Member
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

