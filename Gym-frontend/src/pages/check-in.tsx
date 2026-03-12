import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { 
  LogIn, 
  LogOut, 
  Search, 
  QrCode, 
  UserCheck, 
  Clock, 
  Users,
  Smartphone,
  Camera,
  CheckCircle,
  AlertCircle,
  UserPlus,
  ChevronDown,
  Upload,
  CreditCard,
  Wallet,
  DollarSign,
  X,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const recentCheckIns = [
  {
    id: 1,
    memberName: "Sarah Johnson",
    memberId: "MEM-0001",
    avatar: "/avatars/sarah.jpg",
    checkInTime: "08:30 AM",
    status: "Active",
    membership: "Premium",
    type: "member"
  },
  {
    id: 2,
    memberName: "Mike Chen",
    memberId: "MEM-0002", 
    avatar: "/avatars/mike.jpg",
    checkInTime: "08:15 AM",
    status: "Active",
    membership: "Standard",
    type: "member"
  },
  {
    id: 3,
    memberName: "Emily Rodriguez",
    memberId: "MEM-0003",
    avatar: "/avatars/emily.jpg",
    checkInTime: "07:45 AM",
    status: "Checked Out",
    membership: "Basic",
    checkOutTime: "09:30 AM",
    type: "member"
  }
];

const quickAccessMembers = [
  {
    id: 1,
    name: "Sarah Johnson",
    memberId: "MEM-0001",
    avatar: "/avatars/sarah.jpg",
    membership: "Premium",
    status: "Active",
    lastVisit: "Today"
  },
  {
    id: 2,
    name: "Mike Chen", 
    memberId: "MEM-0002",
    avatar: "/avatars/mike.jpg",
    membership: "Standard",
    status: "Active",
    lastVisit: "Yesterday"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    memberId: "MEM-0003",
    avatar: "/avatars/emily.jpg",
    membership: "Basic",
    status: "Active",
    lastVisit: "2 days ago"
  }
];

const dailyPlans = [
  { id: 1, name: "Gym Only", price: 50, duration: "1 Day" },
  { id: 2, name: "Gym + Pool", price: 75, duration: "1 Day" },
  { id: 3, name: "Class Access", price: 60, duration: "1 Day" },
  { id: 4, name: "Full Access", price: 100, duration: "1 Day" },
  { id: 5, name: "3-Hour Pass", price: 35, duration: "3 Hours" },
  { id: 6, name: "Half Day (6hrs)", price: 65, duration: "6 Hours" },
];

export function CheckIn() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [activeTab, setActiveTab] = useState("registered");
  const [dailyCheckIns, setDailyCheckIns] = useState<any[]>([]);
  
  // Daily visitor form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorMobile, setVisitorMobile] = useState("");
  const [visitorPhoto, setVisitorPhoto] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const filteredMembers = quickAccessMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.memberId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayCheckIns = recentCheckIns.length + dailyCheckIns.length;
  const activeNow = recentCheckIns.filter(m => m.status === "Active").length + dailyCheckIns.filter(d => d.status === "Active").length;
  const totalCapacity = 150;
  const occupancyRate = Math.round((activeNow / totalCapacity) * 100);

  const selectedPlanDetails = dailyPlans.find(p => p.id.toString() === selectedPlan);
  const totalCharge = selectedPlanDetails ? selectedPlanDetails.price : 0;

  const handleCheckIn = (member: any) => {
    setSelectedMember(member);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisitorPhoto(reader.result as string);
        toast.success("Photo uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapturePhoto = async () => {
    if (!isCameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsCameraActive(true);
        }
      } catch (error) {
        toast.error("Unable to access camera");
      }
    } else {
      // Capture photo from video
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const photoData = canvas.toDataURL('image/png');
          setVisitorPhoto(photoData);
          
          // Stop camera
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          setIsCameraActive(false);
          toast.success("Photo captured successfully");
        }
      }
    }
  };

  const handleCollectPayment = () => {
    if (!visitorName || !visitorMobile || !selectedPlan || !paymentMethod) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStatus(true);
      setIsProcessingPayment(false);
      toast.success(`Payment of AED ${totalCharge} collected successfully via ${paymentMethod}`);
    }, 1500);
  };

  const handleGrantAccess = () => {
    if (!paymentStatus) {
      toast.error("Please complete payment before granting access");
      return;
    }

    const newVisitor = {
      id: Date.now(),
      memberName: visitorName,
      memberId: `DAILY-${Date.now().toString().slice(-4)}`,
      avatar: visitorPhoto || undefined,
      checkInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: "Active",
      membership: selectedPlanDetails?.name || "Daily Pass",
      type: "daily",
      mobile: visitorMobile,
      plan: selectedPlanDetails,
      paymentMethod: paymentMethod,
      amount: totalCharge,
    };

    setDailyCheckIns([newVisitor, ...dailyCheckIns]);
    
    toast.success(`Access granted to ${visitorName}`, {
      description: `${selectedPlanDetails?.name} - Valid for ${selectedPlanDetails?.duration}`,
    });

    // Reset form
    resetDailyVisitorForm();
  };

  const resetDailyVisitorForm = () => {
    setVisitorName("");
    setVisitorMobile("");
    setVisitorPhoto(null);
    setSelectedPlan("");
    setPaymentMethod("");
    setPaymentStatus(false);
    setIsProcessingPayment(false);
  };

  const allCheckIns = [
    ...recentCheckIns.map(c => ({ ...c, type: "member" })),
    ...dailyCheckIns.map(c => ({ ...c, type: "daily" }))
  ].sort((a, b) => {
    const timeA = new Date(`01/01/2000 ${a.checkInTime}`).getTime();
    const timeB = new Date(`01/01/2000 ${b.checkInTime}`).getTime();
    return timeB - timeA;
  });

  return (
    <div className="p-6 space-y-6 bg-gymbios-main-bg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gymbios-heading">Check In</h1>
          <p className="text-muted-foreground">Manage access for registered members or daily visitors</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setScannerActive(!scannerActive)} className="border-primary/30">
            <QrCode className="mr-2 h-4 w-4" />
            QR Scanner
          </Button>
          <Button variant="outline" className="border-primary/30">
            <Camera className="mr-2 h-4 w-4" />
            Face Recognition
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Today's Check-ins</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <LogIn className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{todayCheckIns}</div>
            <p className="text-xs text-muted-foreground">
              Total visits today
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Currently Active</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeNow}</div>
            <p className="text-xs text-muted-foreground">
              Members in gym
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Occupancy Rate</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">
              of {totalCapacity} capacity
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Daily Visitors</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <UserPlus className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dailyCheckIns.length}</div>
            <p className="text-xs text-muted-foreground">
              Walk-in passes today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Check-in Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gradient-light">
          <TabsTrigger 
            value="registered" 
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Registered Members
          </TabsTrigger>
          <TabsTrigger 
            value="daily" 
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Walk-In / Daily
          </TabsTrigger>
        </TabsList>

        {/* Registered Member Check-in Tab */}
        <TabsContent value="registered" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Check-in Interface */}
            <Card className="border-primary/10 shadow-lg">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <CardTitle className="text-primary">Member Check-in</CardTitle>
                <CardDescription>Search and check-in members manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or member ID..."
                    className="pl-10 border-primary/20 focus:border-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-primary/10 rounded-lg hover:bg-gradient-light transition-colors">
                      <div className="flex items-center space-x-3">
                        <Avatar className="border-2 border-primary/20">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-gradient-light text-primary">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.memberId} • {member.membership}</div>
                          <div className="text-xs text-muted-foreground">Last visit: {member.lastVisit}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={member.status === "Active" ? "bg-green-100 text-green-800 border-0" : "bg-gray-100 text-gray-800 border-0"}>
                          {member.status}
                        </Badge>
                        <Button size="sm" className="btn-primary" onClick={() => handleCheckIn(member)}>
                          <LogIn className="mr-2 h-4 w-4" />
                          Check In
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {scannerActive && (
                  <div className="p-6 border-2 border-dashed border-primary/30 rounded-lg text-center bg-gradient-light">
                    <QrCode className="mx-auto h-12 w-12 text-primary mb-4" />
                    <h3 className="font-medium mb-2 text-primary">QR Code Scanner Active</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Position member's QR code in front of the camera
                    </p>
                    <Button variant="outline" onClick={() => setScannerActive(false)} className="border-primary/30">
                      Stop Scanning
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-primary/10 shadow-lg">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <CardTitle className="text-primary">Recent Check-ins</CardTitle>
                <CardDescription>Latest member activity</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {recentCheckIns.map((checkin) => (
                    <div key={checkin.id} className="flex items-center justify-between p-3 border border-primary/10 rounded-lg hover:bg-gradient-light transition-colors">
                      <div className="flex items-center space-x-3">
                        <Avatar className="border-2 border-primary/20">
                          <AvatarImage src={checkin.avatar} />
                          <AvatarFallback className="bg-gradient-light text-primary">
                            {checkin.memberName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{checkin.memberName}</div>
                          <div className="text-sm text-muted-foreground">{checkin.memberId}</div>
                          <div className="text-xs text-muted-foreground">
                            In: {checkin.checkInTime}
                            {checkin.checkOutTime && ` • Out: ${checkin.checkOutTime}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {checkin.status === "Active" ? (
                          <>
                            <Badge className="bg-green-100 text-green-800 border-0">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              In Gym
                            </Badge>
                            <Button size="sm" variant="outline" className="border-primary/30">
                              <LogOut className="mr-2 h-4 w-4" />
                              Check Out
                            </Button>
                          </>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 border-0">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Visitor Check-in Tab */}
        <TabsContent value="daily" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Walk-In Access Form */}
            <Card className="lg:col-span-2 border-primary/10 shadow-lg">
              <CardHeader className="bg-gradient-primary text-white">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <CardTitle>Walk-In / Daily Visitor Access</CardTitle>
                </div>
                <CardDescription className="text-white/80">
                  Register and grant temporary access to daily visitors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Visitor Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Visitor Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visitor-name" className="text-primary">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="visitor-name"
                        placeholder="Enter full name"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visitor-mobile" className="text-primary">
                        Mobile Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="visitor-mobile"
                        type="tel"
                        placeholder="+971 XX XXX XXXX"
                        value={visitorMobile}
                        onChange={(e) => setVisitorMobile(e.target.value)}
                        maxLength={15}
                        className="border-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Photo Capture/Upload */}
                  <div className="space-y-2">
                    <Label className="text-primary">
                      Photo <span className="text-muted-foreground text-sm">(Optional)</span>
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {!visitorPhoto ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCapturePhoto}
                            className="flex-1 border-primary/30"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            {isCameraActive ? "Capture Photo" : "Use Camera"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 border-primary/30"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Photo
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </>
                      ) : (
                        <div className="relative w-full">
                          <div className="flex items-center space-x-3 p-3 border border-primary/20 rounded-lg bg-gradient-light">
                            <img 
                              src={visitorPhoto} 
                              alt="Visitor" 
                              className="w-16 h-16 rounded-lg object-cover border-2 border-primary/20"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">Photo captured</p>
                              <p className="text-xs text-muted-foreground">Ready for check-in</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setVisitorPhoto(null);
                                if (isCameraActive && videoRef.current) {
                                  const stream = videoRef.current.srcObject as MediaStream;
                                  stream?.getTracks().forEach(track => track.stop());
                                  setIsCameraActive(false);
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {isCameraActive && (
                      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-primary/10" />

                {/* Plan & Payment */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary flex items-center">
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Access Plan & Payment
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daily-plan" className="text-primary">
                        Choose Daily Plan <span className="text-red-500">*</span>
                      </Label>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger id="daily-plan" className="border-primary/20">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {dailyPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} - AED {plan.price} ({plan.duration})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-method" className="text-primary">
                        Payment Method <span className="text-red-500">*</span>
                      </Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="payment-method" className="border-primary/20">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="card">💳 Card</SelectItem>
                          <SelectItem value="upi">📱 UPI</SelectItem>
                          <SelectItem value="pos">🖥️ POS</SelectItem>
                          <SelectItem value="wallet">👛 Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Total Charge Display */}
                  {selectedPlan && (
                    <div className="p-4 bg-gradient-light border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Charge</p>
                          <p className="text-2xl font-bold text-primary">AED {totalCharge}</p>
                          {selectedPlanDetails && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Valid for {selectedPlanDetails.duration}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {paymentStatus ? (
                            <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-0 px-3 py-1">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="bg-primary/10" />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/30"
                    onClick={resetDailyVisitorForm}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={handleCollectPayment}
                    disabled={!visitorName || !visitorMobile || !selectedPlan || !paymentMethod || paymentStatus || isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Collect Payment
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 btn-primary"
                    onClick={handleGrantAccess}
                    disabled={!paymentStatus}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Grant Access
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's Daily Visitors */}
            <Card className="border-primary/10 shadow-lg">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <CardTitle className="text-primary">Today's Daily Visitors</CardTitle>
                <CardDescription>Walk-in passes issued</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {dailyCheckIns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm">No daily visitors yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {dailyCheckIns.map((visitor) => (
                      <div key={visitor.id} className="p-3 border border-primary/10 rounded-lg bg-gradient-light hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {visitor.avatar ? (
                              <img 
                                src={visitor.avatar} 
                                alt={visitor.memberName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <UserPlus className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{visitor.memberName}</p>
                              <p className="text-xs text-muted-foreground">{visitor.memberId}</p>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                            Daily User
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground ml-12">
                          <div className="flex items-center justify-between">
                            <span>Plan:</span>
                            <span className="font-medium text-primary">{visitor.membership}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Check-in:</span>
                            <span className="font-medium">{visitor.checkInTime}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Amount:</span>
                            <span className="font-medium text-green-600">AED {visitor.amount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Mobile:</span>
                            <span className="font-medium">{visitor.mobile}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Today's Check-In Log (All) */}
      <Card className="border-primary/10 shadow-lg">
        <CardHeader className="bg-gradient-light border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary">Today's Check-In Log</CardTitle>
              <CardDescription>All check-ins (Members + Daily Visitors)</CardDescription>
            </div>
            <Badge className="bg-gradient-primary text-white border-0">
              {allCheckIns.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {allCheckIns.map((checkin) => (
              <div key={checkin.id} className="flex items-center justify-between p-3 border border-primary/10 rounded-lg hover:bg-gradient-light transition-colors">
                <div className="flex items-center space-x-3">
                  {checkin.avatar ? (
                    <Avatar className="border-2 border-primary/20">
                      <AvatarImage src={checkin.avatar} />
                      <AvatarFallback className="bg-gradient-light text-primary">
                        {checkin.memberName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-primary/20">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{checkin.memberName}</div>
                    <div className="text-sm text-muted-foreground">
                      {checkin.memberId} • {checkin.membership}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      In: {checkin.checkInTime}
                      {checkin.checkOutTime && ` • Out: ${checkin.checkOutTime}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={
                    checkin.type === "daily" 
                      ? "bg-blue-100 text-blue-800 border-0"
                      : "bg-purple-100 text-purple-800 border-0"
                  }>
                    {checkin.type === "daily" ? "Daily User" : "Member"}
                  </Badge>
                  {checkin.status === "Active" && (
                    <Badge className="bg-green-100 text-green-800 border-0">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Confirmation Dialog for Members */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Check-in</DialogTitle>
              <DialogDescription>
                Checking in {selectedMember.name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-4 py-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={selectedMember.avatar} />
                <AvatarFallback className="bg-gradient-light text-primary">
                  {selectedMember.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{selectedMember.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedMember.memberId}</p>
                <Badge className="mt-1 bg-gradient-light text-primary border border-primary/20">
                  {selectedMember.membership}
                </Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Check-in Time</Label>
                  <div className="font-medium">{new Date().toLocaleTimeString()}</div>
                </div>
                <div>
                  <Label>Date</Label>
                  <div className="font-medium">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedMember(null)} className="border-primary/30">
                Cancel
              </Button>
              <Button 
                className="btn-primary" 
                onClick={() => {
                  toast.success(`${selectedMember.name} checked in successfully`);
                  setSelectedMember(null);
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Check-in
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

