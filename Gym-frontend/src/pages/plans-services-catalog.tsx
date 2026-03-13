import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AddMember } from "./add-member";
import { MemberDraftModal } from "../components/shared/member-draft-modal";
import { 
  Search,
  Maximize2,
  Minimize2,
  Clock,
  Users,
  Star,
  Award,
  Calendar,
  MapPin,
  Phone,
  Mail,
  QrCode,
  Heart,
  Dumbbell,
  Activity,
  Target,
  Zap,
  CheckCircle,
  UserPlus,
  Gift,
  Trophy,
  Timer,
  Smartphone,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Play,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Sample data - in real app, this would come from the GymOS configuration
const catalogConfig = {
  membershipPlans: true,
  trainingStreams: true,
  classes: false // This would be controlled by GymOS configuration
};

// Sample membership plans data
const membershipPlans = [
  {
    id: 1,
    name: "Basic Fitness",
    duration: "1 Month",
    price: "199 AED",
    originalPrice: "249 AED",
    discount: "20% OFF",
    popular: false,
    features: [
      "Gym Access (6 AM - 10 PM)",
      "Cardio & Weight Training Area",
      "Locker Room Access",
      "Basic Equipment Usage",
      "Monthly Fitness Assessment"
    ],
    color: "blue",
    memberCount: "2,450+ Members"
  },
  {
    id: 2,
    name: "Premium Lifestyle",
    duration: "3 Months",
    price: "499 AED",
    originalPrice: "699 AED",
    discount: "Best Value",
    popular: true,
    features: [
      "24/7 Gym Access",
      "All Group Classes",
      "Sauna & Steam Room",
      "Guest Pass (2/month)",
      "Nutrition Consultation",
      "Personal Training Session (1/month)"
    ],
    color: "purple",
    memberCount: "1,850+ Members"
  },
  {
    id: 3,
    name: "Elite Performance",
    duration: "6 Months",
    price: "899 AED",
    originalPrice: "1,199 AED",
    discount: "25% OFF",
    popular: false,
    features: [
      "Everything in Premium",
      "VIP Locker Room",
      "Priority Class Booking",
      "Unlimited Guest Passes",
      "Weekly Personal Training",
      "Meal Plan & Supplements"
    ],
    color: "gold",
    memberCount: "750+ Members"
  },
  {
    id: 4,
    name: "Annual Champion",
    duration: "12 Months",
    price: "1,599 AED",
    originalPrice: "2,399 AED",
    discount: "33% OFF",
    popular: false,
    features: [
      "Everything in Elite",
      "Dedicated Trainer Assignment",
      "Customized Workout Plans",
      "Body Composition Analysis",
      "Recovery & Wellness Services",
      "Competition Prep Support"
    ],
    color: "emerald",
    memberCount: "450+ Members"
  }
];

// Sample training streams data
const trainingStreams = [
  {
    id: 1,
    name: "Personal Training",
    description: "One-on-one customized fitness coaching",
    price: "150 AED/session",
    packagePrice: "1,200 AED/10 sessions",
    specialization: "Weight Loss & Strength",
    trainers: [
      { name: "Ahmed Al-Rashid", image: "/trainers/ahmed.jpg", experience: "8 years", speciality: "Strength Training" },
      { name: "Sarah Johnson", image: "/trainers/sarah.jpg", experience: "6 years", speciality: "Weight Loss" },
      { name: "Mohammed Hassan", image: "/trainers/mohammed.jpg", experience: "10 years", speciality: "Athletic Performance" }
    ],
    features: [
      "Customized workout plans",
      "Nutrition guidance",
      "Progress tracking",
      "Flexible scheduling"
    ],
    duration: "60 minutes",
    availability: "Mon-Sat 6AM-10PM"
  },
  {
    id: 2,
    name: "CrossFit Training",
    description: "High-intensity functional fitness program",
    price: "80 AED/session",
    packagePrice: "600 AED/10 sessions",
    specialization: "Functional Fitness",
    trainers: [
      { name: "Alex Thompson", image: "/trainers/alex.jpg", experience: "7 years", speciality: "CrossFit Level 2" },
      { name: "Fatima Al-Zahra", image: "/trainers/fatima.jpg", experience: "5 years", speciality: "Olympic Lifting" }
    ],
    features: [
      "WOD (Workout of the Day)",
      "Olympic lifting technique",
      "Metabolic conditioning",
      "Group motivation"
    ],
    duration: "45 minutes",
    availability: "Daily 6AM-9PM"
  },
  {
    id: 3,
    name: "Yoga & Mindfulness",
    description: "Traditional and modern yoga practices",
    price: "60 AED/session",
    packagePrice: "450 AED/10 sessions",
    specialization: "Mind-Body Wellness",
    trainers: [
      { name: "Priya Sharma", image: "/trainers/priya.jpg", experience: "12 years", speciality: "Hatha Yoga" },
      { name: "David Chen", image: "/trainers/david.jpg", experience: "8 years", speciality: "Vinyasa Flow" }
    ],
    features: [
      "Multiple yoga styles",
      "Meditation guidance",
      "Flexibility improvement",
      "Stress relief"
    ],
    duration: "60 minutes",
    availability: "Daily 7AM-8PM"
  },
  {
    id: 4,
    name: "HIIT Bootcamp",
    description: "High-Intensity Interval Training sessions",
    price: "50 AED/session",
    packagePrice: "400 AED/10 sessions",
    specialization: "Cardio & Fat Loss",
    trainers: [
      { name: "Marcus Rodriguez", image: "/trainers/marcus.jpg", experience: "6 years", speciality: "HIIT Specialist" },
      { name: "Layla Al-Mansouri", image: "/trainers/layla.jpg", experience: "4 years", speciality: "Circuit Training" }
    ],
    features: [
      "Fat burning workouts",
      "No equipment needed",
      "All fitness levels",
      "Quick results"
    ],
    duration: "30 minutes",
    availability: "Mon-Fri 6AM-8PM"
  }
];

// Sample classes data
const classes = [
  {
    id: 1,
    name: "Morning Yoga",
    trainer: "Priya Sharma",
    time: "7:00 AM - 8:00 AM",
    days: ["Mon", "Wed", "Fri"],
    capacity: 20,
    enrolled: 15,
    difficulty: "Beginner",
    room: "Studio A"
  },
  {
    id: 2,
    name: "HIIT Blast",
    trainer: "Marcus Rodriguez",
    time: "6:30 PM - 7:00 PM",
    days: ["Tue", "Thu", "Sat"],
    capacity: 15,
    enrolled: 12,
    difficulty: "Intermediate",
    room: "Functional Area"
  },
  {
    id: 3,
    name: "CrossFit WOD",
    trainer: "Alex Thompson",
    time: "8:00 AM - 8:45 AM",
    days: ["Mon", "Wed", "Fri"],
    capacity: 12,
    enrolled: 10,
    difficulty: "Advanced",
    room: "CrossFit Box"
  },
  {
    id: 4,
    name: "Zumba Dance",
    trainer: "Isabella Garcia",
    time: "7:00 PM - 8:00 PM",
    days: ["Mon", "Wed"],
    capacity: 25,
    enrolled: 18,
    difficulty: "All Levels",
    room: "Dance Studio"
  }
];

export function PlansServicesCatalog() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showChoosePlan, setShowChoosePlan] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    name: "",
    phone: "",
    email: "",
    interest: "",
    message: ""
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);

  // Auto-refresh functionality for kiosk mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && isFullscreen) {
      interval = setInterval(() => {
        setLastRefresh(new Date());
        // In real app, this would refresh data from API
        console.log('Auto-refreshing catalog data...');
      }, 10 * 60 * 1000); // 10 minutes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        // Check if fullscreen is available before attempting
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          // Fallback: just toggle the UI state without actual fullscreen
          setIsFullscreen(true);
          console.log('Fullscreen API not available, using simulated fullscreen mode');
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      // If fullscreen fails (e.g., due to permissions policy), just toggle UI state
      console.log('Fullscreen API blocked, using simulated fullscreen mode');
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleInquirySubmit = () => {
    // In real app, this would submit to API
    console.log('Inquiry submitted:', inquiryData);
    setShowInquiryForm(false);
    setInquiryData({ name: "", phone: "", email: "", interest: "", message: "" });
    // Show success toast
  };

  const generateQRCode = () => {
    // In real app, this would generate actual QR code for entire catalog
    const qrData = `${window.location.origin}/catalog-pdf`;
    console.log('QR Code data:', qrData);
    setShowQRCode(true);
  };

  const exportToPDF = () => {
    // In real app, this would generate a PDF
    console.log('Exporting catalog to PDF...');
    // Simulate PDF generation
    const pdfContent = generatePDFContent();
    // Download or open PDF
    window.print(); // For demo, use browser print
  };

  const generatePDFContent = () => {
    return {
      membershipPlans,
      trainingStreams,
      classes,
      gymInfo: {
        name: "GymBios Fitness Center",
        address: "Dubai, UAE",
        phone: "+971 50 123 4567",
        email: "info@gymbios.com"
      }
    };
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getClassesForDate = (date: number) => {
    // Mock data - in real app would filter classes by date
    return classes.filter((_, index) => (date + index) % 7 < 2);
  };

  const getPlanColor = (color: string) => {
    switch (color) {
      case 'blue': return 'from-blue-500 to-blue-600';
      case 'purple': return 'from-purple-500 to-purple-600';
      case 'gold': return 'from-yellow-500 to-yellow-600';
      case 'emerald': return 'from-emerald-500 to-emerald-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''} p-6 space-y-6 bg-gray-50 min-h-screen overflow-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${isFullscreen ? 'text-4xl' : 'text-3xl'} font-bold text-gray-900`}>
            Plans & Services Catalog
          </h1>
          <p className={`text-gray-600 mt-1 ${isFullscreen ? 'text-lg' : ''}`}>
            Discover our comprehensive fitness plans, training programs, and group classes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isFullscreen && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </div>
          )}
          
          {/* Header Action Buttons */}
          <Button
            variant="outline"
            size={isFullscreen ? "default" : "sm"}
            onClick={generateQRCode}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
          
          <Button
            variant="outline"
            size={isFullscreen ? "default" : "sm"}
            onClick={exportToPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          
          <Button
            variant="outline"
            size={isFullscreen ? "default" : "sm"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Full Screen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                Full Screen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Actions for Walk-in Inquiries */}
      {!isFullscreen && (
        <div className="flex items-center justify-center space-x-4">
          <Dialog open={showInquiryForm} onOpenChange={setShowInquiryForm}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <UserPlus className="h-4 w-4 mr-2" />
                I'm Interested
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Express Your Interest</DialogTitle>
                <DialogDescription>
                  Fill out this quick form and our team will contact you soon!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={inquiryData.name}
                      onChange={(e) => setInquiryData({...inquiryData, name: e.target.value})}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={inquiryData.phone}
                      onChange={(e) => setInquiryData({...inquiryData, phone: e.target.value})}
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inquiryData.email}
                    onChange={(e) => setInquiryData({...inquiryData, email: e.target.value})}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="interest">I'm Interested In</Label>
                  <Select value={inquiryData.interest} onValueChange={(value) => setInquiryData({...inquiryData, interest: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Membership Plans</SelectItem>
                      <SelectItem value="personal-training">Personal Training</SelectItem>
                      <SelectItem value="group-classes">Group Classes</SelectItem>
                      <SelectItem value="crossfit">CrossFit Training</SelectItem>
                      <SelectItem value="yoga">Yoga & Mindfulness</SelectItem>
                      <SelectItem value="hiit">HIIT Bootcamp</SelectItem>
                      <SelectItem value="general">General Information</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Additional Message</Label>
                  <Textarea
                    id="message"
                    value={inquiryData.message}
                    onChange={(e) => setInquiryData({...inquiryData, message: e.target.value})}
                    placeholder="Tell us more about your fitness goals..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowInquiryForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInquirySubmit} disabled={!inquiryData.name || !inquiryData.phone}>
                  Submit Inquiry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showOnboardForm} onOpenChange={setShowOnboardForm}>
            <DialogTrigger asChild>
              <Button className="bg-[#2B7A78] hover:bg-[#2B7A78]/90 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Member On-board
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>Member On-boarding</DialogTitle>
                <DialogDescription>
                  Complete the form below to register a new member
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6">
                <AddMember onNavigate={() => setShowOnboardForm(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Content Sections */}
      <Tabs defaultValue="memberships" className="space-y-6">
        <TabsList className={`grid w-full grid-cols-3 ${isFullscreen ? 'h-16 text-lg' : ''}`}>
          {catalogConfig.membershipPlans && (
            <TabsTrigger value="memberships" className="flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Membership Plans & Pricing</span>
            </TabsTrigger>
          )}
          {catalogConfig.trainingStreams && (
            <TabsTrigger value="training" className="flex items-center space-x-2">
              <Dumbbell className="h-4 w-4" />
              <span>Training Streams</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="classes" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Scheduled Classes</span>
          </TabsTrigger>
        </TabsList>

        {/* Membership Plans Section */}
        {catalogConfig.membershipPlans && (
          <TabsContent value="memberships" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className={`${isFullscreen ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>Choose Your Perfect Plan</h2>
              <p className={`text-gray-600 max-w-2xl mx-auto ${isFullscreen ? 'text-lg' : ''}`}>
                Start your fitness journey with our flexible membership options designed for every lifestyle and budget
              </p>
            </div>

            <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
              {membershipPlans.map((plan) => (
                <Card key={plan.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''} ${isFullscreen ? 'h-auto' : ''}`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-pink-500 text-white px-3 py-1 text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  
                  <div className={`bg-gradient-to-r ${getPlanColor(plan.color)} text-white p-6`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`${isFullscreen ? 'text-xl' : 'text-lg'} font-bold`}>{plan.name}</h3>
                        <p className={`${isFullscreen ? 'text-base' : 'text-sm'} opacity-90`}>{plan.duration}</p>
                      </div>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {plan.discount}
                      </Badge>
                    </div>
                    
                    <div className="text-center">
                      <div className={`${isFullscreen ? 'text-4xl' : 'text-3xl'} font-bold mb-1`}>{plan.price}</div>
                      <div className={`${isFullscreen ? 'text-base' : 'text-sm'} opacity-75 line-through`}>{plan.originalPrice}</div>
                      <div className={`${isFullscreen ? 'text-sm' : 'text-xs'} opacity-90 mt-2`}>{plan.memberCount}</div>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className={`flex items-start space-x-2 ${isFullscreen ? 'text-base' : 'text-sm'}`}>
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-[#2B7A78] hover:bg-[#236360] text-white"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowChoosePlan(true);
                        }}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Choose Plan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowPlanDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Training Streams Section */}
        {catalogConfig.trainingStreams && (
          <TabsContent value="training" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className={`${isFullscreen ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>Specialized Training Programs</h2>
              <p className={`text-gray-600 max-w-2xl mx-auto ${isFullscreen ? 'text-lg' : ''}`}>
                Work with our certified trainers in specialized programs designed to help you achieve your specific fitness goals
              </p>
            </div>

            <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
              {trainingStreams.map((stream) => (
                <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className={`${isFullscreen ? 'text-xl' : 'text-lg'}`}>{stream.name}</CardTitle>
                        <CardDescription className={`${isFullscreen ? 'text-base' : ''} mt-1`}>{stream.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {stream.specialization}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Pricing */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`${isFullscreen ? 'text-sm' : 'text-xs'} text-gray-600 mb-1`}>Per Session</p>
                          <p className={`${isFullscreen ? 'text-xl' : 'text-lg'} font-bold text-blue-600`}>{stream.price}</p>
                        </div>
                        <div>
                          <p className={`${isFullscreen ? 'text-sm' : 'text-xs'} text-gray-600 mb-1`}>Package Deal</p>
                          <p className={`${isFullscreen ? 'text-xl' : 'text-lg'} font-bold text-green-600`}>{stream.packagePrice}</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className={`${isFullscreen ? 'text-base' : 'text-sm'} font-semibold mb-3`}>What's Included:</h4>
                      <ul className="grid grid-cols-2 gap-2">
                        {stream.features.map((feature, index) => (
                          <li key={index} className={`flex items-start space-x-2 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Session Info */}
                    <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-4">
                      <div className="flex items-center space-x-1">
                        <Timer className="h-4 w-4" />
                        <span>{stream.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{stream.availability}</span>
                      </div>
                    </div>

                    {/* Trainers */}
                    <div>
                      <h4 className={`${isFullscreen ? 'text-base' : 'text-sm'} font-semibold mb-3`}>Our Expert Trainers:</h4>
                      <div className="space-y-2">
                        {stream.trainers.map((trainer, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={trainer.image} alt={trainer.name} />
                                <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className={`${isFullscreen ? 'text-sm' : 'text-xs'} font-medium`}>{trainer.name}</p>
                                <p className="text-xs text-gray-500">{trainer.speciality}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {trainer.experience}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button className="flex-1 bg-[#2B7A78] hover:bg-[#236360] text-white">
                        Book Session
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Learn More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Classes Section */}
        <TabsContent value="classes" className="space-y-6">
          <div className="text-center mb-8">
            <h2 className={`${isFullscreen ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>Group Class Schedule</h2>
            <p className={`text-gray-600 max-w-2xl mx-auto ${isFullscreen ? 'text-lg' : ''}`}>
              Join our energizing group classes designed for all fitness levels
            </p>
          </div>

          <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
            {classes.map((classItem) => (
              <Card key={classItem.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className={`${isFullscreen ? 'text-xl' : 'text-lg'}`}>{classItem.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center space-x-2 mt-2">
                          <Users className="h-4 w-4" />
                          <span>with {classItem.trainer}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <Badge className={getDifficultyColor(classItem.difficulty)}>
                      {classItem.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{classItem.time}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{classItem.room}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Class Days:</p>
                    <div className="flex space-x-2">
                      {classItem.days.map((day, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Enrollment:</span>
                      <span className="font-medium">{classItem.enrolled}/{classItem.capacity} spots</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#2B7A78] h-2 rounded-full transition-all" 
                        style={{ width: `${(classItem.enrolled / classItem.capacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-[#2B7A78] hover:bg-[#236360] text-white"
                    disabled={classItem.enrolled >= classItem.capacity}
                  >
                    {classItem.enrolled >= classItem.capacity ? 'Class Full' : 'Reserve Spot'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Action Buttons in Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed bottom-8 right-8 flex space-x-4">
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={() => setShowInquiryForm(true)}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            I'm Interested
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={generateQRCode}
          >
            <QrCode className="h-5 w-5 mr-2" />
            QR Code
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={exportToPDF}
          >
            <Download className="h-5 w-5 mr-2" />
            Print PDF
          </Button>
        </div>
      )}

      {/* Plan Details Dialog */}
      <Dialog open={showPlanDetails} onOpenChange={setShowPlanDetails}>
        <DialogContent className="sm:max-w-[600px]" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="text-2xl">{selectedPlan.name}</span>
                  <Badge className={`bg-gradient-to-r ${getPlanColor(selectedPlan.color)} text-white`}>
                    {selectedPlan.discount}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Complete details about this membership plan
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Pricing Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Plan Price</p>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-[#2B7A78]">{selectedPlan.price}</span>
                        <span className="text-lg text-gray-500 line-through">{selectedPlan.originalPrice}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Duration: {selectedPlan.duration}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Members</p>
                      <p className="text-lg font-semibold text-[#2B7A78]">{selectedPlan.memberCount}</p>
                    </div>
                  </div>
                </div>

                {/* Features Section */}
                <div>
                  <h4 className="font-semibold text-lg mb-4">Plan Features & Benefits</h4>
                  <ul className="space-y-3">
                    {selectedPlan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Additional Information */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2 text-yellow-800">Important Notes:</h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• All prices are in AED and inclusive of VAT</li>
                    <li>• Membership starts from the date of registration</li>
                    <li>• No refunds on early cancellation</li>
                    <li>• Photo ID required for registration</li>
                    <li>• Terms and conditions apply</li>
                  </ul>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-[#2B7A78]" />
                    <span>+971 50 123 4567</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-[#2B7A78]" />
                    <span>info@gymbios.com</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <Button 
                  className="flex-1 bg-[#2B7A78] hover:bg-[#236360] text-white"
                  onClick={() => {
                    setShowPlanDetails(false);
                    setShowChoosePlan(true);
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Choose This Plan
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowPlanDetails(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Choose Plan Dialog */}
      <Dialog open={showChoosePlan} onOpenChange={setShowChoosePlan}>
        <DialogContent className="sm:max-w-[600px]" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle>Choose {selectedPlan.name}</DialogTitle>
                <DialogDescription>
                  Select how you want to proceed with this membership plan
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {/* Selected Plan Summary */}
                <div className={`bg-gradient-to-r ${getPlanColor(selectedPlan.color)} text-white p-6 rounded-lg`}>
                  <h3 className="text-xl font-bold mb-2">{selectedPlan.name}</h3>
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="text-3xl font-bold">{selectedPlan.price}</span>
                    <span className="text-sm opacity-75">for {selectedPlan.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm opacity-90">
                    <Users className="h-4 w-4" />
                    <span>{selectedPlan.memberCount}</span>
                  </div>
                </div>

                {/* Action Options */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Choose Your Action:</h4>
                  
                  {/* Option 1: Existing Member */}
                  <Card className="border-2 border-transparent hover:border-[#2B7A78] transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg mb-2">I'm an Existing Member</h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Add this plan to your current membership or upgrade your existing plan
                          </p>
                          <Button 
                            className="bg-[#2B7A78] hover:bg-[#236360] text-white"
                            onClick={() => {
                              console.log('Adding plan to existing member:', selectedPlan.name);
                              setShowChoosePlan(false);
                              alert(`Feature Coming Soon: Add ${selectedPlan.name} to existing membership`);
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Add to My Account
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 2: New Member */}
                  <Card className="border-2 border-transparent hover:border-[#2B7A78] transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg mb-2">I'm a New Member</h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Start your fitness journey by completing our quick on-boarding process
                          </p>
                          <Button 
                            className="bg-[#2B7A78] hover:bg-[#236360] text-white"
                            onClick={() => {
                              setShowChoosePlan(false);
                              setShowDraftModal(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register as New Member
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 3: Inquiry */}
                  <Card className="border-2 border-transparent hover:border-[#2B7A78] transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg mb-2">I Have Questions</h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Get in touch with our team to learn more about this plan
                          </p>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline"
                              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                              onClick={() => {
                                setShowChoosePlan(false);
                                setInquiryData({ ...inquiryData, interest: 'membership' });
                                setShowInquiryForm(true);
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Inquiry
                            </Button>
                            <Button 
                              variant="outline"
                              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                              onClick={() => {
                                window.location.href = 'tel:+971501234567';
                              }}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call Us
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setShowChoosePlan(false)}
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Draft Modal */}
      <MemberDraftModal
        open={showDraftModal}
        onOpenChange={setShowDraftModal}
        selectedPlan={selectedPlan ? {
          id: selectedPlan.id.toString(),
          name: selectedPlan.name,
          price: parseFloat(selectedPlan.price.replace(/[^\d.-]/g, '')),
          duration: selectedPlan.duration,
          benefits: selectedPlan.features
        } : null}
        onSubmitDraft={(draftData) => {
          setPendingMembers(prev => [...prev, draftData]);
          
          // Save to sessionStorage (simulating backend)
          const existing = JSON.parse(sessionStorage.getItem('pendingMembers') || '[]');
          existing.push(draftData);
          sessionStorage.setItem('pendingMembers', JSON.stringify(existing));
          
          // Notify other components
          window.dispatchEvent(new Event('pendingMembersUpdated'));
          
          console.log('Draft submitted:', draftData);
        }}
      />
    </div>
  );
}

