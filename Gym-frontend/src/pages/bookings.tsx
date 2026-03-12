import React, { useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar as CalendarIcon, Clock, Users, MapPin, QrCode, Plus, Search, Filter, CheckCircle, AlertCircle, User, UserPlus, Calendar, Dumbbell, Building, Phone, Mail, MessageSquare, Download, RotateCcw, Eye, Edit3, X, Zap, PieChart } from "lucide-react";
import { toast } from "sonner";

interface BookingsProps {
  onNavigate?: (section: string) => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  avatar?: string;
}

interface ClassSchedule {
  id: string;
  name: string;
  instructor: string;
  time: string;
  duration: number;
  capacity: number;
  booked: number;
  price: number;
  type: 'class' | 'pt' | 'facility';
  description: string;
  location: string;
  status: 'available' | 'full' | 'cancelled';
}

interface Booking {
  id: string;
  memberId?: string;
  memberName: string;
  classId: string;
  className: string;
  instructor: string;
  date: string;
  time: string;
  type: 'class' | 'pt' | 'facility';
  status: 'confirmed' | 'checked-in' | 'no-show' | 'cancelled';
  price: number;
  qrCode: string;
  isGuest: boolean;
  guestDetails?: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
}

// Trial Data
const trialMembers: Member[] = [
  {
    id: "M001",
    name: "Ahmed Al-Mahmoud",
    email: "ahmed.mahmoud@email.com",
    phone: "+971-50-123-4567",
    membershipType: "Premium",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: "M002", 
    name: "Fatima Al-Zahra",
    email: "fatima.zahra@email.com",
    phone: "+971-55-987-6543",
    membershipType: "Standard",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: "M003",
    name: "Mohammed Hassan",
    email: "mohammed.hassan@email.com", 
    phone: "+971-56-456-7890",
    membershipType: "Basic",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: "M004",
    name: "Sarah Al-Rashid",
    email: "sarah.rashid@email.com",
    phone: "+971-52-234-5678", 
    membershipType: "Premium",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
  }
];

const trialClasses: ClassSchedule[] = [
  {
    id: "C001",
    name: "Morning Yoga Flow",
    instructor: "Sarah Johnson",
    time: "09:00",
    duration: 60,
    capacity: 20,
    booked: 12,
    price: 50,
    type: 'class',
    description: "Gentle morning yoga to energize your day",
    location: "Studio A",
    status: 'available'
  },
  {
    id: "C002", 
    name: "HIIT Bootcamp",
    instructor: "Mike Chen",
    time: "10:30",
    duration: 45,
    capacity: 15,
    booked: 8,
    price: 75,
    type: 'class',
    description: "High-intensity interval training for maximum results",
    location: "Main Gym",
    status: 'available'
  },
  {
    id: "C003",
    name: "Strength Training",
    instructor: "Ahmed Al-Saeed",
    time: "18:00",
    duration: 60,
    capacity: 12,
    booked: 12,
    price: 80,
    type: 'class', 
    description: "Build muscle and strength with guided workouts",
    location: "Weight Room",
    status: 'full'
  },
  {
    id: "PT001",
    name: "Personal Training Session",
    instructor: "Lisa Rodriguez",
    time: "11:00",
    duration: 60,
    capacity: 1,
    booked: 0,
    price: 200,
    type: 'pt',
    description: "One-on-one personal training session",
    location: "PT Room 1",
    status: 'available'
  },
  {
    id: "PT002",
    name: "Nutrition Consultation",
    instructor: "Dr. Khalid Omar",
    time: "14:00",
    duration: 45,
    capacity: 1,
    booked: 0,
    price: 150,
    type: 'pt',
    description: "Personalized nutrition plan and consultation",
    location: "Consultation Room",
    status: 'available'
  },
  {
    id: "F001",
    name: "Basketball Court",
    instructor: "Facility",
    time: "16:00",
    duration: 120,
    capacity: 10,
    booked: 4,
    price: 100,
    type: 'facility',
    description: "Full basketball court rental",
    location: "Court 1",
    status: 'available'
  },
  {
    id: "F002",
    name: "Swimming Pool",
    instructor: "Facility", 
    time: "19:00",
    duration: 90,
    capacity: 8,
    booked: 6,
    price: 80,
    type: 'facility',
    description: "Private pool session",
    location: "Pool Area",
    status: 'available'
  }
];

const trialBookings: Booking[] = [
  {
    id: "B001",
    memberId: "M001",
    memberName: "Ahmed Al-Mahmoud",
    classId: "C001",
    className: "Morning Yoga Flow",
    instructor: "Sarah Johnson",
    date: "2024-10-04",
    time: "09:00",
    type: 'class',
    status: 'confirmed',
    price: 50,
    qrCode: "QR-B001-YGF-0900",
    isGuest: false,
    createdAt: "2024-10-03T15:30:00Z"
  },
  {
    id: "B002",
    memberName: "John Smith (Guest)",
    classId: "C002",
    className: "HIIT Bootcamp", 
    instructor: "Mike Chen",
    date: "2024-10-04",
    time: "10:30",
    type: 'class',
    status: 'confirmed',
    price: 75,
    qrCode: "QR-B002-HIT-1030",
    isGuest: true,
    guestDetails: {
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "+971-50-999-8888"
    },
    createdAt: "2024-10-03T16:45:00Z"
  },
  {
    id: "B003",
    memberId: "M002",
    memberName: "Fatima Al-Zahra",
    classId: "PT001",
    className: "Personal Training Session",
    instructor: "Lisa Rodriguez",
    date: "2024-10-04",
    time: "11:00",
    type: 'pt',
    status: 'confirmed',
    price: 200,
    qrCode: "QR-B003-PT-1100",
    isGuest: false,
    createdAt: "2024-10-03T14:20:00Z"
  }
];

export function Bookings({ onNavigate }: BookingsProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingType, setSelectedBookingType] = useState<'all' | 'class' | 'pt' | 'facility'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [guestDetails, setGuestDetails] = useState({ name: "", email: "", phone: "" });
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>(trialBookings);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    return trialMembers.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm)
    );
  }, [searchTerm]);

  // Filter classes based on booking type
  const filteredClasses = useMemo(() => {
    if (selectedBookingType === 'all') return trialClasses;
    return trialClasses.filter(cls => cls.type === selectedBookingType);
  }, [selectedBookingType]);

  // Today's bookings
  const todaysBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === today);
  }, [bookings]);

  const handleCreateBooking = () => {
    if (!selectedClass) {
      toast.error("Please select a class or session");
      return;
    }

    if (!isGuestBooking && !selectedMember) {
      toast.error("Please select a member");
      return;
    }

    if (isGuestBooking && (!guestDetails.name || !guestDetails.email || !guestDetails.phone)) {
      toast.error("Please fill in all guest details");
      return;
    }

    const newBooking: Booking = {
      id: `B${String(bookings.length + 1).padStart(3, '0')}`,
      memberId: isGuestBooking ? undefined : selectedMember?.id,
      memberName: isGuestBooking ? `${guestDetails.name} (Guest)` : selectedMember?.name || "",
      classId: selectedClass.id,
      className: selectedClass.name,
      instructor: selectedClass.instructor,
      date: new Date().toISOString().split('T')[0],
      time: selectedClass.time,
      type: selectedClass.type,
      status: 'confirmed',
      price: selectedClass.price,
      qrCode: `QR-${Date.now()}-${selectedClass.id}`,
      isGuest: isGuestBooking,
      guestDetails: isGuestBooking ? guestDetails : undefined,
      createdAt: new Date().toISOString()
    };

    setBookings(prev => [...prev, newBooking]);
    
    // Show QR code immediately
    setSelectedBooking(newBooking);
    setShowQRDialog(true);
    setShowBookingDialog(false);
    
    // Reset form
    setBookingStep(1);
    setSelectedMember(null);
    setSelectedClass(null);
    setIsGuestBooking(false);
    setGuestDetails({ name: "", email: "", phone: "" });
    
    toast.success(`Booking confirmed! QR code generated for ${newBooking.memberName}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'checked-in': return 'bg-green-100 text-green-800';
      case 'no-show': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return <Users className="h-4 w-4" />;
      case 'pt': return <User className="h-4 w-4" />;
      case 'facility': return <Building className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const handleStatusUpdate = (bookingId: string, newStatus: 'confirmed' | 'checked-in' | 'no-show' | 'cancelled') => {
    setBookings(prev => prev.map(booking => 
      booking.id === bookingId ? { ...booking, status: newStatus } : booking
    ));
    toast.success(`Booking status updated to ${newStatus}`);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#2B7A78' }}>
            Bookings Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage member & guest bookings with QR code access control
          </p>
        </div>
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogTrigger asChild>
            <Button className="shadow-lg" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl" style={{ color: '#2B7A78' }}>
                Create New Booking
              </DialogTitle>
              <DialogDescription>
                Create a new booking for a member or guest. Follow the step-by-step process to select the member, choose a session, and confirm the booking details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Step Progress */}
              <div className="flex items-center space-x-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      style={bookingStep >= step 
                        ? { backgroundColor: '#2B7A78', color: 'white' } 
                        : { backgroundColor: '#e5e7eb', color: '#4b5563' }
                      }
                    >
                      {step}
                    </div>
                    {step < 3 && <div className="w-12 h-1" style={{ backgroundColor: bookingStep > step ? '#2B7A78' : '#e5e7eb' }} />}
                  </div>
                ))}
              </div>

              {/* Step 1: Member Selection */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Step 1: Select Member or Guest</h3>
                  
                  <div className="flex space-x-4 mb-4">
                    <Button 
                      variant={!isGuestBooking ? "default" : "outline"}
                      onClick={() => setIsGuestBooking(false)}
                      style={!isGuestBooking ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Member
                    </Button>
                    <Button 
                      variant={isGuestBooking ? "default" : "outline"}
                      onClick={() => setIsGuestBooking(true)}
                      style={isGuestBooking ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Guest
                    </Button>
                  </div>

                  {!isGuestBooking ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search member by name, email, or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredMembers.map((member) => (
                          <div
                            key={member.id}
                            className="p-3 border rounded-lg cursor-pointer transition-all"
                            style={{
                              borderColor: selectedMember?.id === member.id ? '#2B7A78' : '#e5e7eb',
                              backgroundColor: selectedMember?.id === member.id ? '#2B7A7810' : '#ffffff'
                            }}
                            onClick={() => setSelectedMember(member)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-medium" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                                <div className="text-xs text-gray-400">{member.phone} • {member.membershipType}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guest-name">Full Name *</Label>
                          <Input
                            id="guest-name"
                            value={guestDetails.name}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter guest name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guest-email">Email *</Label>
                          <Input
                            id="guest-email"
                            type="email"
                            value={guestDetails.email}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="guest@email.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="guest-phone">WhatsApp Number *</Label>
                        <Input
                          id="guest-phone"
                          value={guestDetails.phone}
                          onChange={(e) => setGuestDetails(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+971-50-123-4567"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setBookingStep(2)}
                      disabled={!isGuestBooking ? !selectedMember : !guestDetails.name || !guestDetails.email || !guestDetails.phone}
                      style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Select Booking Type & Class */}
              {bookingStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Step 2: Choose Session</h3>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant={selectedBookingType === 'all' ? "default" : "outline"}
                      onClick={() => setSelectedBookingType('all')}
                      size="sm"
                      style={selectedBookingType === 'all' ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      All
                    </Button>
                    <Button 
                      variant={selectedBookingType === 'class' ? "default" : "outline"}
                      onClick={() => setSelectedBookingType('class')}
                      size="sm"
                      style={selectedBookingType === 'class' ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Classes
                    </Button>
                    <Button 
                      variant={selectedBookingType === 'pt' ? "default" : "outline"}
                      onClick={() => setSelectedBookingType('pt')}
                      size="sm"
                      style={selectedBookingType === 'pt' ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Personal Training
                    </Button>
                    <Button 
                      variant={selectedBookingType === 'facility' ? "default" : "outline"}
                      onClick={() => setSelectedBookingType('facility')}
                      size="sm"
                      style={selectedBookingType === 'facility' ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      <Building className="h-4 w-4 mr-1" />
                      Facility
                    </Button>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-3">
                    {filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="p-4 border rounded-lg cursor-pointer transition-all"
                        style={{
                          borderColor: selectedClass?.id === cls.id ? '#2B7A78' : cls.status === 'full' ? '#e5e7eb' : '#e5e7eb',
                          backgroundColor: selectedClass?.id === cls.id ? '#2B7A7810' : cls.status === 'full' ? '#f9fafb' : '#ffffff',
                          opacity: cls.status === 'full' ? 0.5 : 1,
                          cursor: cls.status === 'full' ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => cls.status !== 'full' && setSelectedClass(cls)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}>
                              {getTypeIcon(cls.type)}
                            </div>
                            <div>
                              <div className="font-medium flex items-center space-x-2">
                                <span>{cls.name}</span>
                                {cls.status === 'full' && <Badge variant="destructive">Full</Badge>}
                              </div>
                              <div className="text-sm text-gray-500">{cls.instructor}</div>
                              <div className="text-xs text-gray-400 flex items-center space-x-3">
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {cls.time} ({cls.duration}min)
                                </span>
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {cls.location}
                                </span>
                                <span className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {cls.booked}/{cls.capacity}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg" style={{ color: '#2B7A78' }}>{cls.price} AED</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setBookingStep(1)}>
                      Previous
                    </Button>
                    <Button 
                      onClick={() => setBookingStep(3)}
                      disabled={!selectedClass}
                      style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm Booking */}
              {bookingStep === 3 && selectedClass && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Step 3: Confirm Booking</h3>
                  
                  <Card style={{ borderColor: '#2B7A7840' }}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Booking for:</span>
                          <span className="font-medium">
                            {isGuestBooking ? `${guestDetails.name} (Guest)` : selectedMember?.name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Session:</span>
                          <span className="font-medium">{selectedClass.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Instructor:</span>
                          <span className="font-medium">{selectedClass.instructor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Date & Time:</span>
                          <span className="font-medium">Today, {selectedClass.time}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Location:</span>
                          <span className="font-medium">{selectedClass.location}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-3">
                          <span className="font-medium">Total Amount:</span>
                          <span className="text-xl font-bold" style={{ color: '#2B7A78' }}>{selectedClass.price} AED</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#2B7A7810' }}>
                    <div className="flex items-start space-x-3">
                      <QrCode className="h-5 w-5 mt-1" style={{ color: '#2B7A78' }} />
                      <div className="text-sm">
                        <p className="font-medium" style={{ color: '#2B7A78' }}>QR Code Access</p>
                        <p className="text-gray-600 mt-1">
                          {isGuestBooking 
                            ? "QR code will be sent via WhatsApp and email for facility access"
                            : "QR code will be generated for face recognition system validation"
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setBookingStep(2)}>
                      Previous
                    </Button>
                    <Button onClick={handleCreateBooking} style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}>
                      Confirm Booking
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border" style={{ borderColor: '#2B7A7820' }}>
          <TabsTrigger value="dashboard" className="data-[state=active]:text-white" style={{ '--active-bg': '#2B7A78' } as React.CSSProperties}>
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="classes" className="data-[state=active]:text-white" style={{ '--active-bg': '#2B7A78' } as React.CSSProperties}>
            Available Sessions
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:text-white" style={{ '--active-bg': '#2B7A78' } as React.CSSProperties}>
            All Bookings
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Row 1: Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="overflow-hidden relative" style={{ borderColor: '#2B7A7820' }}>
              <div className="absolute inset-0 opacity-95" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      {todaysBookings.length}
                      <span className="text-lg ml-2 opacity-80">
                        ↗ +2
                      </span>
                    </div>
                    <div className="text-white/90 font-medium">Today's Bookings</div>
                  </div>
                  <Calendar className="h-8 w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative" style={{ borderColor: '#2B7A7820' }}>
              <div className="absolute inset-0 opacity-95" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      {bookings.filter(b => b.date === "2024-10-05").length + 4}
                      <span className="text-lg ml-2 opacity-80">
                        ↗ +1
                      </span>
                    </div>
                    <div className="text-white/90 font-medium">Upcoming 24h</div>
                  </div>
                  <Clock className="h-8 w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative" style={{ borderColor: '#2B7A7820' }}>
              <div className="absolute inset-0 opacity-95" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      {bookings.filter(b => b.isGuest).length}
                      <span className="text-lg ml-2 opacity-80">
                        ↗ +1
                      </span>
                    </div>
                    <div className="text-white/90 font-medium">Guest Bookings</div>
                  </div>
                  <UserPlus className="h-8 w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative" style={{ borderColor: '#2B7A7820' }}>
              <div className="absolute inset-0 opacity-95" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      {bookings.filter(b => b.status === 'cancelled' || b.status === 'no-show').length}
                      <span className="text-lg ml-2 opacity-80">
                        ↓ -1
                      </span>
                    </div>
                    <div className="text-white/90 font-medium">Cancelled / No-Show</div>
                  </div>
                  <AlertCircle className="h-8 w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Quick Actions */}
          <Card style={{ borderColor: '#2B7A7820' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{ color: '#2B7A78' }}>
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  className="h-20 flex-col space-y-2"
                  style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                  onClick={() => {
                    setShowBookingDialog(true);
                    setBookingStep(1);
                    setIsGuestBooking(false);
                  }}
                >
                  <Plus className="h-6 w-6" />
                  <span>New Booking</span>
                </Button>
                
                <Button 
                  className="h-20 flex-col space-y-2"
                  style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                  onClick={() => {
                    setSelectedBookingType('class');
                    setActiveTab('classes');
                  }}
                >
                  <Users className="h-6 w-6" />
                  <span>Book Class</span>
                </Button>
                
                <Button 
                  className="h-20 flex-col space-y-2"
                  style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                  onClick={() => {
                    setShowBookingDialog(true);
                    setBookingStep(1);
                    setIsGuestBooking(true);
                  }}
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Guest Booking</span>
                </Button>
                
                <Button 
                  className="h-20 flex-col space-y-2"
                  style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                  onClick={() => {
                    setSelectedBookingType('facility');
                    setActiveTab('classes');
                  }}
                >
                  <Building className="h-6 w-6" />
                  <span>Facility</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Upcoming Bookings Timeline */}
          <Card style={{ borderColor: '#2B7A7820' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{ color: '#2B7A78' }}>
                <Clock className="h-5 w-5" />
                <span>Upcoming Bookings Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaysBookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2B7A7820' }}>
                    <Calendar className="h-12 w-12" style={{ color: '#2B7A78' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#1E293B' }}>No bookings scheduled</h3>
                  <p className="text-gray-500 mb-6">Get started by creating your first booking</p>
                  <Button 
                    style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                    onClick={() => {
                      setShowBookingDialog(true);
                      setBookingStep(1);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Booking Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex overflow-x-auto pb-4 space-x-4">
                    {todaysBookings.map((booking, index) => (
                      <div 
                        key={booking.id} 
                        className="flex-shrink-0 w-72 p-4 rounded-lg border-l-4"
                        style={{
                          borderLeftColor: booking.type === 'class' ? '#2B7A78' : booking.type === 'pt' ? '#2B7A78' : '#2B7A78',
                          backgroundColor: booking.type === 'class' ? '#F0F9FF' : booking.type === 'pt' ? '#F0FDF4' : '#F0FDFA'
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-gray-600">{booking.time}</span>
                          <Badge className={getStatusColor(booking.status)} variant="secondary">
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{booking.memberName}</div>
                          <div className="text-sm text-gray-600">{booking.className}</div>
                          <div className="flex items-center text-xs text-gray-500">
                            {getTypeIcon(booking.type)}
                            <span className="ml-1 capitalize">{booking.type}</span>
                            <span className="mx-2">•</span>
                            <span>{booking.instructor}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 4: Facility Utilization & Bookings Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facility Utilization Panel */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-primary flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Facility Utilization</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Studio A', usage: 75, nextBooking: '10:00 AM - Yoga Flow', type: 'class' },
                    { name: 'Main Gym', usage: 60, nextBooking: '11:30 AM - HIIT', type: 'class' },
                    { name: 'Pool Area', usage: 45, nextBooking: '7:00 PM - Swimming', type: 'facility' },
                    { name: 'PT Room 1', usage: 85, nextBooking: '2:00 PM - Personal Training', type: 'pt' },
                    { name: 'Basketball Court', usage: 30, nextBooking: '4:00 PM - Court Rental', type: 'facility' }
                  ].map((facility) => (
                    <div key={facility.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">{facility.name}</span>
                        <span className="text-sm text-gray-500">{facility.usage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            facility.type === 'class' ? 'bg-gradient-to-r from-teal-400 to-teal-600' :
                            facility.type === 'pt' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                            'bg-gradient-to-r from-cyan-400 to-cyan-600'
                          }`}
                          style={{ width: `${facility.usage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Next: {facility.nextBooking}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bookings Distribution Panel */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-primary flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Bookings Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Visual Distribution Bar */}
                  <div className="space-y-4">
                    <div className="flex w-full h-8 rounded-lg overflow-hidden">
                      <div className="bg-teal-500 flex-1" style={{ flex: bookings.filter(b => b.type === 'class').length }}></div>
                      <div className="bg-blue-500 flex-1" style={{ flex: bookings.filter(b => b.type === 'pt').length }}></div>
                      <div className="bg-cyan-500 flex-1" style={{ flex: bookings.filter(b => b.type === 'facility').length }}></div>
                    </div>
                    
                    {/* Legend */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-teal-500 rounded"></div>
                          <span className="text-sm font-medium">Group Classes</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {bookings.filter(b => b.type === 'class').length} ({Math.round((bookings.filter(b => b.type === 'class').length / bookings.length) * 100)}%)
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span className="text-sm font-medium">Personal Training</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {bookings.filter(b => b.type === 'pt').length} ({Math.round((bookings.filter(b => b.type === 'pt').length / bookings.length) * 100)}%)
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                          <span className="text-sm font-medium">Facility Bookings</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {bookings.filter(b => b.type === 'facility').length} ({Math.round((bookings.filter(b => b.type === 'facility').length / bookings.length) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section: Alerts & Notifications */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Alerts & Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample Alerts */}
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-yellow-800">Guest booking confirmation pending</div>
                    <div className="text-sm text-yellow-600">John Smith's HIIT Bootcamp booking needs WhatsApp confirmation</div>
                  </div>
                  <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-green-800">QR code sent successfully</div>
                    <div className="text-sm text-green-600">Ahmed Al-Mahmoud received booking confirmation via WhatsApp</div>
                  </div>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    2 min ago
                  </span>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-800">High demand alert</div>
                    <div className="text-sm text-blue-600">Strength Training class is 100% booked. Consider adding another session.</div>
                  </div>
                  <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Session
                  </Button>
                </div>

                {bookings.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No alerts at this time. All bookings are running smoothly! ✅
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Available Sessions Tab */}
        <TabsContent value="classes" className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sessions..."
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="class">Group Classes</SelectItem>
                <SelectItem value="pt">Personal Training</SelectItem>
                <SelectItem value="facility">Facility Booking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trialClasses.map((cls) => (
              <Card key={cls.id} className={`border-primary/10 transition-all hover:shadow-md ${cls.status === 'full' ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary text-white flex items-center justify-center">
                        {getTypeIcon(cls.type)}
                      </div>
                      <Badge variant={cls.status === 'available' ? 'default' : 'destructive'}>
                        {cls.status}
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{cls.name}</h3>
                      <p className="text-sm text-gray-600">{cls.instructor}</p>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {cls.time} ({cls.duration} minutes)
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {cls.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {cls.booked}/{cls.capacity} participants
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xl font-bold text-primary">{cls.price} AED</span>
                      <Button 
                        size="sm" 
                        className="btn-primary"
                        disabled={cls.status === 'full'}
                        onClick={() => {
                          setSelectedClass(cls);
                          setShowBookingDialog(true);
                          setBookingStep(1);
                        }}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* All Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-primary/10">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-light">
                    <tr>
                      <th className="text-left p-4 font-medium text-primary">Member</th>
                      <th className="text-left p-4 font-medium text-primary">Session</th>
                      <th className="text-left p-4 font-medium text-primary">Date & Time</th>
                      <th className="text-left p-4 font-medium text-primary">Type</th>
                      <th className="text-left p-4 font-medium text-primary">Price</th>
                      <th className="text-left p-4 font-medium text-primary">Status</th>
                      <th className="text-left p-4 font-medium text-primary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-primary text-white flex items-center justify-center text-xs font-medium">
                              {booking.memberName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium">{booking.memberName}</div>
                              {booking.isGuest && (
                                <div className="text-xs text-gray-500">Guest Booking</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{booking.className}</div>
                            <div className="text-sm text-gray-500">{booking.instructor}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{booking.date}</div>
                            <div className="text-sm text-gray-500">{booking.time}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1">
                            {getTypeIcon(booking.type)}
                            <span className="capitalize">{booking.type}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-primary">{booking.price} AED</span>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowQRDialog(true);
                              }}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(booking.id, 'checked-in')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center bg-gradient-primary bg-clip-text text-transparent">
              Booking Confirmation
            </DialogTitle>
            <DialogDescription className="text-center">
              Your booking has been confirmed. Use the QR code below for facility access during your scheduled session time.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              <Card className="border-primary/20">
                <CardContent className="p-4 text-center">
                  <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-6xl">
                      <QrCode className="h-24 w-24 text-primary" />
                    </div>
                  </div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                    {selectedBooking.qrCode}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member:</span>
                  <span className="font-medium">{selectedBooking.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Session:</span>
                  <span className="font-medium">{selectedBooking.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{selectedBooking.date} at {selectedBooking.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valid:</span>
                  <span className="font-medium text-green-600">Session time only</span>
                </div>
              </div>

              <div className="bg-gradient-light p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-1" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">Access Instructions</p>
                    <p className="text-gray-600 mt-1">
                      {selectedBooking.isGuest 
                        ? "QR code sent via WhatsApp and email. Show this code at reception for entry."
                        : "Face recognition system will validate this booking automatically. QR code is backup access."
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send WhatsApp
                </Button>
                <Button variant="outline" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          className="fab"
          onClick={() => {
            setShowBookingDialog(true);
            setBookingStep(1);
          }}
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>
      </div>
    </div>
  );
}

