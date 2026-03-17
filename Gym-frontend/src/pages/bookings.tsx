import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar as CalendarIcon, Clock, Users, MapPin, QrCode, Plus, Search, Filter, CheckCircle, AlertCircle, User, UserPlus, Calendar, Dumbbell, Building, Phone, Mail, MessageSquare, Download, RotateCcw, Eye, Edit3, X, Zap, PieChart, ArrowRight } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { membersService } from "../utils/supabase/members-service";
import { trainingService, TrainingSessionApi } from "../utils/supabase/training-service";
import { bookingService, BookingApi } from "../utils/supabase/booking-service";

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
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  capacity: number;
  booked: number;
  price: number;
  type: 'class' | 'pt' | 'facility';
  description: string;
  location: string;
  status: 'active' | 'cancelled';
}

interface Booking {
  id: string;
  memberId?: string;
  memberName: string;
  memberAvatar?: string;
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


export function Bookings({ onNavigate }: BookingsProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [selectedBookingType, setSelectedBookingType] = useState<'all' | 'class' | 'pt' | 'facility'>('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'confirmed' | 'checked-in' | 'no-show' | 'cancelled'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [guestDetails, setGuestDetails] = useState({ name: "", email: "", phone: "" });
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<ClassSchedule[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoToView, setPhotoToView] = useState<{ url: string; name: string } | null>(null);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const formatTime = (value?: string | null) => {
    if (!value) return "";
    return value.length >= 5 ? value.slice(0, 5) : value;
  };

  const mapSession = (session: TrainingSessionApi): ClassSchedule => {
    const startTime = formatTime(session.startTime);
    const endTime = formatTime(session.endTime);
    let duration = session.durationMinutes ?? 0;
    if (!duration && startTime && endTime) {
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end = new Date(`1970-01-01T${endTime}:00`);
      duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    }

    return {
      id: session.id,
      name: session.name,
      instructor: session.trainerName || "Trainer",
      date: session.date,
      startTime,
      endTime,
      duration,
      capacity: Number(session.capacity ?? 0),
      booked: Number(session.booked ?? 0),
      price: Number(session.price ?? 0),
      type: session.type,
      description: session.description || "",
      location: session.location || "",
      status: (session.status as ClassSchedule["status"]) || "active"
    };
  };

  const mapBooking = (booking: BookingApi): Booking => ({
    id: booking.id,
    memberId: booking.memberId || undefined,
    memberName: booking.memberName || booking.guestName || "Guest",
    memberAvatar: booking.memberId
      ? members.find((member) => member.id === booking.memberId)?.avatar
      : undefined,
    classId: booking.sessionId || "",
    className: booking.sessionName || "",
    instructor: booking.trainerName || "Trainer",
    date: booking.date || "",
    time: formatTime(booking.startTime),
    type: (booking.type as Booking["type"]) || "class",
    status: (booking.status as Booking["status"]) || "confirmed",
    price: Number(booking.price ?? 0),
    qrCode: booking.qrCode || "",
    isGuest: Boolean(booking.guest),
    guestDetails: booking.guest ? {
      name: booking.guestName || "",
      email: booking.guestEmail || "",
      phone: booking.guestPhone || ""
    } : undefined,
    createdAt: booking.createdAt || ""
  });

  const getAvailability = (session: ClassSchedule) => {
    if (session.status === "cancelled") return "cancelled";
    if (session.capacity > 0 && session.booked >= session.capacity) return "full";
    return "available";
  };

  const fetchSessions = async () => {
    const data = await trainingService.getSessions();
    setSessions(data.map(mapSession));
  };

  const fetchBookings = async (memberList: Member[]) => {
    const data = await bookingService.getBookings();
    const mapped = data.map((booking) => ({
      ...mapBooking(booking),
      memberAvatar: booking.memberId
        ? memberList.find((member) => member.id === booking.memberId)?.avatar
        : undefined,
    }));
    setBookings(mapped);
  };

  const fetchMembers = async () => {
    const result = await membersService.getMembers({}, { limit: 200 });
    const mapped = result.members.map((member: any) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      membershipType: member.membership_plan || member.membership_type || member.membershipType || "Member",
      avatar: member.photo_url || member.photoUrl || undefined
    }));
    setMembers(mapped);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const result = await membersService.getMembers({}, { limit: 200 });
        const mappedMembers = result.members.map((member: any) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          membershipType: member.membership_plan || member.membership_type || member.membershipType || "Member",
          avatar: member.photo_url || member.photoUrl || undefined
        }));
        setMembers(mappedMembers);
        await Promise.all([fetchSessions(), fetchBookings(mappedMembers)]);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load bookings data");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (members.length) {
      fetchBookings(members);
    }
  }, [members]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    return members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm)
    );
  }, [members, searchTerm]);

  // Filter classes based on booking type
  const filteredClasses = useMemo(() => {
    const base = selectedBookingType === 'all'
      ? sessions
      : sessions.filter(cls => cls.type === selectedBookingType);
    if (!sessionSearchTerm) return base;
    const lowered = sessionSearchTerm.toLowerCase();
    return base.filter(cls =>
      cls.name.toLowerCase().includes(lowered) ||
      cls.instructor.toLowerCase().includes(lowered) ||
      cls.location.toLowerCase().includes(lowered)
    );
  }, [selectedBookingType, sessions, sessionSearchTerm]);

  const filteredBookings = useMemo(() => {
    const base = bookingStatusFilter === 'all'
      ? bookings
      : bookings.filter(booking => booking.status === bookingStatusFilter);
    if (!bookingSearchTerm) return base;
    const lowered = bookingSearchTerm.toLowerCase();
    return base.filter(booking =>
      booking.memberName.toLowerCase().includes(lowered) ||
      booking.className.toLowerCase().includes(lowered) ||
      booking.instructor.toLowerCase().includes(lowered) ||
      booking.type.toLowerCase().includes(lowered) ||
      booking.status.toLowerCase().includes(lowered) ||
      booking.date.toLowerCase().includes(lowered)
    );
  }, [bookings, bookingSearchTerm, bookingStatusFilter]);

  // Today's bookings
  const todaysBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === today);
  }, [bookings]);

  const upcomingBookings = bookings.filter(b => b.date > new Date().toISOString().split('T')[0]).length;
  const guestBookings = bookings.filter(b => b.isGuest).length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'no-show').length;

  const handleCreateBooking = async () => {
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

    try {
      const created = await bookingService.createBooking({
        sessionId: Number(selectedClass.id),
        memberId: isGuestBooking ? undefined : Number(selectedMember?.id),
        guestName: isGuestBooking ? guestDetails.name : undefined,
        guestEmail: isGuestBooking ? guestDetails.email : undefined,
        guestPhone: isGuestBooking ? guestDetails.phone : undefined
      });

      const mapped = mapBooking(created);
      await Promise.all([fetchSessions(), fetchBookings(members)]);

      setSelectedBooking(mapped);
      setShowQRDialog(true);
      setShowBookingDialog(false);

      setBookingStep(1);
      setSelectedMember(null);
      setSelectedClass(null);
      setIsGuestBooking(false);
      setGuestDetails({ name: "", email: "", phone: "" });

      toast.success(`Booking confirmed! QR code generated for ${mapped.memberName}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create booking");
    }
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

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'class':
        return { label: 'Class', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'pt':
        return { label: 'PT', icon: Dumbbell, color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'facility':
        return { label: 'Facility', icon: Building, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      default:
        return { label: 'Session', icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: 'confirmed' | 'checked-in' | 'no-show' | 'cancelled') => {
    try {
      await bookingService.updateStatus(bookingId, newStatus);
      await fetchBookings();
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update booking");
    }
  };

  const handleDeleteBooking = (booking: Booking) => {
    setBookingToDelete(booking);
    setShowDeleteDialog(true);
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowQRDialog(true);
  };

  const handleViewPhoto = (url: string, name: string) => {
    setPhotoToView({ url, name });
    setShowPhotoDialog(true);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      await bookingService.deleteBooking(bookingToDelete.id);
      await Promise.all([fetchBookings(members), fetchSessions()]);
      toast.success("Booking deleted");
      if (selectedBooking?.id === bookingToDelete.id) {
        setShowQRDialog(false);
        setSelectedBooking(null);
      }
      setShowDeleteDialog(false);
      setBookingToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete booking");
    }
  };

  const buildQrPayload = (booking: Booking) => {
    const lines = [
      "GYMBIOS_BOOKING",
      `Booking ID: ${booking.id}`,
      `Member: ${booking.memberName}`,
      `Session: ${booking.className}`,
      `Trainer: ${booking.instructor}`,
      `Date: ${booking.date}`,
      `Time: ${booking.time}`,
      `Type: ${booking.type}`,
      `Status: ${booking.status}`,
      `Price: ${booking.price} AED`,
      `Code: ${booking.qrCode || booking.id}`,
    ];
    if (booking.isGuest && booking.guestDetails) {
      lines.push(`Guest: ${booking.guestDetails.name}`);
      lines.push(`Guest Email: ${booking.guestDetails.email}`);
      lines.push(`Guest Phone: ${booking.guestDetails.phone}`);
    }
    return lines.join("\n");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage member & guest bookings with QR code access control
          </p>
        </div>
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogTrigger asChild>
            <Button className="shadow-lg">
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
                    {filteredClasses.map((cls) => {
                      const availability = getAvailability(cls);
                      const isFull = availability !== "available";
                      return (
                      <div
                        key={cls.id}
                        className="p-4 border rounded-lg cursor-pointer transition-all"
                        style={{
                          borderColor: selectedClass?.id === cls.id ? '#2B7A78' : '#e5e7eb',
                          backgroundColor: selectedClass?.id === cls.id ? '#2B7A7810' : isFull ? '#f9fafb' : '#ffffff',
                          opacity: isFull ? 0.5 : 1,
                          cursor: isFull ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => !isFull && setSelectedClass(cls)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}>
                              {getTypeIcon(cls.type)}
                            </div>
                            <div>
                              <div className="font-medium flex items-center space-x-2">
                                <span>{cls.name}</span>
                                {isFull && <Badge variant="destructive">Full</Badge>}
                              </div>
                              <div className="text-sm text-gray-500">{cls.instructor}</div>
                              <div className="text-xs text-gray-400 flex items-center space-x-3">
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {cls.startTime} ({cls.duration}min)
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
                      );
                    })}
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
                          <span className="font-medium">{selectedClass.date} {selectedClass.startTime}</span>
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
      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="dashboard" className="flex-1">Dashboard</TabsTrigger>
          <TabsTrigger value="classes" className="flex-1">Available Sessions</TabsTrigger>
          <TabsTrigger value="bookings" className="flex-1">All Bookings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">          {/* Row 1: Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Today&apos;s Bookings</CardTitle>
                <div className="bg-gradient-light p-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{todaysBookings.length}</div>
                <p className="text-xs text-muted-foreground">Bookings scheduled today</p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Upcoming</CardTitle>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{upcomingBookings}</div>
                <p className="text-xs text-muted-foreground">Future bookings</p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Guest Bookings</CardTitle>
                <div className="bg-amber-50 p-2 rounded-lg">
                  <UserPlus className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{guestBookings}</div>
                <p className="text-xs text-muted-foreground">Guests scheduled</p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Cancelled / No-Show</CardTitle>
                <div className="bg-red-50 p-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{cancelledBookings}</div>
                <p className="text-xs text-muted-foreground">Issues to review</p>
              </CardContent>
            </Card>
          </div>

                    {/* Row 2: Quick Actions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-primary">
              <Zap className="h-5 w-5" />
              <span>Quick Actions</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
                className={`${cardShell} group cursor-pointer border-dashed border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setShowBookingDialog(true);
                  setBookingStep(1);
                  setIsGuestBooking(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setShowBookingDialog(true);
                    setBookingStep(1);
                    setIsGuestBooking(false);
                  }
                }}
              >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">New Booking</CardTitle>
                <div className="bg-gradient-light p-2 rounded-lg">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Create a member booking quickly</p>
                <div className="mt-3 flex items-center text-xs text-primary">
                  <span>Open action</span>
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>

              <Card
                className={`${cardShell} group cursor-pointer border-dashed border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedBookingType('class');
                  setActiveTab('classes');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedBookingType('class');
                    setActiveTab('classes');
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Book Class</CardTitle>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Browse available sessions</p>
                  <div className="mt-3 flex items-center text-xs text-primary">
                    <span>Open action</span>
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${cardShell} group cursor-pointer border-dashed border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setShowBookingDialog(true);
                  setBookingStep(1);
                  setIsGuestBooking(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setShowBookingDialog(true);
                    setBookingStep(1);
                    setIsGuestBooking(true);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Guest Booking</CardTitle>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <UserPlus className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Add a guest visit booking</p>
                  <div className="mt-3 flex items-center text-xs text-primary">
                    <span>Open action</span>
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`${cardShell} group cursor-pointer border-dashed border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/30`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedBookingType('facility');
                  setActiveTab('classes');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedBookingType('facility');
                    setActiveTab('classes');
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Facility</CardTitle>
                  <div className="bg-green-50 p-2 rounded-lg">
                    <Building className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Reserve courts or facilities</p>
                  <div className="mt-3 flex items-center text-xs text-primary">
                    <span>Open action</span>
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

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
                          {bookings.filter(b => b.type === 'class').length} ({bookings.length ? Math.round((bookings.filter(b => b.type === 'class').length / bookings.length) * 100) : 0}%)
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span className="text-sm font-medium">Personal Training</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {bookings.filter(b => b.type === 'pt').length} ({bookings.length ? Math.round((bookings.filter(b => b.type === 'pt').length / bookings.length) * 100) : 0}%)
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                          <span className="text-sm font-medium">Facility Bookings</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {bookings.filter(b => b.type === 'facility').length} ({bookings.length ? Math.round((bookings.filter(b => b.type === 'facility').length / bookings.length) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section: Alerts & Notifications */}
          <Card className="border-primary/10 overflow-hidden">
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
                    <div className="inline-flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>No alerts at this time. All bookings are running smoothly.</span>
                    </div>
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
                value={sessionSearchTerm}
                onChange={(e) => setSessionSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedBookingType} onValueChange={(value) => setSelectedBookingType(value as 'all' | 'class' | 'pt' | 'facility')}>
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
            <Button
              variant="outline"
              onClick={() => {
                if (onNavigate) {
                  onNavigate("trainings-classes");
                } else {
                  window.location.href = "/trainings-classes";
                }
              }}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredClasses.map((cls) => {
              const typeMeta = getTypeMeta(cls.type);
              const TypeIcon = typeMeta.icon;
              const availability = getAvailability(cls);
              const isFull = availability !== "available";
              return (
              <Card key={cls.id} className={`border-primary/10 transition-all hover:shadow-md ${isFull ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-lg ${typeMeta.bg} flex items-center justify-center`}>
                        <TypeIcon className={`h-5 w-5 ${typeMeta.color}`} />
                      </div>
                      <Badge className={
                        availability === 'available'
                          ? 'bg-green-100 text-green-700'
                          : availability === 'full'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }>
                        {availability}
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{cls.name}</h3>
                      <p className="text-sm text-gray-600">{cls.instructor}</p>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-blue-600" />
                        {cls.startTime} ({cls.duration} minutes)
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-amber-600" />
                        {cls.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-emerald-600" />
                        {cls.booked}/{cls.capacity} participants
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xl font-bold text-primary">{cls.price} AED</span>
                      <Button 
                        size="sm" 
                        className="btn-primary"
                        disabled={isFull}
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
              );
            })}
            {filteredClasses.length === 0 && (
              <div className="col-span-full text-center text-sm text-gray-500 py-10">
                No sessions found. Create a new session in Trainings & Classes.
              </div>
            )}
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
                value={bookingSearchTerm}
                onChange={(e) => setBookingSearchTerm(e.target.value)}
              />
            </div>
            <Select value={bookingStatusFilter} onValueChange={(value) => setBookingStatusFilter(value as 'all' | 'confirmed' | 'checked-in' | 'no-show' | 'cancelled')}>
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

          <Card className="border-primary/10 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead className="bg-gradient-light">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Member</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Session</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Date & Time</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Price</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-primary text-white flex items-center justify-center text-[10px] font-medium overflow-hidden">
                              {booking.memberAvatar ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewPhoto(booking.memberAvatar!, booking.memberName)}
                                  className="h-full w-full focus:outline-none"
                                  title="View photo"
                                >
                                  <img
                                    src={booking.memberAvatar}
                                    alt={booking.memberName}
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ) : (
                                booking.memberName.split(' ').map(n => n[0]).join('')
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{booking.memberName}</div>
                              {booking.isGuest && (
                                <div className="text-[11px] text-gray-500">Guest Booking</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <div className="text-sm font-medium">{booking.className}</div>
                            <div className="text-xs text-gray-500">{booking.instructor}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <div className="text-sm font-medium">{booking.date}</div>
                            <div className="text-xs text-gray-500">{booking.time}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center space-x-1 text-sm">
                            {getTypeIcon(booking.type)}
                            <span className="capitalize">{booking.type}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-medium text-primary">{booking.price} AED</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`${getStatusColor(booking.status)} text-xs`}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => handleViewBooking(booking)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => handleStatusUpdate(booking.id, 'checked-in')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDeleteBooking(booking)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">
                          No bookings match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
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
                    <QRCode
                      value={buildQrPayload(selectedBooking)}
                      size={176}
                      bgColor="#FFFFFF"
                      fgColor="#1f2937"
                      level="M"
                    />
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

      {/* Delete Booking Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) {
            setBookingToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
              Delete Booking
            </DialogTitle>
            <DialogDescription className="text-center">
              This action cannot be undone. The booking will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          {bookingToDelete && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm">
                <div className="font-medium text-gray-900">{bookingToDelete.memberName}</div>
                <div className="text-gray-600">{bookingToDelete.className}</div>
                <div className="text-xs text-gray-500">
                  {bookingToDelete.date} at {bookingToDelete.time}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
                  onClick={handleConfirmDeleteBooking}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Photo Dialog */}
      <Dialog
        open={showPhotoDialog}
        onOpenChange={(open) => {
          setShowPhotoDialog(open);
          if (!open) {
            setPhotoToView(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
              Member Photo
            </DialogTitle>
            <DialogDescription className="text-center">
              {photoToView?.name}
            </DialogDescription>
          </DialogHeader>
          {photoToView && (
            <div className="flex justify-center">
              <img
                src={photoToView.url}
                alt={photoToView.name}
                className="max-h-[420px] w-auto rounded-lg border border-primary/10 object-contain"
              />
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






