// Service Portfolios → new member request (from "Member On-board" or Choose Plan →
// "Register as New Member"). Staff fill in the walk-in's details and send them to
// Approvals → Applications as a cash application. Nothing is created on the member side
// here — approving the application (after taking payment at reception) creates the
// member with the chosen plan. Same queue as the public share link.
import React, { useEffect, useState } from 'react';
import { CurrencyGlyph } from '../../utils/currency';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PhoneInput } from "./PhoneInput";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { Calendar, CheckCircle, User, Mail, MapPin, AlertCircle, UserPlus, Loader2, Award } from 'lucide-react';
import { servicePortfolioService, apiErrorMessage } from '../../utils/supabase/service-portfolio-service';

export interface DraftPlanOption {
  id: string;
  name: string;
  price: number;
  duration: string;
  benefits: string[];
  /** What the member pays — the offer price when the plan has one running. */
  effectivePrice?: number;
  offerLabel?: string | null;
}

interface MemberDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan already picked (Choose Plan). Without one, the form shows a plan picker. */
  selectedPlan: DraftPlanOption | null;
  /** Plans offered by the picker when no plan was picked beforehand. */
  planOptions?: DraftPlanOption[];
  /** Called after the application is saved on the server. */
  onSubmitted?: (reference: string) => void;
}

const EMPTY = {
  nationalId: '',
  email: '',
  mobile: '',
  fullName: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  medicalConditions: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
};

type FieldKey = keyof typeof EMPTY | 'plan';

const digits = (v: string) => v.replace(/\D/g, '');

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1 flex items-center">
      <AlertCircle className="h-3 w-3 mr-1" />
      {message}
    </p>
  );
}

export function MemberDraftModal({ open, onOpenChange, selectedPlan, planOptions = [], onSubmitted }: MemberDraftModalProps) {
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pickedPlanId, setPickedPlanId] = useState('');

  // Each opening starts from the plan it was opened with (or none, for the picker).
  useEffect(() => {
    if (open) {
      setPickedPlanId('');
      setErrors({});
    }
  }, [open]);

  const showPicker = !selectedPlan;
  const plan = selectedPlan ?? planOptions.find(p => p.id === pickedPlanId) ?? null;

  const handleChange = (field: keyof typeof EMPTY, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!plan) e.plan = 'Select a membership plan';
    if (!formData.fullName.trim()) e.fullName = 'Full name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) e.email = 'Invalid email format';
    if (digits(formData.mobile).length < 7) e.mobile = 'Invalid mobile number';
    if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) e.gender = 'Gender is required';
    const ec = digits(formData.emergencyContactNumber).length;
    if (ec > 0 && ec < 7) e.emergencyContactNumber = 'Invalid contact number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const close = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!validateForm() || !plan) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      // An emergency number with only a country code counts as empty.
      const ecPhone = digits(formData.emergencyContactNumber).length >= 7 ? formData.emergencyContactNumber : undefined;
      const receipt = await servicePortfolioService.createDeskApplication({
        full_name: formData.fullName.trim(),
        phone: formData.mobile,
        email: formData.email.trim(),
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        address: formData.address.trim() || undefined,
        reg_doc_number: formData.nationalId.trim() || undefined,
        medical_conditions: formData.medicalConditions.trim() || undefined,
        emergency_contact_name: formData.emergencyContactName.trim() || undefined,
        emergency_contact_phone: ecPhone,
        plan_id: Number(plan.id),
      });
      toast.success('Registration request sent for approval', {
        description: `Reference ${receipt.reference}. Take payment at reception, then approve it in Approvals → Applications to add the member.`,
        icon: <CheckCircle className="h-5 w-5" />,
      });
      // Lets the sidebar show its pending-approvals dot right away.
      window.dispatchEvent(new Event('approvals_updated'));
      setFormData(EMPTY);
      setErrors({});
      onSubmitted?.(receipt.reference);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't send the request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const hasOffer = !!plan && plan.effectivePrice != null && plan.effectivePrice < plan.price;

  return (
    <Dialog open={open} onOpenChange={close}>
      {/* sm:max-w-* — the base DialogContent caps sm+ at max-w-lg, which squeezed this form. */}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <UserPlus className="h-6 w-6 text-[#2B7A78]" />
            <span>Member Registration Request</span>
          </DialogTitle>
          <DialogDescription>
            Sent to Approvals → Applications. The member is added once the request is approved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan picker (Member On-board opens without a plan) */}
          {showPicker && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Award className="h-5 w-5 text-[#2B7A78]" />
                <h3 className="font-semibold text-lg text-[#1E293B]">Membership Plan</h3>
              </div>
              <Label>Plan *</Label>
              <Select
                value={pickedPlanId}
                onValueChange={(v) => { setPickedPlanId(v); setErrors(prev => ({ ...prev, plan: undefined })); }}
              >
                <SelectTrigger className={errors.plan ? 'border-red-500' : ''}>
                  <SelectValue placeholder={planOptions.length ? 'Select a plan' : 'No plans available'} />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.duration} · {(p.effectivePrice ?? p.price).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.plan} />
              <p className="text-xs text-gray-500 mt-1">Family and couple plans are set up at reception with the whole household.</p>
            </div>
          )}

          {/* Selected Plan Summary */}
          {plan && (
            <div className="p-4 bg-gradient-to-r from-[#2B7A78] to-[#21615f] text-white rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                    {plan.name}
                    {hasOffer ? (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {plan.offerLabel || 'Offer'}
                      </Badge>
                    ) : null}
                  </h3>
                  <p className="text-sm opacity-90">{plan.duration}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold"><CurrencyGlyph /> {(plan.effectivePrice ?? plan.price).toLocaleString()}</div>
                  <p className="text-xs opacity-90">Total Amount</p>
                </div>
              </div>
              <Separator className="my-3 bg-white/30" />
              <div className="flex flex-wrap gap-2">
                {plan.benefits.slice(0, 3).map((benefit, index) => (
                  <Badge key={index} variant="outline" className="bg-white/20 text-white border-white/30 max-w-full whitespace-normal">
                    <CheckCircle className="h-3 w-3 mr-1 shrink-0" />
                    {benefit}
                  </Badge>
                ))}
                {plan.benefits.length > 3 && (
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                    +{plan.benefits.length - 3} more
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
              <div className="md:col-span-2">
                <Label>National ID / Emirates ID</Label>
                <Input
                  placeholder="Enter Emirates ID"
                  value={formData.nationalId}
                  onChange={(e) => handleChange('nationalId', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">The member ID is assigned automatically when the request is approved</p>
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
                <FieldError message={errors.email} />
              </div>

              <div>
                <Label>Mobile Number *</Label>
                <PhoneInput
                  value={formData.mobile}
                  onChange={(v) => handleChange('mobile', v)}
                  invalid={!!errors.mobile}
                />
                <FieldError message={errors.mobile} />
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
                <FieldError message={errors.fullName} />
              </div>

              <div>
                <Label>Date of Birth *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    className={`pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                  />
                </div>
                <FieldError message={errors.dateOfBirth} />
              </div>

              <div>
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                  <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.gender} />
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
                  <p className="text-sm font-semibold text-[#E63946]">Emergency Contact Details</p>
                </div>

                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    placeholder="Full name"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div>
                  <Label>Emergency Contact Number</Label>
                  <PhoneInput
                    value={formData.emergencyContactNumber}
                    onChange={(v) => handleChange('emergencyContactNumber', v)}
                    invalid={!!errors.emergencyContactNumber}
                    inputClassName="bg-white"
                  />
                  <FieldError message={errors.emergencyContactNumber} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => close(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#2B7A78] hover:bg-[#21615f] text-white"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                : <><UserPlus className="h-4 w-4 mr-2" />Request for On-board</>}
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
