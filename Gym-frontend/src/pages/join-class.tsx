import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { 
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Users,
  TrendingUp,
  Star,
  Award,
  Flame,
  Check,
  X,
  ChevronRight,
  User,
  CalendarDays,
  Wallet,
  CreditCard,
  QrCode,
  Share2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Heart,
  Activity,
  Zap,
  Dumbbell,
  Info,
  RefreshCw,
  Download,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Mock class data
const classTypes = [
  { id: 'yoga', name: 'Yoga', icon: Activity, color: 'bg-purple-500' },
  { id: 'hiit', name: 'HIIT', icon: Zap, color: 'bg-red-500' },
  { id: 'zumba', name: 'Zumba', icon: Users, color: 'bg-pink-500' },
  { id: 'spin', name: 'Spin', icon: TrendingUp, color: 'bg-blue-500' },
  { id: 'crossfit', name: 'CrossFit', icon: Dumbbell, color: 'bg-orange-500' },
  { id: 'pilates', name: 'Pilates', icon: Heart, color: 'bg-green-500' }
];

const scheduledClasses = [
  {
    id: 1,
    name: "Morning Power Yoga",
    type: "yoga",
    trainer: {
      name: "Sarah Mitchell",
      photo: "/avatars/trainer2.jpg",
      specialization: "Yoga Instructor"
    },
    date: "2026-01-21",
    time: "07:00",
    duration: 60,
    studio: "Studio A",
    capacity: 20,
    booked: 16,
    waitlist: 0,
    price: 0,
    includedInMembership: true,
    intensity: "Beginner",
    requirements: ["Yoga mat", "Water bottle", "Towel"],
    cancellationPolicy: "Cancel up to 2 hours before class start",
    description: "Start your day with energizing yoga flows and breathing exercises."
  },
  {
    id: 2,
    name: "HIIT Burn",
    type: "hiit",
    trainer: {
      name: "Marcus Johnson",
      photo: "/avatars/trainer3.jpg",
      specialization: "HIIT Specialist"
    },
    date: "2026-01-21",
    time: "18:00",
    duration: 45,
    studio: "Studio B",
    capacity: 25,
    booked: 23,
    waitlist: 2,
    price: 30,
    includedInMembership: false,
    intensity: "Advanced",
    requirements: ["Training shoes", "Water bottle", "Towel"],
    cancellationPolicy: "Cancel up to 2 hours before class start",
    description: "High-intensity interval training for maximum calorie burn."
  },
  {
    id: 3,
    name: "Zumba Party",
    type: "zumba",
    trainer: {
      name: "Fatima Hassan",
      photo: "/avatars/trainer4.jpg",
      specialization: "Dance Fitness"
    },
    date: "2026-01-21",
    time: "19:00",
    duration: 60,
    studio: "Dance Studio",
    capacity: 30,
    booked: 12,
    waitlist: 0,
    price: 0,
    includedInMembership: true,
    intensity: "Intermediate",
    requirements: ["Dance shoes (optional)", "Water bottle"],
    cancellationPolicy: "Cancel up to 1 hour before class start",
    description: "Dance your way to fitness with Latin-inspired rhythms."
  },
  {
    id: 4,
    name: "Spin Class",
    type: "spin",
    trainer: {
      name: "Ahmed Al-Rashid",
      photo: "/avatars/trainer1.jpg",
      specialization: "Cycling Coach"
    },
    date: "2026-01-22",
    time: "06:30",
    duration: 45,
    studio: "Spin Room",
    capacity: 20,
    booked: 20,
    waitlist: 5,
    price: 0,
    includedInMembership: true,
    intensity: "Intermediate",
    requirements: ["Cycling shoes (optional)", "Water bottle", "Towel"],
    cancellationPolicy: "Cancel up to 2 hours before class start",
    description: "High-energy indoor cycling with motivating music."
  },
  {
    id: 5,
    name: "CrossFit Fundamentals",
    type: "crossfit",
    trainer: {
      name: "Marcus Johnson",
      photo: "/avatars/trainer3.jpg",
      specialization: "CrossFit L2"
    },
    date: "2026-01-22",
    time: "17:00",
    duration: 60,
    studio: "CrossFit Zone",
    capacity: 15,
    booked: 8,
    waitlist: 0,
    price: 50,
    includedInMembership: false,
    intensity: "Beginner",
    requirements: ["Training shoes", "Water bottle", "Towel"],
    cancellationPolicy: "Cancel up to 4 hours before class start",
    description: "Learn the basics of functional fitness and Olympic lifting."
  },
  {
    id: 6,
    name: "Evening Pilates",
    type: "pilates",
    trainer: {
      name: "Sarah Mitchell",
      photo: "/avatars/trainer2.jpg",
      specialization: "Pilates Instructor"
    },
    date: "2026-01-22",
    time: "18:30",
    duration: 60,
    studio: "Studio A",
    capacity: 18,
    booked: 14,
    waitlist: 0,
    price: 0,
    includedInMembership: true,
    intensity: "Beginner",
    requirements: ["Yoga mat", "Water bottle"],
    cancellationPolicy: "Cancel up to 2 hours before class start",
    description: "Core-strengthening exercises with focus on form and breathing."
  }
];

// Member's bookings
const myBookings = [
  {
    id: 101,
    classId: 1,
    className: "Morning Power Yoga",
    type: "yoga",
    trainer: "Sarah Mitchell",
    trainerPhoto: "/avatars/trainer2.jpg",
    date: "2026-01-22",
    time: "07:00",
    duration: 60,
    studio: "Studio A",
    status: "Confirmed",
    bookingCode: "YG-220107",
    paymentMethod: "Membership",
    canCancel: true
  },
  {
    id: 102,
    classId: 4,
    className: "Spin Class",
    type: "spin",
    trainer: "Ahmed Al-Rashid",
    trainerPhoto: "/avatars/trainer1.jpg",
    date: "2026-01-23",
    time: "06:30",
    duration: 45,
    studio: "Spin Room",
    status: "Waitlisted",
    position: 3,
    bookingCode: "SP-230630",
    paymentMethod: "Membership",
    canCancel: true
  },
  {
    id: 103,
    classId: 2,
    className: "HIIT Burn",
    type: "hiit",
    trainer: "Marcus Johnson",
    trainerPhoto: "/avatars/trainer3.jpg",
    date: "2026-01-18",
    time: "18:00",
    duration: 45,
    studio: "Studio B",
    status: "Completed",
    attended: true,
    bookingCode: "HT-180618",
    paymentMethod: "Card"
  },
  {
    id: 104,
    classId: 3,
    className: "Zumba Party",
    type: "zumba",
    trainer: "Fatima Hassan",
    trainerPhoto: "/avatars/trainer4.jpg",
    date: "2026-01-15",
    time: "19:00",
    duration: 60,
    studio: "Dance Studio",
    status: "Cancelled",
    bookingCode: "ZM-151900",
    paymentMethod: "Refunded"
  }
];

interface JoinClassProps {
  onNavigate?: (section: string) => void;
}

export function JoinClass({ onNavigate }: JoinClassProps = {}) {
  const [viewMode, setViewMode] = useState<'discover' | 'my-classes'>('discover');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedIntensity, setSelectedIntensity] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingSheet, setShowBookingSheet] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('membership');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [myClassesTab, setMyClassesTab] = useState<'upcoming' | 'completed' | 'cancelled' | 'waitlist'>('upcoming');
  const [bookingCode, setBookingCode] = useState('');

  // Member stats
  const memberStats = {
    todayClasses: 6,
    weekClasses: 24,
    nextClass: "HIIT • 6:00 PM • Studio A",
    remainingCredits: 12
  };

  const getClassTypeInfo = (typeId: string) => {
    return classTypes.find(t => t.id === typeId) || classTypes[0];
  };

  const getCapacityPercentage = (booked: number, capacity: number) => {
    return (booked / capacity) * 100;
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    return 'text-green-600';
  };

  const isClassFull = (classItem: any) => {
    return classItem.booked >= classItem.capacity;
  };

  const canJoinClass = (classItem: any) => {
    return classItem.booked < classItem.capacity;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'Waitlisted':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Waitlisted</Badge>;
      case 'Completed':
        return <Badge className="bg-blue-100 text-blue-800"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return null;
    }
  };

  const filteredClasses = scheduledClasses.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.studio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || classItem.type === selectedType;
    const matchesIntensity = selectedIntensity === 'all' || classItem.intensity === selectedIntensity;
    
    let matchesTime = true;
    if (selectedTime === 'morning') {
      const hour = parseInt(classItem.time.split(':')[0]);
      matchesTime = hour >= 6 && hour < 12;
    } else if (selectedTime === 'evening') {
      const hour = parseInt(classItem.time.split(':')[0]);
      matchesTime = hour >= 17 && hour < 22;
    }
    
    return matchesSearch && matchesType && matchesIntensity && matchesTime;
  });

  const filteredMyBookings = myBookings.filter(booking => {
    if (myClassesTab === 'upcoming') return booking.status === 'Confirmed';
    if (myClassesTab === 'waitlist') return booking.status === 'Waitlisted';
    if (myClassesTab === 'completed') return booking.status === 'Completed';
    if (myClassesTab === 'cancelled') return booking.status === 'Cancelled';
    return true;
  });

  const handleClassClick = (classItem: any) => {
    setSelectedClass(classItem);
  };

  const handleJoinClass = () => {
    if (!selectedClass) return;
    
    if (isClassFull(selectedClass)) {
      // Join waitlist
      setShowBookingSheet(true);
    } else {
      // Join class
      setShowBookingSheet(true);
    }
  };

  const handleConfirmBooking = () => {
    if (!agreedToPolicy) {
      toast.error('Please agree to the cancellation policy');
      return;
    }

    // Generate booking code
    const code = `${selectedClass.type.substring(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    setBookingCode(code);
    setShowBookingSheet(false);
    setShowSuccessDialog(true);
    setSelectedClass(null);
    setAgreedToPolicy(false);

    toast.success('Class Booked Successfully!', {
      description: `You're confirmed for ${selectedClass.name}`,
      duration: 5000,
    });
  };

  const handleCancelBooking = (bookingId: number) => {
    toast.success('Booking Cancelled', {
      description: 'Your class booking has been cancelled',
      duration: 3000,
    });
  };

  const handleAddToCalendar = () => {
    toast.info('Calendar Integration', {
      description: 'Opening calendar...',
      duration: 2000,
    });
  };

  const handleShareBooking = () => {
    toast.success('Booking Details Shared', {
      description: 'Sharing via WhatsApp...',
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B]">Join Scheduled Class</h1>
            <p className="text-gray-600 mt-1">Yoga, Zumba, HIIT, Spin, CrossFit & more</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'discover' ? 'default' : 'outline'}
              onClick={() => setViewMode('discover')}
              style={viewMode === 'discover' ? { backgroundColor: '#327F74' } : {}}
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Classes
            </Button>
            <Button
              variant={viewMode === 'my-classes' ? 'default' : 'outline'}
              onClick={() => setViewMode('my-classes')}
              style={viewMode === 'my-classes' ? { backgroundColor: '#327F74' } : {}}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              My Classes
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-[#327F74]">{memberStats.todayClasses}</p>
                  <p className="text-xs text-gray-500">classes available</p>
                </div>
                <Calendar className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-[#327F74]">{memberStats.weekClasses}</p>
                  <p className="text-xs text-gray-500">classes scheduled</p>
                </div>
                <CalendarDays className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Next Class</p>
                  <p className="text-sm font-semibold text-[#1E293B]">{memberStats.nextClass}</p>
                </div>
                <Clock className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Class Credits</p>
                  <p className="text-2xl font-bold text-[#327F74]">{memberStats.remainingCredits}</p>
                  <p className="text-xs text-gray-500">remaining</p>
                </div>
                <Award className="h-8 w-8 text-[#327F74] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {viewMode === 'discover' ? (
          <Card>
            <CardHeader>
              <CardTitle>Discover Classes</CardTitle>
              <CardDescription>Find and join group fitness classes</CardDescription>

              {/* Search and Filters */}
              <div className="space-y-4 pt-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search class, trainer, or studio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Advanced Filters</SheetTitle>
                        <SheetDescription>Refine your class search</SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6 mt-6">
                        <div>
                          <Label>Class Type</Label>
                          <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              {classTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Intensity</Label>
                          <Select value={selectedIntensity} onValueChange={setSelectedIntensity}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Levels</SelectItem>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Time of Day</Label>
                          <Select value={selectedTime} onValueChange={setSelectedTime}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Day</SelectItem>
                              <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                              <SelectItem value="evening">Evening (5 PM - 10 PM)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          className="w-full" 
                          style={{ backgroundColor: '#327F74' }}
                          onClick={() => setShowFilters(false)}
                        >
                          Apply Filters
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Quick Filter Chips */}
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedTime === 'all' ? 'default' : 'outline'} 
                    className="cursor-pointer"
                    onClick={() => setSelectedTime('all')}
                  >
                    All Times
                  </Badge>
                  <Badge 
                    variant={selectedTime === 'morning' ? 'default' : 'outline'} 
                    className="cursor-pointer"
                    onClick={() => setSelectedTime('morning')}
                  >
                    Morning
                  </Badge>
                  <Badge 
                    variant={selectedTime === 'evening' ? 'default' : 'outline'} 
                    className="cursor-pointer"
                    onClick={() => setSelectedTime('evening')}
                  >
                    Evening
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    🔥 Popular
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    Included in Membership
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Class Type Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <Button
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('all')}
                  style={selectedType === 'all' ? { backgroundColor: '#327F74' } : {}}
                >
                  All Classes
                </Button>
                {classTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.id}
                      variant={selectedType === type.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType(type.id)}
                      style={selectedType === type.id ? { backgroundColor: '#327F74' } : {}}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {type.name}
                    </Button>
                  );
                })}
              </div>

              {/* Class List */}
              <div className="space-y-4">
                {filteredClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No classes found</p>
                    <p className="text-sm text-gray-500">Try adjusting your filters</p>
                  </div>
                ) : (
                  filteredClasses.map(classItem => {
                    const typeInfo = getClassTypeInfo(classItem.type);
                    const Icon = typeInfo.icon;
                    const capacityPercentage = getCapacityPercentage(classItem.booked, classItem.capacity);
                    const isFull = isClassFull(classItem);
                    
                    return (
                      <Card 
                        key={classItem.id} 
                        className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                        style={{ borderLeftColor: typeInfo.color.replace('bg-', '#') }}
                        onClick={() => handleClassClick(classItem)}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row gap-4">
                            {/* Left: Class Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`p-3 rounded-lg ${typeInfo.color}`}>
                                    <Icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">{classItem.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {typeInfo.name}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {classItem.intensity}
                                      </Badge>
                                      {capacityPercentage >= 80 && (
                                        <Badge className="text-xs bg-orange-100 text-orange-800">
                                          <Flame className="h-3 w-3 mr-1" />
                                          Popular
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span>{classItem.trainer.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span>{new Date(classItem.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span>{classItem.time} ({classItem.duration}min)</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <span>{classItem.studio}</span>
                                </div>
                              </div>

                              {/* Capacity Bar */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className={`font-medium ${getCapacityColor(capacityPercentage)}`}>
                                    {classItem.booked}/{classItem.capacity} spots filled
                                  </span>
                                  {classItem.waitlist > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {classItem.waitlist} on waitlist
                                    </span>
                                  )}
                                </div>
                                <Progress value={capacityPercentage} className="h-2" />
                                {!isFull && classItem.capacity - classItem.booked <= 3 && (
                                  <p className="text-xs text-orange-600 font-medium">
                                    ⚡ Last few spots available!
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Price & CTA */}
                            <div className="flex flex-col items-end justify-between md:w-48">
                              <div className="text-right mb-4">
                                {classItem.includedInMembership ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <Check className="h-3 w-3 mr-1" />
                                    Included
                                  </Badge>
                                ) : (
                                  <div>
                                    <p className="text-2xl font-bold text-[#327F74]">
                                      AED {classItem.price}
                                    </p>
                                    <p className="text-xs text-gray-500">per session</p>
                                  </div>
                                )}
                              </div>
                              <Button
                                className="w-full"
                                style={{ backgroundColor: isFull ? '#94a3b8' : '#327F74' }}
                                disabled={isFull && classItem.waitlist >= 10}
                              >
                                {isFull ? (
                                  classItem.waitlist >= 10 ? 'Waitlist Full' : 'Join Waitlist'
                                ) : (
                                  'Join Class'
                                )}
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* My Classes View */
          <Card>
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Manage your class bookings</CardDescription>
              <Tabs value={myClassesTab} onValueChange={(val) => setMyClassesTab(val as any)} className="mt-4">
                <TabsList className="grid w-full md:w-[500px] grid-cols-4">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMyBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No {myClassesTab} classes</p>
                  </div>
                ) : (
                  filteredMyBookings.map(booking => {
                    const typeInfo = getClassTypeInfo(booking.type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={booking.trainerPhoto} />
                              <AvatarFallback>{booking.trainer.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-semibold text-lg flex items-center gap-2">
                                    {booking.className}
                                    {getStatusBadge(booking.status)}
                                  </h3>
                                  <p className="text-sm text-gray-600">with {booking.trainer}</p>
                                </div>
                                {booking.status === 'Waitlisted' && booking.position && (
                                  <Badge variant="outline" className="ml-2">
                                    Position #{booking.position}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span>{new Date(booking.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span>{booking.time}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <span>{booking.studio}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <QrCode className="h-4 w-4 text-gray-500" />
                                  <span>{booking.bookingCode}</span>
                                </div>
                              </div>

                              {booking.status === 'Confirmed' && booking.canCancel && (
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelBooking(booking.id)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel Booking
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddToCalendar}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Add to Calendar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleShareBooking}
                                  >
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share
                                  </Button>
                                </div>
                              )}

                              {booking.status === 'Completed' && booking.attended && (
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
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Class Details Dialog */}
      {selectedClass && (
        <Dialog open={!!selectedClass && !showBookingSheet} onOpenChange={() => setSelectedClass(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {(() => {
                  const typeInfo = getClassTypeInfo(selectedClass.type);
                  const Icon = typeInfo.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {selectedClass.name}
                    </>
                  );
                })()}
              </DialogTitle>
              <DialogDescription>{selectedClass.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Trainer Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedClass.trainer.photo} />
                  <AvatarFallback>{selectedClass.trainer.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedClass.trainer.name}</p>
                  <p className="text-sm text-gray-600">{selectedClass.trainer.specialization}</p>
                </div>
              </div>

              {/* Schedule Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Calendar className="h-5 w-5 text-[#327F74]" />
                  <div>
                    <p className="text-xs text-gray-600">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedClass.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Clock className="h-5 w-5 text-[#327F74]" />
                  <div>
                    <p className="text-xs text-gray-600">Time</p>
                    <p className="font-semibold">{selectedClass.time} ({selectedClass.duration} min)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <MapPin className="h-5 w-5 text-[#327F74]" />
                  <div>
                    <p className="text-xs text-gray-600">Location</p>
                    <p className="font-semibold">{selectedClass.studio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Users className="h-5 w-5 text-[#327F74]" />
                  <div>
                    <p className="text-xs text-gray-600">Capacity</p>
                    <p className="font-semibold">{selectedClass.booked}/{selectedClass.capacity} spots</p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Requirements
                </h4>
                <ul className="space-y-2">
                  {selectedClass.requirements.map((req: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cancellation Policy */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Cancellation Policy</p>
                    <p className="text-sm text-yellow-800 mt-1">{selectedClass.cancellationPolicy}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  style={{ backgroundColor: '#327F74' }}
                  onClick={handleJoinClass}
                  disabled={isClassFull(selectedClass) && selectedClass.waitlist >= 10}
                >
                  {isClassFull(selectedClass) ? (
                    selectedClass.waitlist >= 10 ? (
                      'Waitlist Full'
                    ) : (
                      <>
                        Join Waitlist
                        <Users className="h-4 w-4 ml-2" />
                      </>
                    )
                  ) : (
                    <>
                      Join Class
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAddToCalendar}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Add to Calendar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Booking Confirmation Sheet */}
      {selectedClass && (
        <Sheet open={showBookingSheet} onOpenChange={setShowBookingSheet}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Confirm Booking</SheetTitle>
              <SheetDescription>
                {isClassFull(selectedClass) ? 'Join the waitlist' : 'Review and confirm your class booking'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Class Summary */}
              <Card className="bg-[#327F74] bg-opacity-5 border-[#327F74]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedClass.trainer.photo} />
                      <AvatarFallback>{selectedClass.trainer.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedClass.name}</h3>
                      <p className="text-sm text-gray-600">{selectedClass.trainer.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedClass.date).toLocaleDateString()} at {selectedClass.time}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method (if applicable) */}
              {!selectedClass.includedInMembership && !isClassFull(selectedClass) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                            <p className="font-semibold">Use Class Credit</p>
                            <p className="text-sm text-gray-600">{memberStats.remainingCredits} credits remaining</p>
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
                            <p className="text-sm text-gray-600">Pay AED {selectedClass.price}</p>
                          </div>
                        </div>
                        {paymentMethod === 'card' && (
                          <CheckCircle2 className="h-5 w-5 text-[#327F74]" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Terms Agreement */}
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Checkbox
                  id="policy"
                  checked={agreedToPolicy}
                  onCheckedChange={(checked) => setAgreedToPolicy(checked as boolean)}
                />
                <Label htmlFor="policy" className="text-sm cursor-pointer">
                  I agree to the cancellation policy: {selectedClass.cancellationPolicy}
                </Label>
              </div>

              {/* Confirm Button */}
              <Button
                className="w-full h-12 text-lg"
                style={{ backgroundColor: '#327F74' }}
                onClick={handleConfirmBooking}
                disabled={!agreedToPolicy}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {isClassFull(selectedClass) ? 'Join Waitlist' : 'Confirm & Join Class'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Joined Successfully!</h2>
              <p className="text-gray-600">Your class has been booked</p>
            </div>

            {/* QR Code */}
            <div className="p-6 border-2 border-dashed rounded-lg">
              <div className="w-32 h-32 mx-auto bg-gray-200 rounded flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mt-3">Booking Code</p>
              <p className="font-mono font-bold text-lg">{bookingCode}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                style={{ backgroundColor: '#327F74' }}
                onClick={() => {
                  setShowSuccessDialog(false);
                  setViewMode('my-classes');
                }}
              >
                View My Classes
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleShareBooking}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAddToCalendar}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
