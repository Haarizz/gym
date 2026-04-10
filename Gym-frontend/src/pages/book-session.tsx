import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Calendar,
  Clock,
  User,
  Users,
  Star,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  MapPin,
  DollarSign,
  CreditCard,
  Wallet,
  CalendarDays,
  Filter,
  Search,
  Heart,
  Award,
  TrendingUp,
  Activity,
  Dumbbell,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Mock data for trainers (fallback if API has no trainers yet)
const trainers = [
  {
    id: 1,
    name: "Ahmed Al-Rashid",
    photo: "/avatars/trainer1.jpg",
    specialization: "Strength & Conditioning",
    rating: 4.9,
    sessionsCompleted: 450,
    availableToday: 5,
    certifications: ["NASM-CPT", "Strength Coach"],
    bio: "10+ years experience in athletic performance",
    price: 150
  },
  {
    id: 2,
    name: "Sarah Mitchell",
    photo: "/avatars/trainer2.jpg",
    specialization: "Yoga & Flexibility",
    rating: 4.8,
    sessionsCompleted: 320,
    availableToday: 3,
    certifications: ["RYT-500", "Pilates"],
    bio: "Certified yoga instructor specializing in recovery",
    price: 120
  },
  {
    id: 3,
    name: "Marcus Johnson",
    photo: "/avatars/trainer3.jpg",
    specialization: "CrossFit & HIIT",
    rating: 4.9,
    sessionsCompleted: 380,
    availableToday: 4,
    certifications: ["CrossFit L2", "HIIT Specialist"],
    bio: "Former athlete, intense functional training",
    price: 140
  },
  {
    id: 4,
    name: "Fatima Hassan",
    photo: "/avatars/trainer4.jpg",
    specialization: "Weight Loss & Cardio",
    rating: 4.7,
    sessionsCompleted: 290,
    availableToday: 6,
    certifications: ["ACE-CPT", "Nutrition Coach"],
    bio: "Holistic approach to fitness and wellness",
    price: 130
  },
  {
    id: 5,
    name: "David Chen",
    photo: "/avatars/trainer5.jpg",
    specialization: "Sports Rehabilitation",
    rating: 4.9,
    sessionsCompleted: 410,
    availableToday: 2,
    certifications: ["DPT", "Sports Med"],
    bio: "Physical therapist and rehab specialist",
    price: 180
  }
];

// Training types
const trainingTypes = [
  {
    id: 'personal',
    icon: User,
    name: 'Personal Training',
    description: 'One-on-one focused training with certified trainers',
    duration: '60 min',
    popular: true
  },
  {
    id: 'group',
    icon: Users,
    name: 'Group Training',
    description: 'Small group sessions for motivation and community',
    duration: '45-60 min',
    popular: true
  },
  {
    id: 'yoga',
    icon: Activity,
    name: 'Yoga & Pilates',
    description: 'Mind-body connection and flexibility training',
    duration: '60 min',
    popular: false
  },
  {
    id: 'crossfit',
    icon: Dumbbell,
    name: 'CrossFit',
    description: 'High-intensity functional fitness workouts',
    duration: '60 min',
    popular: true
  },
  {
    id: 'rehab',
    icon: Heart,
    name: 'Rehabilitation',
    description: 'Recovery and injury prevention programs',
    duration: '45 min',
    popular: false
  },
  {
    id: 'hiit',
    icon: Zap,
    name: 'HIIT Sessions',
    description: 'Maximum calorie burn in minimum time',
    duration: '30-45 min',
    popular: true
  }
];

// Generate time slots
const generateTimeSlots = () => {
  const slots = [];
  const hours = [6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20];
  
  hours.forEach(hour => {
    slots.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      available: Math.random() > 0.3,
      capacity: Math.floor(Math.random() * 8) + 2,
      booked: Math.floor(Math.random() * 5)
    });
  });
  
  return slots;
};

// Generate dates for the week
const generateWeekDates = (startDate: Date) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Member's booked sessions
const myBookedSessions = [
  {
    id: 1,
    trainer: "Ahmed Al-Rashid",
    trainerPhoto: "/avatars/trainer1.jpg",
    type: "Personal Training",
    date: "2026-01-22",
    time: "18:00",
    duration: 60,
    status: "Confirmed",
    location: "Studio A",
    price: 150,
    paymentMethod: "Membership Credit"
  },
  {
    id: 2,
    trainer: "Sarah Mitchell",
    trainerPhoto: "/avatars/trainer2.jpg",
    type: "Yoga & Flexibility",
    date: "2026-01-23",
    time: "07:00",
    duration: 60,
    status: "Confirmed",
    location: "Yoga Room",
    price: 120,
    paymentMethod: "Wallet"
  },
  {
    id: 3,
    trainer: "Marcus Johnson",
    trainerPhoto: "/avatars/trainer3.jpg",
    type: "CrossFit",
    date: "2026-01-18",
    time: "17:00",
    duration: 60,
    status: "Completed",
    location: "CrossFit Zone",
    price: 140,
    paymentMethod: "Card",
    attended: true
  },
  {
    id: 4,
    trainer: "David Chen",
    trainerPhoto: "/avatars/trainer5.jpg",
    type: "Rehabilitation",
    date: "2026-01-15",
    time: "16:00",
    duration: 45,
    status: "Cancelled",
    location: "Rehab Room",
    price: 180,
    paymentMethod: "Refunded"
  }
];

interface BookSessionProps {
  onNavigate?: (section: string) => void;
}

export function BookSession({ onNavigate }: BookSessionProps = {}) {
  const location = useLocation();
  const navMemberId: number | null = (location.state as any)?.memberId ?? null;

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('membership');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [viewMode, setViewMode] = useState<'book' | 'sessions'>('book');
  const [sessionFilter, setSessionFilter] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Real data state
  const [realTrainers, setRealTrainers] = useState<any[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [realSessions, setRealSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [memberDbId, setMemberDbId] = useState<number | null>(navMemberId);

  const weekDates = generateWeekDates(new Date(Date.now() + weekOffset * 7 * 86400000));

  // Resolve the member's DB id (for bookings)
  useEffect(() => {
    if (navMemberId) { setMemberDbId(navMemberId); return; }
    const token = sessionStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/members/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setMemberDbId(Number(d.id)); })
      .catch(() => {});
  }, [navMemberId]);

  // Fetch trainers from /api/staff?role=Trainer
  const fetchTrainers = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setTrainersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/staff?role=Trainer&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items: any[] = data.items ?? data.staff ?? data.members ?? [];
      setRealTrainers(items.map(s => ({
        id: s.id,
        name: s.name ?? "Trainer",
        photo: s.photoUrl ?? s.photo_url ?? null,
        specialization: s.department ?? s.role ?? "Training",
        rating: null,
        sessionsCompleted: null,
        certifications: (s.certifications ?? []).map((c: any) => c.certName ?? c),
        bio: "",
        price: null,
        schedule: s.schedule ?? {},
      })));
    } catch {
      // fall back to mock trainers if API has none
      setRealTrainers(trainers);
    } finally {
      setTrainersLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  // Fetch sessions for selected trainer + date
  const fetchSessions = useCallback(async (trainerId: any, date: Date) => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setSessionsLoading(true);
    const dateStr = date.toISOString().slice(0, 10);
    try {
      const url = `${API_BASE}/sessions?trainerId=${trainerId}&startDate=${dateStr}&endDate=${dateStr}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items: any[] = Array.isArray(data) ? data : (data.sessions ?? data.content ?? data.items ?? []);
      setRealSessions(items);
    } catch {
      setRealSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Re-fetch sessions when trainer or date changes (only if on step 3)
  useEffect(() => {
    if (currentStep === 3 && selectedTrainer?.id) {
      fetchSessions(selectedTrainer.id, selectedDate);
    }
  }, [selectedTrainer?.id, selectedDate, currentStep, fetchSessions]);

  // Fetch member's bookings for "My Sessions" tab
  const fetchMyBookings = useCallback(async () => {
    if (!memberDbId) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setBookingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings?memberId=${memberDbId}&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items: any[] = Array.isArray(data) ? data : (data.bookings ?? data.content ?? data.items ?? []);
      setMyBookings(items.map((b: any) => ({
        id: b.id,
        trainer: b.trainerName ?? b.trainer_name ?? "Trainer",
        trainerPhoto: null,
        type: b.sessionName ?? b.session_name ?? b.type ?? "Session",
        date: b.date ?? b.createdAt?.slice(0, 10) ?? "",
        time: b.startTime ?? b.start_time ?? "—",
        duration: 60,
        status: (b.status ?? "confirmed").charAt(0).toUpperCase() + (b.status ?? "confirmed").slice(1),
        location: b.location ?? "—",
        price: Number(b.price ?? 0),
        paymentMethod: b.paymentStatus ?? "—",
        attended: b.status === "checked-in",
      })));
    } catch {
      setMyBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [memberDbId]);

  useEffect(() => { if (viewMode === 'sessions') fetchMyBookings(); }, [viewMode, fetchMyBookings]);

  // Derived stats from real bookings
  const memberStats = {
    upcomingSessions: myBookings.filter(b => b.status === 'Confirmed').length,
    remainingCredits: 5,
    nextSession: myBookings.find(b => b.status === 'Confirmed')
      ? `${new Date(myBookings.find(b => b.status === 'Confirmed')!.date).toLocaleDateString()} ${myBookings.find(b => b.status === 'Confirmed')!.time}`
      : "No upcoming sessions",
  };

  const handleTypeSelection = (typeId: string) => {
    setSelectedType(typeId);
    setCurrentStep(2);
  };

  const handleTrainerSelection = (trainer: any) => {
    setSelectedTrainer(trainer);
    setCurrentStep(3);
  };

  const handleSlotSelection = (session: any) => {
    setSelectedSlot(session);
    setCurrentStep(4);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot?.id) {
      toast.error("No session selected.");
      return;
    }
    const token = sessionStorage.getItem("token");
    if (!token) { toast.error("Not authenticated."); return; }
    setBookingLoading(true);
    try {
      const body: any = {
        sessionId: Number(selectedSlot.id),
        paymentStatus: paymentMethod === 'card' ? 'pay_later' : 'paid',
      };
      if (memberDbId) {
        body.memberId = memberDbId;
      } else {
        toast.error("No member selected. Please select a member first.");
        return;
      }
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? `Error ${res.status}`);
      }
      toast.success('Session Booked Successfully!', {
        description: `Booking confirmed for ${selectedDate.toLocaleDateString()} at ${selectedSlot.startTime ?? selectedSlot.time}`,
        duration: 5000,
      });
      setCurrentStep(1);
      setSelectedType(null);
      setSelectedTrainer(null);
      setSelectedSlot(null);
      setViewMode('sessions');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelSession = async (bookingId: any) => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Session Cancelled');
      fetchMyBookings();
    } catch {
      toast.error('Could not cancel session.');
    }
  };

  const handleRescheduleSession = (_sessionId: any) => {
    toast.info('Reschedule Session', { description: 'Opening booking calendar...', duration: 2000 });
    setViewMode('book');
  };

  // Display trainers: prefer real API data, fall back to mock if empty
  const displayTrainers = realTrainers.length > 0 ? realTrainers : trainers;

  const filteredTrainers = displayTrainers.filter((trainer: any) => {
    const matchesSearch = trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (trainer.specialization ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterSpecialization === 'all' ||
                         (trainer.specialization ?? "").toLowerCase().includes(filterSpecialization.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const filteredSessions = myBookings.filter(session => {
    if (sessionFilter === 'upcoming') return session.status === 'Confirmed';
    if (sessionFilter === 'completed') return session.status === 'Completed';
    if (sessionFilter === 'cancelled') return session.status === 'Cancelled';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmed': return <CheckCircle2 className="h-4 w-4" />;
      case 'Completed': return <Check className="h-4 w-4" />;
      case 'Cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B]">Book a Session</h1>
            <p className="text-gray-600 mt-1">Schedule your next training session</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'book' ? 'default' : 'outline'}
              onClick={() => setViewMode('book')}
              style={viewMode === 'book' ? { backgroundColor: '#327F74' } : {}}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Book Session
            </Button>
            <Button
              variant={viewMode === 'sessions' ? 'default' : 'outline'}
              onClick={() => setViewMode('sessions')}
              style={viewMode === 'sessions' ? { backgroundColor: '#327F74' } : {}}
            >
              <Clock className="h-4 w-4 mr-2" />
              My Sessions
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming Sessions</p>
                  <p className="text-2xl font-bold text-[#327F74]">{memberStats.upcomingSessions}</p>
                </div>
                <CalendarDays className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Remaining PT Credits</p>
                  <p className="text-2xl font-bold text-[#327F74]">{memberStats.remainingCredits}</p>
                </div>
                <Award className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Next Session</p>
                  <p className="text-lg font-semibold text-[#1E293B]">{memberStats.nextSession}</p>
                </div>
                <Clock className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {viewMode === 'book' ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {currentStep === 1 && 'Choose Training Type'}
                    {currentStep === 2 && 'Select Your Trainer'}
                    {currentStep === 3 && 'Pick Date & Time'}
                    {currentStep === 4 && 'Confirm Booking'}
                  </CardTitle>
                  <CardDescription>
                    {currentStep === 1 && 'Select the type of training session you want'}
                    {currentStep === 2 && 'Browse our certified trainers and their specializations'}
                    {currentStep === 3 && 'Choose your preferred time slot'}
                    {currentStep === 4 && 'Review and confirm your booking'}
                  </CardDescription>
                </div>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        step <= currentStep ? 'bg-[#327F74]' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Step 1: Training Type Selection */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trainingTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Card
                        key={type.id}
                        className="cursor-pointer hover:shadow-lg transition-all hover:border-[#327F74] relative"
                        onClick={() => handleTypeSelection(type.id)}
                      >
                        {type.popular && (
                          <Badge
                            className="absolute top-3 right-3 bg-[#327F74]"
                          >
                            Popular
                          </Badge>
                        )}
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-[#327F74] bg-opacity-10 flex items-center justify-center mb-4">
                              <Icon className="h-8 w-8 text-[#327F74]" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{type.name}</h3>
                            <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              {type.duration}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Trainer Selection */}
              {currentStep === 2 && (
                <div>
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search trainers..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <Select value={filterSpecialization} onValueChange={setFilterSpecialization}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Specializations</SelectItem>
                        <SelectItem value="strength">Strength & Conditioning</SelectItem>
                        <SelectItem value="yoga">Yoga & Flexibility</SelectItem>
                        <SelectItem value="crossfit">CrossFit & HIIT</SelectItem>
                        <SelectItem value="cardio">Cardio & Weight Loss</SelectItem>
                        <SelectItem value="rehab">Rehabilitation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trainer Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTrainers.map((trainer) => (
                      <Card
                        key={trainer.id}
                        className="cursor-pointer hover:shadow-lg transition-all hover:border-[#327F74]"
                        onClick={() => handleTrainerSelection(trainer)}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center">
                            <Avatar className="h-20 w-20 mb-4">
                              <AvatarImage src={trainer.photo} />
                              <AvatarFallback>{trainer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <h3 className="font-semibold text-lg mb-1">{trainer.name}</h3>
                            <p className="text-sm text-[#327F74] mb-3">{trainer.specialization}</p>
                            <div className="flex items-center gap-1 mb-3">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{trainer.rating}</span>
                              <span className="text-sm text-gray-500">({trainer.sessionsCompleted})</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {trainer.certifications.map((cert, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-gray-600 mb-4">{trainer.bio}</p>
                            <div className="w-full space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Available Today:</span>
                                <span className="font-semibold text-[#327F74]">{trainer.availableToday} slots</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Price:</span>
                                <span className="font-semibold">AED {trainer.price}/session</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Calendar & Time Slot Selection */}
              {currentStep === 3 && selectedTrainer && (
                <div>
                  {/* Selected Trainer Info */}
                  <Card className="mb-6 bg-[#327F74] bg-opacity-5 border-[#327F74]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedTrainer.photo} />
                          <AvatarFallback>{selectedTrainer.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold">{selectedTrainer.name}</h3>
                          <p className="text-sm text-gray-600">{selectedTrainer.specialization}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">AED {selectedTrainer.price}</p>
                          <p className="text-sm text-gray-600">per session</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Week Calendar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Select Date</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)} disabled={weekOffset <= 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
                        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {weekDates.map((date, idx) => {
                        const isSelected = selectedDate.toDateString() === date.toDateString();
                        const isToday = new Date().toDateString() === date.toDateString();
                        return (
                          <Card
                            key={idx}
                            className={`cursor-pointer transition-all ${
                              isSelected ? 'border-[#327F74] bg-[#327F74] text-white' : 'hover:border-[#327F74]'
                            }`}
                            onClick={() => setSelectedDate(date)}
                          >
                            <CardContent className="p-3 text-center">
                              <p className="text-xs mb-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                              <p className="text-xl font-bold">{date.getDate()}</p>
                              {isToday && !isSelected && (
                                <Badge className="mt-1 text-xs bg-[#327F74]">Today</Badge>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots — real sessions from API */}
                  <div>
                    <h3 className="font-semibold mb-4">Available Sessions</h3>
                    {sessionsLoading ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
                      </div>
                    ) : realSessions.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <Clock className="h-10 w-10 mx-auto text-gray-300" />
                        <p className="text-sm text-gray-500">No sessions scheduled for this date.</p>
                        <p className="text-xs text-gray-400">Try a different date or trainer.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {realSessions.map((session: any) => {
                          const available = (session.booked ?? 0) < (session.capacity ?? 1);
                          const isSelected = selectedSlot?.id === session.id;
                          return (
                            <Button
                              key={session.id}
                              variant={available ? 'outline' : 'ghost'}
                              className={`h-auto py-3 ${
                                isSelected
                                  ? 'bg-[#327F74] text-white border-[#327F74]'
                                  : available
                                    ? 'hover:bg-[#327F74] hover:text-white border-[#327F74]'
                                    : 'opacity-50 cursor-not-allowed'
                              }`}
                              onClick={() => available && handleSlotSelection(session)}
                              disabled={!available}
                            >
                              <div className="flex flex-col items-center">
                                <Clock className="h-4 w-4 mb-1" />
                                <span className="font-semibold text-xs">{session.startTime?.slice(0,5) ?? "—"}</span>
                                <span className="text-xs mt-0.5 truncate max-w-full">{session.name ?? ""}</span>
                                {available ? (
                                  <span className="text-xs text-green-600 mt-1">{session.capacity - (session.booked ?? 0)} left</span>
                                ) : (
                                  <span className="text-xs text-red-600 mt-1">Full</span>
                                )}
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 4 && selectedTrainer && selectedSlot && (
                <div className="max-w-2xl mx-auto">
                  {/* Session Summary */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Session Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 pb-4 border-b">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={selectedTrainer.photo} />
                          <AvatarFallback>{selectedTrainer.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{selectedTrainer.name}</h3>
                          <p className="text-sm text-gray-600">{selectedTrainer.specialization}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{selectedTrainer.rating}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-[#327F74] mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-semibold">{selectedSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-[#327F74] mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Time</p>
                            <p className="font-semibold">{selectedSlot.startTime?.slice(0,5) ?? selectedSlot.time ?? "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Activity className="h-5 w-5 text-[#327F74] mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-semibold">60 minutes</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <DollarSign className="h-5 w-5 text-[#327F74] mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-600">Price</p>
                            <p className="font-semibold">AED {selectedSlot?.price ?? selectedTrainer?.price ?? "—"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Method */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            paymentMethod === 'membership' ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                          }`}
                          onClick={() => setPaymentMethod('membership')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Award className="h-5 w-5 text-[#327F74]" />
                              <div>
                                <p className="font-semibold">Membership Credit</p>
                                <p className="text-sm text-gray-600">Uses 1 PT credit • {memberStats.remainingCredits} remaining</p>
                              </div>
                            </div>
                            {paymentMethod === 'membership' && (
                              <CheckCircle2 className="h-5 w-5 text-[#327F74]" />
                            )}
                          </div>
                        </div>

                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            paymentMethod === 'wallet' ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                          }`}
                          onClick={() => setPaymentMethod('wallet')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-[#327F74]" />
                              <div>
                                <p className="font-semibold">Wallet</p>
                                <p className="text-sm text-gray-600">Balance: AED 500</p>
                              </div>
                            </div>
                            {paymentMethod === 'wallet' && (
                              <CheckCircle2 className="h-5 w-5 text-[#327F74]" />
                            )}
                          </div>
                        </div>

                        <div
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            paymentMethod === 'card' ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                          }`}
                          onClick={() => setPaymentMethod('card')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-[#327F74]" />
                              <div>
                                <p className="font-semibold">Credit/Debit Card</p>
                                <p className="text-sm text-gray-600">Pay AED {selectedTrainer.price}</p>
                              </div>
                            </div>
                            {paymentMethod === 'card' && (
                              <CheckCircle2 className="h-5 w-5 text-[#327F74]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Confirm Button */}
                  <Button
                    className="w-full h-12 text-lg"
                    style={{ backgroundColor: '#327F74' }}
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                    )}
                    {bookingLoading ? 'Booking...' : 'Confirm & Book Session'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* My Sessions View */
          <Card>
            <CardHeader>
              <CardTitle>My Sessions</CardTitle>
              <CardDescription>View and manage your training sessions</CardDescription>
              <Tabs value={sessionFilter} onValueChange={(val) => setSessionFilter(val as any)} className="mt-4">
                <TabsList className="grid w-full md:w-96 grid-cols-3">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingsLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />)}
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No {sessionFilter} sessions</p>
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={session.trainerPhoto} />
                            <AvatarFallback>{session.trainer.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{session.trainer}</h3>
                                <p className="text-sm text-gray-600">{session.type}</p>
                              </div>
                              <Badge className={getStatusColor(session.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(session.status)}
                                  {session.status}
                                </div>
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{new Date(session.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>{session.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <span>{session.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-gray-500" />
                                <span>AED {session.price}</span>
                              </div>
                            </div>

                            {session.status === 'Confirmed' && (
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRescheduleSession(session.id)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reschedule
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleCancelSession(session.id)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {session.status === 'Completed' && session.attended && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-sm text-green-800">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="font-medium">Attended</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
