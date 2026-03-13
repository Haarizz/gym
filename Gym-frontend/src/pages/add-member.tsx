import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  FaPlus,
  FaUser,
  FaUsers,
  FaEnvelope,
  FaPhone,
  FaLocationDot,
  FaCamera,
  FaUpload,
  FaMagnifyingGlassPlus,
  FaUpDownLeftRight,
  FaCheck,
  FaXmark,
  FaArrowLeft,
  FaArrowRight,
  FaArrowsLeftRight,
  FaRotateLeft,
  FaVideo,
  FaCreditCard,
  FaDumbbell,
  FaHeart,
  FaGraduationCap,
  FaMoneyBillWave,
  FaBuilding,
  FaFileLines,
  FaWallet,
  FaCalculator,
  FaDollarSign,
  FaEarthAmericas,
  FaCalendarDays,
  FaHashtag,
  FaFileCircleCheck,
  FaArrowsRotate,
  FaHeartPulse,
  FaCircleExclamation,
  FaPills,
  FaDroplet,
  FaRuler,
  FaWeightScale,
  FaPhoneVolume,
  FaShield
} from 'react-icons/fa6';

// ISO Standard Country List - Comprehensive list of all countries
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].sort();

interface AddMemberProps {
  onNavigate?: (section: string) => void;
}

export function AddMember({ onNavigate }: AddMemberProps = {}) {
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState([1]);
  const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  
  // Payment popup state management
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [splitPayment, setSplitPayment] = useState({
    cash: 0,
    card: 0
  });
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  
  // New payment method state
  const [paymentData, setPaymentData] = useState({
    paidAmount: '',
    receivedAmount: '',
    paymentDueDate: '',
    remainingAmount: 0
  });
  const [paymentErrors, setPaymentErrors] = useState({
    paidAmount: '',
    receivedAmount: '',
    paymentDueDate: ''
  });
  
  // Discount management state
  const [selectedDiscount, setSelectedDiscount] = useState<string>('');
  const [discountList, setDiscountList] = useState<any[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Generate unique Member ID
  const generateMemberId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MBR-${timestamp}${randomNum}`;
  };
  
  // Family members management
  const addFamilyMember = () => {
    const newMember = {
      id: `family-${Date.now()}`,
      name: ''
    };
    setFamilyMembers([...familyMembers, newMember]);
  };
  
  const removeFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter(member => member.id !== id));
  };
  
  const updateFamilyMemberName = (id: string, name: string) => {
    setFamilyMembers(familyMembers.map(member => 
      member.id === id ? { ...member, name } : member
    ));
  };
  
  // Membership plans with types and programs
  const membershipPlans = [
    {
      id: 'premium-annual',
      name: 'Premium Annual',
      price: 1200,
      originalPrice: 1440,
      savings: 240,
      duration: '12 Months',
      description: 'Complete fitness experience',
      membershipTypes: ['individual', 'family', 'corporate'],
      programs: ['all', 'strength', 'cardio', 'group', 'premium'],
      features: ['Personal Training', 'All Equipment', 'Group Classes', 'Nutrition Plan', '2 Guest Passes', '+20 More']
    },
    {
      id: 'standard-monthly',
      name: 'Standard Monthly',
      price: 299,
      duration: '1 Month',
      description: 'Essential fitness access',
      membershipTypes: ['individual', 'corporate'],
      programs: ['all', 'strength', 'cardio', 'group'],
      features: ['All Equipment', 'Group Classes', 'Locker Access', '1 Guest Pass', '+10 More']
    },
    {
      id: 'family-package',
      name: 'Family Package',
      price: 899,
      duration: '1 Month',
      description: 'Perfect for the whole family',
      membershipTypes: ['family'],
      programs: ['all', 'group'],
      features: ['4 Family Members', 'All Equipment', 'Group Classes', 'Kids Zone Access', 'Family Locker']
    },
    {
      id: 'corporate-wellness',
      name: 'Corporate Wellness',
      price: 599,
      duration: '1 Month',
      description: 'Customized corporate plans',
      membershipTypes: ['corporate'],
      programs: ['all', 'strength', 'cardio', 'premium'],
      features: ['Group Discounts', 'Flexible Hours', 'Wellness Programs', 'Health Assessments', 'Corporate Events']
    }
  ];
  
  // Filter membership plans based on selected filters
  const getFilteredMembershipPlans = () => {
    return membershipPlans.filter(plan => {
      // Filter by membership type
      const membershipTypeMatch = membershipTypeFilter === 'all' || 
        plan.membershipTypes.includes(membershipTypeFilter);
      
      // Filter by program
      const programMatch = programFilter === 'all' || 
        plan.programs.includes(programFilter);
      
      return membershipTypeMatch && programMatch;
    });
  };

  // Initialize Member ID on component mount
  React.useEffect(() => {
    if (!formData.memberId) {
      setFormData(prev => ({
        ...prev,
        memberId: generateMemberId()
      }));
    }
  }, []);

  // Check camera availability on component mount
  React.useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraAvailable(false);
          setCameraError('Camera not supported in this browser');
          return;
        }

        // Try to enumerate devices to check if camera exists
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          setCameraAvailable(false);
          setCameraError('No camera found on this device');
        } else {
          setCameraAvailable(true);
          setCameraError('');
        }
      } catch (error) {
        setCameraAvailable(false);
        setCameraError('Unable to check camera availability');
      }
    };

    checkCameraAvailability();
  }, []);
  
  // Load discount promotions
  React.useEffect(() => {
    // Mock discount promotions - Replace with actual API call when backend is ready
    const mockDiscounts = [
      {
        id: 'disc-1',
        name: 'New Member Discount',
        type: 'discount',
        discountType: 'percentage',
        discountValue: 10,
        status: 'active'
      },
      {
        id: 'disc-2',
        name: 'Early Bird Special',
        type: 'discount',
        discountType: 'fixed',
        discountValue: 50,
        status: 'active'
      },
      {
        id: 'disc-3',
        name: 'Student Discount',
        type: 'discount',
        discountType: 'percentage',
        discountValue: 15,
        status: 'active'
      },
      {
        id: 'disc-4',
        name: 'Referral Discount',
        type: 'discount',
        discountType: 'fixed',
        discountValue: 100,
        status: 'active'
      }
    ];
    
    // Filter only discount-type promotions with active status
    const discounts = mockDiscounts.filter(p => p.type === 'discount' && p.status === 'active');
    setDiscountList(discounts);
    
    // TODO: Replace with actual API call
    // fetch('/api/promotions?type=discount&status=active')
    //   .then(res => res.json())
    //   .then(data => setDiscountList(data))
    //   .catch(err => console.error('Error loading discounts:', err));
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    memberId: '',
    membershipType: '', // Individual, Family, Corporate
    regDocNumber: '',
    regDocDate: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    nationality: '',
    gender: '',
    genderOther: '',
    joiningDate: '',
    startDate: '',
    membershipPlan: '',
    emergencyContact: '',
    profilePhoto: null as string | null,
    // Health Information Fields
    medicalConditions: '',
    allergies: '',
    currentMedications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodType: '',
    height: '',
    weight: '',
    chronicIllnesses: ''
  });
  
  // Family members state
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  
  // Membership plan filters
  const [programFilter, setProgramFilter] = useState('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');

  // Enhanced camera functionality with better error handling
  const startCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported in this browser. Please use the photo upload option instead.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraDialogOpen(true);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = '';
      let instruction = '';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera access was denied.';
          instruction = 'Please allow camera access in your browser settings and try again. You can also use the "Upload Photo" option instead.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found on this device.';
          instruction = 'Please use the "Upload Photo" option to add a member photo.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is already in use by another application.';
          instruction = 'Please close other applications using the camera and try again, or use the "Upload Photo" option.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera does not support the required settings.';
          instruction = 'Please try again or use the "Upload Photo" option.';
          break;
        case 'SecurityError':
          errorMessage = 'Camera access is blocked due to security restrictions.';
          instruction = 'This usually happens on non-HTTPS sites. Please use the "Upload Photo" option instead.';
          break;
        default:
          errorMessage = 'Unable to access camera.';
          instruction = 'Please check your camera permissions and try again, or use the "Upload Photo" option.';
      }
      
      // Show toast notification for better user experience
      toast.error(errorMessage, {
        description: instruction,
        duration: 8000,
        action: {
          label: "Upload Photo",
          onClick: () => fileInputRef.current?.click()
        }
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraDialogOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedPhoto(imageData);
        setPhotoZoom([1]);
        setPhotoPosition({ x: 0, y: 0 });
        
        stopCamera();
        setPhotoDialogOpen(true);
      }
    }
  };

  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedPhoto(result);
        setPhotoZoom([1]);
        setPhotoPosition({ x: 0, y: 0 });
        setPhotoDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePhotoSave = useCallback(() => {
    setFormData({ ...formData, profilePhoto: selectedPhoto });
    setPhotoDialogOpen(false);
  }, [formData, selectedPhoto]);

  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - photoPosition.x,
      y: e.clientY - photoPosition.y
    });
  };

  const handlePhotoMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPhotoPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handlePhotoMouseUp = () => {
    setIsDragging(false);
  };

  const movePhoto = useCallback((direction: 'left' | 'right') => {
    const moveAmount = 15;
    setPhotoPosition(prev => ({
      ...prev,
      x: direction === 'left' ? prev.x - moveAmount : prev.x + moveAmount
    }));
  }, []);

  const resetPhotoPosition = useCallback(() => {
    setPhotoPosition({ x: 0, y: 0 });
    setPhotoZoom([1]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.memberId || !formData.firstName || !formData.lastName || !formData.membershipPlan) {
      toast.error('Please fill in all required fields', {
        description: 'Member ID, first name, last name, and membership plan are required.',
        duration: 4000
      });
      return;
    }
    
    // Open payment selection popup
    setPaymentDialogOpen(true);
  };

  // Get membership plan details and pricing
  const getMembershipDetails = () => {
    switch (formData.membershipPlan) {
      case 'premium-annual':
        return { name: 'Premium Annual', price: 1200, originalPrice: 1440, savings: 240 };
      case 'standard-monthly':
        return { name: 'Standard Monthly', price: 299, originalPrice: null, savings: null };
      case 'basic-monthly':
        return { name: 'Basic Monthly', price: 149, originalPrice: null, savings: null };
      case 'student-special':
        return { name: 'Student Special', price: 99, originalPrice: 149, savings: 50 };
      default:
        return { name: 'Unknown Plan', price: 0, originalPrice: null, savings: null };
    }
  };
  
  // Get final price with discount applied
  const getFinalPrice = () => {
    const basePrice = getMembershipDetails().price;
    return Math.max(0, basePrice - discountAmount);
  };
  
  // Handle discount selection and calculation
  const handleDiscountChange = (discountId: string) => {
    // Handle "no-discount" selection
    if (discountId === 'no-discount' || !discountId) {
      setSelectedDiscount('');
      setDiscountAmount(0);
      return;
    }
    
    setSelectedDiscount(discountId);
    
    const selected = discountList.find(d => d.id === discountId);
    if (!selected) {
      setDiscountAmount(0);
      return;
    }
    
    const basePrice = getMembershipDetails().price;
    let calculatedDiscount = 0;
    
    if (selected.discountType === 'percentage') {
      calculatedDiscount = (basePrice * selected.discountValue) / 100;
    } else if (selected.discountType === 'fixed') {
      calculatedDiscount = selected.discountValue;
    }
    
    // Ensure discount doesn't exceed the base price
    setDiscountAmount(Math.min(calculatedDiscount, basePrice));
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    
    // Reset payment data and errors when method changes
    setPaymentData({
      paidAmount: '',
      receivedAmount: '',
      paymentDueDate: '',
      remainingAmount: 0
    });
    setPaymentErrors({
      paidAmount: '',
      receivedAmount: '',
      paymentDueDate: ''
    });
    
    if (method === 'multi-pay') {
      setShowSplitPayment(true);
      const totalAmount = getFinalPrice(); // Use discounted price
      setSplitPayment({
        cash: Math.floor(totalAmount / 2),
        card: Math.ceil(totalAmount / 2)
      });
    } else {
      setShowSplitPayment(false);
      setSplitPayment({ cash: 0, card: 0 });
    }
  };

  // Handle split payment validation
  const validateSplitPayment = () => {
    const total = splitPayment.cash + splitPayment.card;
    const expectedTotal = getFinalPrice(); // Use discounted price
    return Math.abs(total - expectedTotal) < 0.01; // Allow for small floating point differences
  };

  // Validate cash payment
  const validateCashPayment = () => {
    const paidAmount = parseFloat(paymentData.paidAmount);
    const invoiceAmount = getFinalPrice(); // Use discounted price
    
    if (isNaN(paidAmount) || paidAmount <= 0) {
      setPaymentErrors(prev => ({
        ...prev,
        paidAmount: 'Please enter a valid paid amount'
      }));
      return false;
    }
    
    if (paidAmount < invoiceAmount) {
      setPaymentErrors(prev => ({
        ...prev,
        paidAmount: 'Received amount cannot be less than invoice amount.'
      }));
      return false;
    }
    
    setPaymentErrors(prev => ({ ...prev, paidAmount: '' }));
    return true;
  };

  // Validate credit payment
  const validateCreditPayment = () => {
    const receivedAmount = parseFloat(paymentData.receivedAmount || '0');
    const invoiceAmount = getFinalPrice(); // Use discounted price
    let isValid = true;
    
    if (paymentData.receivedAmount && (isNaN(receivedAmount) || receivedAmount < 0)) {
      setPaymentErrors(prev => ({
        ...prev,
        receivedAmount: 'Please enter a valid received amount'
      }));
      isValid = false;
    } else if (receivedAmount > invoiceAmount) {
      setPaymentErrors(prev => ({
        ...prev,
        receivedAmount: 'Received amount cannot exceed invoice amount'
      }));
      isValid = false;
    } else {
      setPaymentErrors(prev => ({ ...prev, receivedAmount: '' }));
    }
    
    // Calculate remaining amount
    const remainingAmount = invoiceAmount - receivedAmount;
    setPaymentData(prev => ({ ...prev, remainingAmount }));
    
    // Validate due date if there's remaining amount
    if (remainingAmount > 0 && !paymentData.paymentDueDate) {
      setPaymentErrors(prev => ({
        ...prev,
        paymentDueDate: 'Payment due date is required when there is a remaining balance'
      }));
      isValid = false;
    } else {
      setPaymentErrors(prev => ({ ...prev, paymentDueDate: '' }));
    }
    
    return isValid;
  };

  // Handle payment input changes
  const handlePaymentDataChange = (field: string, value: string) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation and calculation
    if (selectedPaymentMethod === 'cash' && field === 'paidAmount') {
      const paidAmount = parseFloat(value);
      const invoiceAmount = getFinalPrice(); // Use discounted price
      
      if (!isNaN(paidAmount) && paidAmount >= invoiceAmount) {
        setPaymentErrors(prev => ({ ...prev, paidAmount: '' }));
      }
    } else if (selectedPaymentMethod === 'credit' && field === 'receivedAmount') {
      const receivedAmount = parseFloat(value || '0');
      const invoiceAmount = getFinalPrice(); // Use discounted price
      const remainingAmount = invoiceAmount - receivedAmount;
      
      setPaymentData(prev => ({ ...prev, remainingAmount }));
      
      if (!isNaN(receivedAmount) && receivedAmount <= invoiceAmount) {
        setPaymentErrors(prev => ({ ...prev, receivedAmount: '' }));
      }
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirm = () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Validate based on payment method
    if (selectedPaymentMethod === 'cash') {
      if (!validateCashPayment()) {
        return;
      }
    } else if (selectedPaymentMethod === 'credit') {
      if (!validateCreditPayment()) {
        return;
      }
    } else if (selectedPaymentMethod === 'multi-pay' && !validateSplitPayment()) {
      toast.error('Split payment amounts must equal the total membership fee');
      return;
    }

    // Process payment and create member
    const membershipDetails = getMembershipDetails();
    const finalPrice = getFinalPrice();
    const selectedDiscountInfo = selectedDiscount ? discountList.find(d => d.id === selectedDiscount) : null;
    
    const finalPaymentData = {
      method: selectedPaymentMethod,
      invoiceAmount: membershipDetails.price,
      discountApplied: selectedDiscountInfo ? {
        id: selectedDiscount,
        name: selectedDiscountInfo.name,
        type: selectedDiscountInfo.discountType,
        value: selectedDiscountInfo.discountValue,
        amount: discountAmount
      } : null,
      finalAmount: finalPrice,
      ...(selectedPaymentMethod === 'cash' && {
        paidAmount: parseFloat(paymentData.paidAmount),
        payBackAmount: Math.max(0, parseFloat(paymentData.paidAmount) - finalPrice),
        status: 'Fully Paid',
        outstandingBalance: 0
      }),
      ...(selectedPaymentMethod === 'credit' && {
        receivedAmount: parseFloat(paymentData.receivedAmount || '0'),
        remainingAmount: paymentData.remainingAmount,
        paymentDueDate: paymentData.paymentDueDate,
        status: paymentData.remainingAmount > 0 ? 'Partially Paid' : 'Fully Paid',
        outstandingBalance: paymentData.remainingAmount
      }),
      ...(selectedPaymentMethod === 'multi-pay' && { 
        splitPayment,
        status: 'Fully Paid',
        outstandingBalance: 0
      }),
      ...(selectedPaymentMethod === 'card' && {
        amount: finalPrice,
        status: 'Fully Paid',
        outstandingBalance: 0
      }),
      ...(selectedPaymentMethod === 'bank-transfer' && {
        amount: finalPrice,
        status: 'Fully Paid',
        outstandingBalance: 0
      })
    };

    console.log('New member data:', formData);
    console.log('Payment data:', finalPaymentData);
    
    // Show success toast with payment info
    let paymentDescription = '';
    const discountInfo = discountAmount > 0 ? ` (Discount: -AED ${discountAmount.toFixed(2)})` : '';
    
    if (selectedPaymentMethod === 'cash') {
      const paidAmount = parseFloat(paymentData.paidAmount);
      const payBackAmount = Math.max(0, paidAmount - finalPrice);
      
      if (payBackAmount > 0) {
        paymentDescription = `Payment: AED ${paidAmount.toFixed(2)} (Cash - Fully Paid, Return: AED ${payBackAmount.toFixed(2)})${discountInfo}`;
      } else {
        paymentDescription = `Payment: AED ${paidAmount.toFixed(2)} (Cash - Fully Paid)${discountInfo}`;
      }
    } else if (selectedPaymentMethod === 'credit') {
      const received = parseFloat(paymentData.receivedAmount || '0');
      const remaining = paymentData.remainingAmount;
      if (remaining > 0) {
        paymentDescription = `Payment: AED ${received.toFixed(2)} received, AED ${remaining.toFixed(2)} due by ${paymentData.paymentDueDate}${discountInfo}`;
      } else {
        paymentDescription = `Payment: Full credit (AED ${finalPrice.toFixed(2)} due by ${paymentData.paymentDueDate})${discountInfo}`;
      }
    } else if (selectedPaymentMethod === 'multi-pay') {
      paymentDescription = `Payment: Split payment (Cash: AED ${splitPayment.cash}, Card: AED ${splitPayment.card})${discountInfo}`;
    } else {
      paymentDescription = `Payment: AED ${finalPrice.toFixed(2)} (${selectedPaymentMethod.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())})`;
    }
    
    toast.success('Member created successfully!', {
      description: `${formData.firstName} ${formData.lastName} has been added. ${paymentDescription}`,
      duration: 6000
    });
    
    // Close payment dialog
    setPaymentDialogOpen(false);
    
    // Navigate back to members list
    setTimeout(() => {
      onNavigate?.('members');
    }, 1000);
  };

  // Handle payment dialog close
  const handlePaymentCancel = () => {
    setPaymentDialogOpen(false);
    setSelectedPaymentMethod('');
    setShowSplitPayment(false);
    setSplitPayment({ cash: 0, card: 0 });
    setPaymentData({
      paidAmount: '',
      receivedAmount: '',
      paymentDueDate: '',
      remainingAmount: 0
    });
    setPaymentErrors({
      paidAmount: '',
      receivedAmount: '',
      paymentDueDate: ''
    });
    setSelectedDiscount('');
    setDiscountAmount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Page Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('members')} className="gap-2 shrink-0">
            <FaArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground">New Member Registration</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Fill in the details to register a new gym member</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Top Section - Member Photo */}
            <Card className="border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-full bg-white shadow-md border-4 border-white flex items-center justify-center overflow-hidden">
                      {formData.profilePhoto ? (
                        <img src={formData.profilePhoto} alt="Member" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <FaUser size={36} className="text-gray-300 mx-auto mb-0.5" />
                          <p className="text-xs text-gray-400">No photo</p>
                        </div>
                      )}
                    </div>
                    {formData.profilePhoto && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5">
                        <FaCheck size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  {/* Info + Buttons */}
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 mb-0.5">Member Photo</h2>
                    <p className="text-sm text-gray-500 mb-3">Add a profile photo for easy member identification</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <div className="relative">
                        <Button
                          type="button"
                          size="sm"
                          onClick={startCamera}
                          disabled={cameraAvailable === false}
                          className={`gap-2 ${cameraAvailable === false ? 'bg-gray-300 cursor-not-allowed opacity-60 text-gray-600' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          <FaCamera size={14} />
                          {cameraAvailable === null ? 'Checking...' : cameraAvailable === false ? 'Unavailable' : 'Capture Photo'}
                        </Button>
                        {cameraAvailable === false && cameraError && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-1 bg-red-100 text-red-700 text-xs rounded-lg whitespace-nowrap z-10">
                            {cameraError}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <FaUpload size={14} />
                        Upload Photo
                      </Button>
                    </div>
                    {cameraAvailable === false && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-2 justify-center">
                        <FaUpload size={12} /> Use Upload Photo instead
                      </p>
                    )}
                    {formData.profilePhoto && (
                      <Badge className="bg-green-100 text-green-800 mt-2 w-fit gap-1 mx-auto">
                        <FaCheck size={12} /> Photo Added
                      </Badge>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </CardContent>
            </Card>

            {/* Membership Type Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg shrink-0">
                    <FaUsers className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Membership Type</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Select the type of membership for this registration</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'individual', label: 'Individual', sub: 'Single person', icon: <FaUser className="h-5 w-5" />, onClick: () => { setFormData({...formData, membershipType: 'individual'}); setFamilyMembers([]); } },
                  { value: 'family', label: 'Family', sub: 'Multiple members', icon: <FaHeart className="h-5 w-5" />, onClick: () => setFormData({...formData, membershipType: 'family'}) },
                  { value: 'corporate', label: 'Corporate', sub: 'Company-sponsored', icon: <FaBuilding className="h-5 w-5" />, onClick: () => { setFormData({...formData, membershipType: 'corporate'}); setFamilyMembers([]); } },
                ].map((opt) => (
                  <div
                    key={opt.value}
                    className={`relative p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.membershipType === opt.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                    }`}
                    onClick={opt.onClick}
                  >
                    {formData.membershipType === opt.value && (
                      <div className="absolute top-2 right-2"><FaCheck className="h-4 w-4 text-primary" /></div>
                    )}
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.membershipType === opt.value ? 'bg-primary' : 'bg-gray-100'}`}>
                        <span className={formData.membershipType === opt.value ? 'text-white' : 'text-gray-500'}>{opt.icon}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${formData.membershipType === opt.value ? 'text-primary' : 'text-gray-800'}`}>{opt.label}</p>
                        <p className="text-xs text-gray-400 hidden sm:block">{opt.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {formData.membershipType && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
                    <FaCheck size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {formData.membershipType.charAt(0).toUpperCase() + formData.membershipType.slice(1)} Membership selected
                    </p>
                    {formData.membershipType === 'family' && (
                      <p className="text-xs text-primary/70 mt-0.5">Add family members in Personal Info below</p>
                    )}
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Identity & Registration Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shrink-0">
                    <FaHashtag className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Identity & Registration</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Member ID and document details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
              
              {/* Member ID, Reg Doc Number, Reg Doc Date - 3 Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="memberId">
                    <div className="flex items-center space-x-2">
                      <FaHashtag className="h-4 w-4" />
                      <span>Member ID</span>
                    </div>
                  </Label>
                  <div className="relative">
                    <Input
                      id="memberId"
                      value={formData.memberId}
                      onChange={(e) => setFormData({...formData, memberId: e.target.value})}
                      placeholder="MBR-000123"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({...formData, memberId: generateMemberId()})}
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      title="Generate new Member ID"
                    >
                      <FaArrowsRotate className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-generated, editable if needed
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="regDocNumber">
                    <div className="flex items-center space-x-2">
                      <FaFileCircleCheck className="h-4 w-4" />
                      <span>Reg. Doc. Number</span>
                    </div>
                  </Label>
                  <Input
                    id="regDocNumber"
                    value={formData.regDocNumber}
                    onChange={(e) => setFormData({...formData, regDocNumber: e.target.value})}
                    placeholder="Enter document number"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Official ID/registration document
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="regDocDate">
                    <div className="flex items-center space-x-2">
                      <FaCalendarDays className="h-4 w-4" />
                      <span>Reg. Doc. Date</span>
                    </div>
                  </Label>
                  <Input
                    id="regDocDate"
                    type="date"
                    value={formData.regDocDate}
                    onChange={(e) => setFormData({...formData, regDocDate: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Document issue/validation date
                  </p>
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Personal Information Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-lg shrink-0">
                    <FaUser className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Member personal and contact details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="mb-1.5 block">First Name <span className="text-red-500">*</span></Label>
                <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" required />
              </div>
              <div>
                <Label htmlFor="lastName" className="mb-1.5 block">Last Name <span className="text-red-500">*</span></Label>
                <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block">Email <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john.doe@email.com" required />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1.5 block">Phone <span className="text-red-500">*</span></Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+971 XX XXX XXXX" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender" className="mb-1.5 block">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v, genderOther: v !== 'other' ? '' : formData.genderOther})}>
                  <SelectTrigger id="gender"><SelectValue placeholder="Select Gender (Optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-Binary</SelectItem>
                    <SelectItem value="transgender">Transgender</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.gender === 'other' && (
                  <Input className="mt-2" value={formData.genderOther} onChange={(e) => setFormData({...formData, genderOther: e.target.value})} placeholder="Please specify" />
                )}
              </div>
              <div>
                <Label htmlFor="nationality" className="mb-1.5 block">Nationality</Label>
                <Select value={formData.nationality} onValueChange={(v) => setFormData({...formData, nationality: v})}>
                  <SelectTrigger id="nationality"><SelectValue placeholder="Select Country" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="address" className="mb-1.5 block">Address</Label>
              <Textarea id="address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="123 Main St, City" rows={2} />
            </div>
            
            {/* Family Members Section */}
            {formData.membershipType === 'family' && (
              <div className="space-y-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-gradient-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaHeart className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-primary">Family Members</h3>
                      <p className="text-xs text-gray-600">Add additional family members to this membership</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFamilyMember}
                    className="btn-primary"
                  >
                    <FaPlus className="h-4 w-4 mr-2" />
                    Add Family Member
                  </Button>
                </div>
                
                {familyMembers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <FaUsers className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No family members added yet</p>
                    <p className="text-xs">Click "Add Family Member" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familyMembers.map((member, index) => (
                      <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-primary/20">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-light rounded-full flex-shrink-0">
                          <FaUser className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`family-member-${member.id}`} className="text-sm text-gray-600 mb-1 block">
                            Family Member {index + 1}
                          </Label>
                          <Input
                            id={`family-member-${member.id}`}
                            value={member.name}
                            onChange={(e) => updateFamilyMemberName(member.id, e.target.value)}
                            placeholder="Enter full name"
                            className="border-primary/20"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFamilyMember(member.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <FaXmark className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FaUsers className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Total Family Members: {familyMembers.length + 1} (including primary member)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFamilyMember}
                        className="border-primary/30 text-primary"
                      >
                        <FaPlus className="h-3 w-3 mr-1" />
                        Add More
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="joiningDate" className="mb-1.5 flex items-center gap-1.5"><FaCalendarDays className="h-3.5 w-3.5" />Joining Date</Label>
                <Input id="joiningDate" type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">Date member officially joins</p>
              </div>
              <div>
                <Label htmlFor="startDate" className="mb-1.5 flex items-center gap-1.5"><FaCalendarDays className="h-3.5 w-3.5" />Start Date</Label>
                <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">Membership service start date</p>
              </div>
            </div>
              </CardContent>
            </Card>

            {/* Membership Plans Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-lg shrink-0">
                      <FaCreditCard size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">Choose Membership Plan</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Select the right plan for this member</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={programFilter} onValueChange={setProgramFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Programs" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programs</SelectItem>
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="cardio">Cardio</SelectItem>
                        <SelectItem value="group">Group Classes</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2 space-y-3">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Premium Plan Banner */}
              <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                formData.membershipPlan === 'premium-annual' 
                  ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-lg scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
              onClick={() => setFormData({...formData, membershipPlan: 'premium-annual'})}>
                {/* Popular Badge */}
                <div className="absolute -top-1 -right-1">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-2xl text-xs font-semibold shadow-lg">
                    MOST POPULAR
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                        <FaCreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Premium Annual</h3>
                        <p className="text-gray-600">Complete fitness experience</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-600">1,200 <span className="text-lg text-gray-500">AED</span></div>
                      <div className="text-sm text-gray-500 line-through">1,440 AED</div>
                      <div className="text-xs text-green-600 font-semibold">Save 240 AED</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">12</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Months</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">∞</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Access</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">25+</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Programs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">VIP</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Priority</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Personal Training</Badge>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">All Equipment</Badge>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Group Classes</Badge>
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Nutrition Plan</Badge>
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">2 Guest Passes</Badge>
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">+20 More</Badge>
                  </div>
                  
                  <Button 
                    className={`w-full ${
                      formData.membershipPlan === 'premium-annual'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } text-white transition-all duration-200`}
                    size="lg"
                  >
                    {formData.membershipPlan === 'premium-annual' ? (
                      <>
                        <FaCheck className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      'Select Premium Annual'
                    )}
                  </Button>
                </div>
              </div>

              {/* Standard Monthly Plan Banner */}
              <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                formData.membershipPlan === 'standard-monthly' 
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
              onClick={() => setFormData({...formData, membershipPlan: 'standard-monthly'})}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl">
                        <FaDumbbell className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Standard Monthly</h3>
                        <p className="text-gray-600">Essential fitness access</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">299 <span className="text-lg text-gray-500">AED</span></div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">1</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">∞</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Access</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">15+</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Programs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">STD</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Priority</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">All Equipment</Badge>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Group Classes</Badge>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Locker Access</Badge>
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">1 Guest Pass</Badge>
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">+10 More</Badge>
                  </div>
                  
                  <Button 
                    className={`w-full ${
                      formData.membershipPlan === 'standard-monthly'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } text-white transition-all duration-200`}
                    size="lg"
                  >
                    {formData.membershipPlan === 'standard-monthly' ? (
                      <>
                        <FaCheck className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      'Select Standard Monthly'
                    )}
                  </Button>
                </div>
              </div>

              {/* Basic Plan Banner */}
              <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                formData.membershipPlan === 'basic-monthly' 
                  ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
              onClick={() => setFormData({...formData, membershipPlan: 'basic-monthly'})}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                        <FaHeart className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Basic Monthly</h3>
                        <p className="text-gray-600">Get started with fitness</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">149 <span className="text-lg text-gray-500">AED</span></div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">1</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">8-22</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Hours</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">8+</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Programs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">Basic</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Priority</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Gym Access</Badge>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Basic Equipment</Badge>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Cardio Zone</Badge>
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Locker Access</Badge>
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">+5 More</Badge>
                  </div>
                  
                  <Button 
                    className={`w-full ${
                      formData.membershipPlan === 'basic-monthly'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } text-white transition-all duration-200`}
                    size="lg"
                  >
                    {formData.membershipPlan === 'basic-monthly' ? (
                      <>
                        <FaCheck className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      'Select Basic Monthly'
                    )}
                  </Button>
                </div>
              </div>

              {/* Student Plan Banner */}
              <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                formData.membershipPlan === 'student-special' 
                  ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
              }`}
              onClick={() => setFormData({...formData, membershipPlan: 'student-special'})}>
                {/* Student Badge */}
                <div className="absolute -top-1 -right-1">
                  <div className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-2xl text-xs font-semibold shadow-lg">
                    STUDENT DISCOUNT
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl">
                        <FaGraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Student Special</h3>
                        <p className="text-gray-600">Perfect for students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-orange-600">99 <span className="text-lg text-gray-500">AED</span></div>
                      <div className="text-sm text-gray-500 line-through">149 AED</div>
                      <div className="text-xs text-green-600 font-semibold">34% OFF</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">1</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">6-20</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Hours</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">10+</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Programs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">STD</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Priority</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Student ID Required</Badge>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Gym Access</Badge>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Group Classes</Badge>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Study Area</Badge>
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">+7 More</Badge>
                  </div>
                  
                  <Button 
                    className={`w-full ${
                      formData.membershipPlan === 'student-special'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } text-white transition-all duration-200`}
                    size="lg"
                  >
                    {formData.membershipPlan === 'student-special' ? (
                      <>
                        <FaCheck className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      'Select Student Special'
                    )}
                  </Button>
                </div>
              </div>
              </div>{/* end plans grid */}

              {/* Selected Plan Summary */}
              {formData.membershipPlan && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                      <FaCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">Plan Selected</p>
                      <p className="text-sm text-green-600">
                        {formData.membershipPlan === 'premium-annual' && 'Premium Annual - 1,200 AED (Save 240 AED)'}
                        {formData.membershipPlan === 'standard-monthly' && 'Standard Monthly - 299 AED/month'}
                        {formData.membershipPlan === 'basic-monthly' && 'Basic Monthly - 149 AED/month'}
                        {formData.membershipPlan === 'student-special' && 'Student Special - 99 AED/month (34% OFF)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Health Information Section */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-teal-600 rounded-full shrink-0">
                    <FaHeartPulse className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Health Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Medical details for member safety and emergency preparedness</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">

              {/* Health Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Medical Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="medicalConditions" className="flex items-center space-x-2">
                    <FaCircleExclamation className="h-4 w-4" style={{ color: '#2B7A78' }} />
                    <span>Medical Conditions</span>
                  </Label>
                  <Textarea
                    id="medicalConditions"
                    value={formData.medicalConditions}
                    onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})}
                    placeholder="e.g., Asthma, Diabetes, High Blood Pressure"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.medicalConditions.length}/500 characters
                  </p>
                </div>

                {/* Allergies */}
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="flex items-center space-x-2">
                    <FaCircleExclamation className="h-4 w-4 text-red-500" />
                    <span>Allergies</span>
                  </Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                    placeholder="e.g., Peanuts, Penicillin, Dust, Latex"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.allergies.length}/500 characters
                  </p>
                </div>

                {/* Current Medications */}
                <div className="space-y-2">
                  <Label htmlFor="currentMedications" className="flex items-center space-x-2">
                    <FaPills className="h-4 w-4" style={{ color: '#2B7A78' }} />
                    <span>Current Medications</span>
                  </Label>
                  <Textarea
                    id="currentMedications"
                    value={formData.currentMedications}
                    onChange={(e) => setFormData({...formData, currentMedications: e.target.value})}
                    placeholder="e.g., Metformin 500mg, Vitamin D 1000IU"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.currentMedications.length}/500 characters
                  </p>
                </div>

                {/* Chronic Illnesses */}
                <div className="space-y-2">
                  <Label htmlFor="chronicIllnesses" className="flex items-center space-x-2">
                    <FaHeart className="h-4 w-4 text-red-500" />
                    <span>Chronic Illnesses</span>
                  </Label>
                  <Textarea
                    id="chronicIllnesses"
                    value={formData.chronicIllnesses}
                    onChange={(e) => setFormData({...formData, chronicIllnesses: e.target.value})}
                    placeholder="e.g., Heart Disease, Arthritis, COPD"
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.chronicIllnesses.length}/500 characters
                  </p>
                </div>

                {/* Blood Type */}
                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="flex items-center space-x-2">
                    <FaDroplet className="h-4 w-4 text-red-600" />
                    <span>Blood Type</span>
                  </Label>
                  <Select
                    value={formData.bloodType}
                    onValueChange={(value) => setFormData({...formData, bloodType: value})}
                  >
                    <SelectTrigger id="bloodType">
                      <SelectValue placeholder="Select Blood Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2 mb-4">
                    Important for emergency medical care
                  </p>
                </div>

                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center space-x-2">
                      <FaRuler className="h-4 w-4" style={{ color: '#2B7A78' }} />
                      <span>Height (cm)</span>
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({...formData, height: e.target.value})}
                      placeholder="170"
                      min="0"
                      max="300"
                      className="focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center space-x-2">
                      <FaWeightScale className="h-4 w-4" style={{ color: '#2B7A78' }} />
                      <span>Weight (kg)</span>
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      placeholder="70"
                      min="0"
                      max="500"
                      className="focus:ring-2 focus:ring-[#2B7A78] focus:border-[#2B7A78]"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3 border-b border-red-200 pb-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full">
                    <FaShield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900">Emergency Contact Information</h3>
                    <p className="text-sm text-red-700">Person to contact in case of emergency</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName" className="flex items-center space-x-2 text-red-900">
                      <FaUser className="h-4 w-4 text-red-600" />
                      <span>Emergency Contact Name *</span>
                    </Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                      placeholder="Enter full name"
                      className="bg-white border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone" className="flex items-center space-x-2 text-red-900">
                      <FaPhoneVolume className="h-4 w-4 text-red-600" />
                      <span>Emergency Contact Number *</span>
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})}
                      placeholder="+971 XX XXX XXXX"
                      className="bg-white border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="bg-white border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <FaCircleExclamation className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-1">Why is this important?</p>
                      <p className="text-xs text-red-700">
                        Emergency contact information is crucial for member safety. In case of a medical emergency during training,
                        this person will be contacted immediately. Please ensure the contact information is accurate and up-to-date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Information Summary */}
              {(formData.medicalConditions || formData.allergies || formData.currentMedications || formData.chronicIllnesses) && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <FaCircleExclamation className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 mb-2">Health Information Summary</p>
                      <div className="space-y-1 text-sm text-amber-800">
                        {formData.medicalConditions && (
                          <p>• Medical Conditions: {formData.medicalConditions.substring(0, 50)}{formData.medicalConditions.length > 50 ? '...' : ''}</p>
                        )}
                        {formData.allergies && (
                          <p className="text-red-700 font-medium">• Allergies: {formData.allergies.substring(0, 50)}{formData.allergies.length > 50 ? '...' : ''}</p>
                        )}
                        {formData.currentMedications && (
                          <p>• Medications: {formData.currentMedications.substring(0, 50)}{formData.currentMedications.length > 50 ? '...' : ''}</p>
                        )}
                        {formData.chronicIllnesses && (
                          <p>• Chronic Illnesses: {formData.chronicIllnesses.substring(0, 50)}{formData.chronicIllnesses.length > 50 ? '...' : ''}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3 py-4 border-t bg-slate-50/60 rounded-xl px-4">
              <p className="text-sm text-muted-foreground">All required fields must be filled before submitting.</p>
              <div className="flex gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onNavigate?.('members')}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 px-8">
                  Create Member
                </Button>
              </div>
            </div>
          </form>
      </div>

      {/* Camera Capture Dialog */}
      <Dialog open={cameraDialogOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="camera-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FaVideo className="h-5 w-5 text-blue-600" />
              <span>Take Member Photo</span>
            </DialogTitle>
            <DialogDescription id="camera-dialog-description">
              Position the member's face in the center of the frame. The photo will be automatically cropped to fit the profile circle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-96 h-72 bg-gray-900 rounded-xl shadow-2xl"
                  onLoadedMetadata={() => {
                    // Video loaded successfully
                    setCameraError('');
                  }}
                  onError={() => {
                    setCameraError('Failed to load camera feed');
                  }}
                />
                {/* Face guide overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-48 h-48 border-4 border-white border-dashed rounded-full bg-white/10 flex items-center justify-center">
                    <div className="text-center text-white">
                      <FaUser className="h-12 w-12 mx-auto mb-2 opacity-75" />
                      <p className="text-sm opacity-75">Position face here</p>
                    </div>
                  </div>
                </div>
                {/* Corner indicators */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-4 border-b-4 border-white rounded-br-lg"></div>
              </div>
            </div>
            
            {/* Camera status and tips */}
            <div className="space-y-3">
              <div className="text-center text-sm text-gray-600">
                <p><strong>Photography Tips:</strong></p>
                <div className="flex justify-center space-x-4 mt-2 text-xs">
                  <span>Good lighting</span>
                  <span>Look at camera</span>
                  <span>Center face in circle</span>
                  <span>Remove glasses if possible</span>
                </div>
              </div>
              
              {/* Permission help */}
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-700">
                  <strong>Camera Permission Required:</strong> If you see a blocked camera icon in your browser's address bar, 
                  click it and select "Allow" to enable camera access.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={stopCamera} size="lg">
                <FaXmark className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={capturePhoto} 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!videoRef.current?.srcObject}
              >
                <FaCamera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  stopCamera();
                  fileInputRef.current?.click();
                }} 
                size="lg"
              >
                <FaUpload className="h-4 w-4 mr-2" />
                Upload Instead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Editor Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" aria-describedby="photo-dialog-description">
          <DialogHeader>
            <DialogTitle>Adjust Member Photo</DialogTitle>
            <DialogDescription id="photo-dialog-description">
              Use the controls below to zoom and position the photo perfectly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedPhoto && (
              <div className="flex flex-col items-center space-y-6">
                {/* Photo Preview */}
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-border bg-muted">
                  <div
                    className="absolute inset-0 cursor-move select-none"
                    onMouseDown={handlePhotoMouseDown}
                    onMouseMove={handlePhotoMouseMove}
                    onMouseUp={handlePhotoMouseUp}
                    onMouseLeave={handlePhotoMouseUp}
                  >
                    <img
                      src={selectedPhoto}
                      alt="Member"
                      className="select-none pointer-events-none w-full h-full object-cover"
                      style={{
                        transform: `translate(${photoPosition.x}px, ${photoPosition.y}px) scale(${photoZoom[0]})`,
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
                
                {/* Photo Controls */}
                <div className="w-full space-y-4">
                  {/* Zoom Control */}
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <FaMagnifyingGlassPlus className="h-4 w-4" />
                      <span>Zoom: {photoZoom[0].toFixed(1)}x</span>
                    </Label>
                    <Slider
                      value={photoZoom}
                      onValueChange={setPhotoZoom}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Movement Controls */}
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <FaUpDownLeftRight className="h-4 w-4" />
                      <span>Position Controls</span>
                    </Label>
                    <div className="flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => movePhoto('left')}
                        className="flex items-center space-x-2"
                      >
                        <FaArrowLeft className="h-4 w-4" />
                        <span>Move Left</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => movePhoto('right')}
                        className="flex items-center space-x-2"
                      >
                        <FaArrowRight className="h-4 w-4" />
                        <span>Move Right</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Reset and Actions */}
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPhotoPosition}
                    >
                      <FaRotateLeft className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaUpload className="h-4 w-4 mr-2" />
                      Choose Different Photo
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground text-center">
                    <FaUpDownLeftRight className="h-4 w-4 inline mr-1" />
                    Drag the photo to reposition • Use buttons for precise control
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
              <FaXmark className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handlePhotoSave} disabled={!selectedPhoto}>
              <FaCheck className="h-4 w-4 mr-2" />
              Save Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Selection Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full">
                  <FaCreditCard className="h-5 w-5 text-white" />
                </div>
                <span>Select Payment Method</span>
              </DialogTitle>
              <DialogDescription>
                Choose your preferred payment method to complete the membership registration
              </DialogDescription>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePaymentCancel}
                className="h-8 w-8"
              >
                <FaXmark className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Choose how the member will pay for their membership plan. You can accept full payment, split payments, or set up installments.
            </DialogDescription>
            
            {/* Membership Summary */}
            {formData.membershipPlan && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">{getMembershipDetails().name}</h3>
                    <p className="text-sm text-blue-700">
                      Member: {formData.firstName} {formData.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {getMembershipDetails().price} <span className="text-sm text-blue-600">AED</span>
                    </div>
                    {getMembershipDetails().originalPrice && (
                      <div className="text-xs text-blue-600 line-through">
                        {getMembershipDetails().originalPrice} AED
                      </div>
                    )}
                    {getMembershipDetails().savings && (
                      <div className="text-xs text-green-600 font-semibold">
                        Save {getMembershipDetails().savings} AED
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Discount Applied Badge */}
                {selectedDiscount && discountAmount > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-500 text-white">
                          Discount Applied
                        </Badge>
                        <span className="text-blue-800">
                          {discountList.find(d => d.id === selectedDiscount)?.name}
                        </span>
                      </div>
                      <span className="font-semibold text-green-600">
                        - {discountAmount.toFixed(2)} AED
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                      <span className="font-semibold text-blue-900">Final Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        {getFinalPrice().toFixed(2)} <span className="text-sm">AED</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Discount Selection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FaDollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Select Discount (Optional)</h3>
              </div>
              
              <Select 
                value={selectedDiscount || "no-discount"} 
                onValueChange={handleDiscountChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No Discount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-discount">No Discount</SelectItem>
                  {discountList.map((discount) => (
                    <SelectItem key={discount.id} value={discount.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{discount.name}</span>
                        <span className="ml-4 text-green-600 font-semibold">
                          {discount.discountType === 'percentage' 
                            ? `${discount.discountValue}% Off` 
                            : `AED ${discount.discountValue} Off`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedDiscount && discountAmount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <FaCheck className="h-4 w-4 text-green-600" />
                      <span className="text-green-800">
                        {discountList.find(d => d.id === selectedDiscount)?.name} applied
                      </span>
                    </div>
                    <span className="font-semibold text-green-600">
                      Save {discountAmount.toFixed(2)} AED
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Payment Method Options */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Choose Payment Method</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Cash Payment */}
                <div 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'cash'
                      ? 'border-green-500 bg-green-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-green-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => handlePaymentMethodSelect('cash')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-xl">
                      <FaMoneyBillWave className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900">Cash</h4>
                      <p className="text-sm text-green-700">Pay full amount in cash</p>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'cash' && (
                    <div className="mt-3 flex items-center space-x-2 text-green-600">
                      <FaCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>

                {/* Card Payment */}
                <div 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => handlePaymentMethodSelect('card')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl">
                      <FaCreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Card</h4>
                      <p className="text-sm text-blue-700">Credit/Debit card payment</p>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'card' && (
                    <div className="mt-3 flex items-center space-x-2 text-blue-600">
                      <FaCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>

                {/* Credit Payment */}
                <div 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'credit'
                      ? 'border-orange-500 bg-orange-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-orange-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => handlePaymentMethodSelect('credit')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl">
                      <FaWallet className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-900">Credit</h4>
                      <p className="text-sm text-orange-700">Member account / deferred payment</p>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'credit' && (
                    <div className="mt-3 flex items-center space-x-2 text-orange-600">
                      <FaCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>

                {/* Multi Pay */}
                <div 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'multi-pay'
                      ? 'border-purple-500 bg-purple-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => handlePaymentMethodSelect('multi-pay')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-xl">
                      <FaCalculator className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-900">Multi Pay</h4>
                      <p className="text-sm text-purple-700">Split payment (Cash + Card)</p>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'multi-pay' && (
                    <div className="mt-3 flex items-center space-x-2 text-purple-600">
                      <FaCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>

                {/* Check Payment */}
                <div 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'check'
                      ? 'border-gray-500 bg-gray-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-gray-400 hover:shadow-md bg-white'
                  }`}
                  onClick={() => handlePaymentMethodSelect('check')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-500 rounded-xl">
                      <FaFileLines className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Check</h4>
                      <p className="text-sm text-gray-700">Pay via check</p>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'check' && (
                    <div className="mt-3 flex items-center space-x-2 text-gray-600">
                      <FaCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>

                {/* Bank Transfer */}
                <div 
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'bank-transfer'
                      ? 'border-teal-500 bg-teal-50 shadow-lg scale-[1.02]'
                      : 'border-gray-200 hover:border-teal-300 hover:shadow-md bg-white'
                  }`}
                  onClick={() => handlePaymentMethodSelect('bank-transfer')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-teal-500 rounded-xl">
                      <FaBuilding className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-teal-900">Bank Transfer</h4>
                      <p className="text-sm text-teal-700">Direct bank transfer</p>
                    </div>
                  </div>
                  {selectedPaymentMethod === 'bank-transfer' && (
                    <div className="mt-3 flex items-center space-x-2 text-teal-600">
                      <FaCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Split Payment Input */}
            {showSplitPayment && (
              <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-900 flex items-center space-x-2">
                  <FaCalculator className="h-4 w-4" />
                  <span>Split Payment Details</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cashAmount" className="flex items-center space-x-2">
                      <FaMoneyBillWave className="h-4 w-4 text-green-600" />
                      <span>Cash Amount (AED)</span>
                    </Label>
                    <Input
                      id="cashAmount"
                      type="number"
                      min="0"
                      max={getFinalPrice()}
                      value={splitPayment.cash}
                      onChange={(e) => {
                        const cashAmount = parseFloat(e.target.value) || 0;
                        const cardAmount = getFinalPrice() - cashAmount;
                        setSplitPayment({ cash: cashAmount, card: Math.max(0, cardAmount) });
                      }}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cardAmount" className="flex items-center space-x-2">
                      <FaCreditCard className="h-4 w-4 text-blue-600" />
                      <span>Card Amount (AED)</span>
                    </Label>
                    <Input
                      id="cardAmount"
                      type="number"
                      min="0"
                      max={getFinalPrice()}
                      value={splitPayment.card}
                      onChange={(e) => {
                        const cardAmount = parseFloat(e.target.value) || 0;
                        const cashAmount = getFinalPrice() - cardAmount;
                        setSplitPayment({ cash: Math.max(0, cashAmount), card: cardAmount });
                      }}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Split Payment Summary */}
                <div className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FaDollarSign className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Total Split Amount:</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`font-bold ${
                      validateSplitPayment() 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {(splitPayment.cash + splitPayment.card).toFixed(2)} AED
                    </span>
                    {validateSplitPayment() ? (
                      <Badge className="bg-green-100 text-green-800">
                        <FaCheck className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <FaXmark className="h-3 w-3 mr-1" />
                        Invalid
                      </Badge>
                    )}
                  </div>
                </div>
                
                {!validateSplitPayment() && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <FaXmark className="h-4 w-4" />
                    <span>Split amounts must equal the final amount of {getFinalPrice().toFixed(2)} AED</span>
                  </p>
                )}
              </div>
            )}

            {/* Cash Payment Input */}
            {selectedPaymentMethod === 'cash' && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 flex items-center space-x-2">
                  <FaMoneyBillWave className="h-4 w-4" />
                  <span>Cash Payment Details</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Paid Amount Column */}
                  <div>
                    <Label htmlFor="paidAmount" className="flex items-center space-x-2">
                      <FaDollarSign className="h-4 w-4 text-green-600" />
                      <span>Paid Amount (AED)</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentData.paidAmount}
                      onChange={(e) => handlePaymentDataChange('paidAmount', e.target.value)}
                      className={`mt-1 ${paymentErrors.paidAmount ? 'border-red-500' : ''}`}
                      placeholder="Enter amount paid"
                    />
                    {paymentErrors.paidAmount && (
                      <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                        <FaXmark className="h-4 w-4" />
                        <span>{paymentErrors.paidAmount}</span>
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-1">
                      Minimum required: {getFinalPrice().toFixed(2)} AED
                    </p>
                  </div>

                  {/* Pay Back Amount Column */}
                  <div>
                    <Label className="flex items-center space-x-2">
                      <FaArrowsLeftRight className="h-4 w-4 text-green-600" />
                      <span>Pay Back Amount (AED)</span>
                    </Label>
                    <div className="mt-1 px-3 py-2 bg-green-100 border border-green-300 rounded-md min-h-[40px] flex items-center">
                      <span className="font-semibold text-green-800">
                        {(() => {
                          const paidAmount = parseFloat(paymentData.paidAmount || '0');
                          const invoiceAmount = getFinalPrice();
                          const payBack = Math.max(0, paidAmount - invoiceAmount);
                          return payBack.toFixed(2);
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Amount to return to customer
                    </p>
                  </div>
                </div>

                {/* Cash Payment Summary */}
                {paymentData.paidAmount && (
                  <div className="p-3 bg-white border border-green-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Final Amount:</span>
                        <span className="font-semibold">{getFinalPrice().toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid Amount:</span>
                        <span className="font-semibold text-blue-600">
                          {parseFloat(paymentData.paidAmount || '0').toFixed(2)} AED
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pay Back:</span>
                        <span className="font-semibold text-green-600">
                          {(() => {
                            const paidAmount = parseFloat(paymentData.paidAmount || '0');
                            const invoiceAmount = getFinalPrice();
                            const payBack = Math.max(0, paidAmount - invoiceAmount);
                            return payBack.toFixed(2);
                          })()} AED
                        </span>
                      </div>
                    </div>
                    
                    {(() => {
                      const paidAmount = parseFloat(paymentData.paidAmount || '0');
                      const invoiceAmount = getFinalPrice();
                      const payBack = Math.max(0, paidAmount - invoiceAmount);
                      
                      if (payBack > 0) {
                        return (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                            <strong>Cash Return Required:</strong> Return {payBack.toFixed(2)} AED to customer
                          </div>
                        );
                      } else if (paidAmount === invoiceAmount && paidAmount > 0) {
                        return (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <strong>Exact Payment:</strong> No change required
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Credit Payment Input */}
            {selectedPaymentMethod === 'credit' && (
              <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-900 flex items-center space-x-2">
                  <FaWallet className="h-4 w-4" />
                  <span>Credit Payment Details</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="receivedAmount" className="flex items-center space-x-2">
                      <FaDollarSign className="h-4 w-4 text-orange-600" />
                      <span>Received Amount (AED)</span>
                    </Label>
                    <Input
                      id="receivedAmount"
                      type="number"
                      min="0"
                      max={getFinalPrice()}
                      step="0.01"
                      value={paymentData.receivedAmount}
                      onChange={(e) => handlePaymentDataChange('receivedAmount', e.target.value)}
                      className={`mt-1 ${paymentErrors.receivedAmount ? 'border-red-500' : ''}`}
                      placeholder="0.00 (optional for full credit)"
                    />
                    {paymentErrors.receivedAmount && (
                      <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                        <FaXmark className="h-4 w-4" />
                        <span>{paymentErrors.receivedAmount}</span>
                      </p>
                    )}
                    <p className="text-xs text-orange-600 mt-1">
                      Leave empty for full credit
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentDueDate" className="flex items-center space-x-2">
                      <FaCalendarDays className="h-4 w-4 text-orange-600" />
                      <span>Payment Due Date</span>
                      {paymentData.remainingAmount > 0 && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="paymentDueDate"
                      type="date"
                      value={paymentData.paymentDueDate}
                      onChange={(e) => handlePaymentDataChange('paymentDueDate', e.target.value)}
                      className={`mt-1 ${paymentErrors.paymentDueDate ? 'border-red-500' : ''}`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {paymentErrors.paymentDueDate && (
                      <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                        <FaXmark className="h-4 w-4" />
                        <span>{paymentErrors.paymentDueDate}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Credit Payment Summary */}
                <div className="p-3 bg-white border border-orange-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Final Amount:</span>
                      <span className="font-semibold">{getFinalPrice().toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Received Amount:</span>
                      <span className="font-semibold text-green-600">
                        {parseFloat(paymentData.receivedAmount || '0').toFixed(2)} AED
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining/Due:</span>
                      <span className={`font-semibold ${paymentData.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {paymentData.remainingAmount.toFixed(2)} AED
                      </span>
                    </div>
                  </div>
                  
                  {paymentData.remainingAmount > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>Note:</strong> Member will have an outstanding balance of {paymentData.remainingAmount.toFixed(2)} AED due by {paymentData.paymentDueDate || '[Date Required]'}
                    </div>
                  )}
                  
                  {paymentData.remainingAmount === 0 && paymentData.receivedAmount === '' && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                      <strong>Full Credit:</strong> Member will have the entire final amount ({getFinalPrice().toFixed(2)} AED) on credit
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method Description */}
            {selectedPaymentMethod && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Payment Details</h4>
                <div className="text-sm text-gray-700">
                  {selectedPaymentMethod === 'cash' && (
                    <p>💰 Full payment will be collected in cash at the time of registration.</p>
                  )}
                  {selectedPaymentMethod === 'card' && (
                    <p>💳 Payment will be processed using credit/debit card through our secure payment system.</p>
                  )}
                  {selectedPaymentMethod === 'credit' && (
                    <p>📝 Payment will be added to the member's account for future settlement.</p>
                  )}
                  {selectedPaymentMethod === 'multi-pay' && (
                    <p>🔄 Payment will be split between cash and card as specified above.</p>
                  )}
                  {selectedPaymentMethod === 'check' && (
                    <p>📄 Payment will be accepted via check. Please ensure the check is valid and has sufficient funds.</p>
                  )}
                  {selectedPaymentMethod === 'bank-transfer' && (
                    <p>🏦 Payment will be made through direct bank transfer. Bank details will be provided after confirmation.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handlePaymentCancel}
            >
              <FaXmark className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePaymentConfirm}
              disabled={!selectedPaymentMethod || (selectedPaymentMethod === 'multi-pay' && !validateSplitPayment())}
            >
              <FaCheck className="h-4 w-4 mr-2" />
              Confirm Payment & Create Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

