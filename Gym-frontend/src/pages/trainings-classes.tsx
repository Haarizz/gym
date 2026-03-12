import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Dumbbell,
  Heart,
  Zap,
  Target,
  BookOpen,
  CalendarDays,
  Grid3X3,
  List,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// Mock data for classes and trainers
const mockTrainers = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@gymbios.com",
    specialties: ["Yoga", "Pilates"],
    avatar: "/avatars/sarah.jpg",
    rating: 4.9,
    experience: "5 years",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike@gymbios.com",
    specialties: ["Strength Training", "CrossFit"],
    avatar: "/avatars/mike.jpg",
    rating: 4.8,
    experience: "7 years",
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    email: "elena@gymbios.com",
    specialties: ["Martial Arts", "Boxing"],
    avatar: "/avatars/elena.jpg",
    rating: 4.9,
    experience: "6 years",
  },
];

const classTypes = [
  { id: "yoga", name: "Yoga", color: "#2B7A78", icon: Heart },
  { id: "strength", name: "Strength Training", color: "#2B7A78", icon: Dumbbell },
  { id: "martial-arts", name: "Martial Arts", color: "#E63946", icon: Target },
  { id: "cardio", name: "Cardio", color: "#2B7A78", icon: Zap },
  { id: "pilates", name: "Pilates", color: "#2B7A78", icon: BookOpen },
];

const mockClasses = [
  {
    id: "1",
    name: "Morning Yoga Flow",
    trainer: mockTrainers[0],
    type: "yoga",
    date: "2024-10-04",
    startTime: "09:00",
    endTime: "10:00",
    duration: 60,
    location: "Studio A",
    capacity: 20,
    enrolled: 15,
    status: "active",
    description: "Start your day with a peaceful yoga flow session designed to energize your body and calm your mind.",
    price: "50 AED",
  },
  {
    id: "2",
    name: "Strength & Power",
    trainer: mockTrainers[1],
    type: "strength",
    date: "2024-10-04",
    startTime: "10:30",
    endTime: "11:30",
    duration: 60,
    location: "Gym Floor",
    capacity: 15,
    enrolled: 12,
    status: "active",
    description: "Build strength and power with compound movements and progressive overload techniques.",
    price: "75 AED",
  },
  {
    id: "3",
    name: "Boxing Fundamentals",
    trainer: mockTrainers[2],
    type: "martial-arts",
    date: "2024-10-04",
    startTime: "18:00",
    endTime: "19:00",
    duration: 60,
    location: "Boxing Ring",
    capacity: 12,
    enrolled: 10,
    status: "active",
    description: "Learn the fundamentals of boxing including proper stance, basic punches, and defensive techniques.",
    price: "80 AED",
  },
];

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00"
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TrainingsClassesProps {
  onNavigate?: (section: string) => void;
}

export function TrainingsClasses({ onNavigate }: TrainingsClassesProps) {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTrainer, setFilterTrainer] = useState("all");
  const [isStaffView, setIsStaffView] = useState(false);
  const [classes, setClasses] = useState(mockClasses);

  // Filter classes based on search and filters
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.trainer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || cls.type === filterType;
    const matchesTrainer = filterTrainer === "all" || cls.trainer.id === filterTrainer;
    
    return matchesSearch && matchesType && matchesTrainer;
  });

  const getClassTypeConfig = (typeId: string) => {
    return classTypes.find(type => type.id === typeId) || classTypes[0];
  };

  const getEnrollmentPercentage = (enrolled: number, capacity: number) => {
    return Math.round((enrolled / capacity) * 100);
  };

  const handleViewClass = (classItem: any) => {
    setSelectedClass(classItem);
    setShowClassDialog(true);
  };

  const handleBookClass = (classItem: any) => {
    toast.success("Class Booked!", {
      description: `Successfully booked ${classItem.name} with ${classItem.trainer.name}`,
    });
  };

  const renderCalendarView = () => {
    const currentWeek = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      currentWeek.push(day);
    }

    return (
      <div className="space-y-4">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(selectedDate.getDate() - 7);
                setSelectedDate(newDate);
              }}
              style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {currentWeek[0].toLocaleDateString('en-GB', { 
                month: 'long', 
                day: 'numeric' 
              })} - {currentWeek[6].toLocaleDateString('en-GB', { 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(selectedDate.getDate() + 7);
                setSelectedDate(newDate);
              }}
              style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
            style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
          >
            Today
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto" style={{ borderColor: '#2B7A7820' }}>
          {/* Day Headers */}
          <div className="grid grid-cols-8 min-w-[800px]" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}>
            <div className="p-3 text-center">
              <span className="text-white font-medium text-sm">Time</span>
            </div>
            {currentWeek.map((day, index) => (
              <div key={index} className="p-3 text-center border-l border-white/20">
                <div className="text-white font-medium text-sm">
                  {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div className="text-white/80 text-xs mt-1">
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="max-h-96 overflow-y-auto">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-8 min-w-[800px] border-b border-gray-100">
                <div className="p-3 bg-gray-50 border-r text-sm font-medium text-gray-600 flex items-center justify-center">
                  {time}
                </div>
                {currentWeek.map((day, dayIndex) => {
                  const dayClasses = filteredClasses.filter(cls => {
                    const classDate = new Date(cls.date);
                    return classDate.toDateString() === day.toDateString() &&
                           cls.startTime === time;
                  });

                  return (
                    <div key={dayIndex} className="p-2 border-l border-gray-100 min-h-[60px] relative">
                      {dayClasses.map((classItem) => {
                        const typeConfig = getClassTypeConfig(classItem.type);
                        const TypeIcon = typeConfig.icon;
                        
                        return (
                          <div
                            key={classItem.id}
                            className="group relative cursor-pointer"
                            onClick={() => handleViewClass(classItem)}
                          >
                            <div 
                              className="p-2 rounded-lg text-xs bg-white shadow-sm border-l-4 hover:shadow-md transition-all duration-200"
                              style={{ borderLeftColor: typeConfig.color }}
                            >
                              <div className="flex items-center space-x-1 mb-1">
                                <TypeIcon className="h-3 w-3" style={{ color: typeConfig.color }} />
                                <span className="font-medium text-gray-900 truncate">
                                  {classItem.name}
                                </span>
                              </div>
                              <div className="text-gray-600 text-xs truncate">
                                {classItem.trainer.name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {classItem.enrolled}/{classItem.capacity}
                              </div>
                            </div>

                            {/* Hover Popup */}
                            <div className="absolute left-full top-0 ml-2 p-3 bg-white rounded-lg shadow-lg border z-10 min-w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                              <div className="flex items-center space-x-2 mb-2">
                                <TypeIcon className="h-4 w-4" style={{ color: typeConfig.color }} />
                                <h4 className="font-semibold text-gray-900">{classItem.name}</h4>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600 mb-3">
                                <div className="flex items-center space-x-2">
                                  <User className="h-3 w-3" />
                                  <span>{classItem.trainer.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{classItem.location}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Users className="h-3 w-3" />
                                  <span>{classItem.enrolled}/{classItem.capacity} enrolled</span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  className="btn-primary text-xs h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookClass(classItem);
                                  }}
                                >
                                  Book
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 border-primary/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewClass(classItem);
                                  }}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-primary/10">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#2B7A7810' }}>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Class Name</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Trainer</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Type</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Date & Time</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Location</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Capacity</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Status</TableHead>
              <TableHead className="font-semibold" style={{ color: '#2B7A78' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClasses.map((classItem) => {
              const typeConfig = getClassTypeConfig(classItem.type);
              const TypeIcon = typeConfig.icon;
              const enrollmentPercentage = getEnrollmentPercentage(classItem.enrolled, classItem.capacity);
              
              return (
                <TableRow key={classItem.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <TypeIcon className="h-4 w-4" style={{ color: typeConfig.color }} />
                      <span className="font-medium">{classItem.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={classItem.trainer.avatar} />
                        <AvatarFallback className="text-xs text-white" style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' }}>
                          {classItem.trainer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{classItem.trainer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      style={{ color: '#2B7A78', borderColor: '#2B7A7840' }}
                    >
                      {typeConfig.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {new Date(classItem.date).toLocaleDateString('en-GB')}
                      </div>
                      <div className="text-gray-500">
                        {classItem.startTime} - {classItem.endTime}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{classItem.location}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {classItem.enrolled}/{classItem.capacity}
                      </div>
                      <Progress 
                        value={enrollmentPercentage} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={classItem.status === 'active' ? 'default' : 'secondary'}
                      style={classItem.status === 'active' ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                    >
                      {classItem.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewClass(classItem)}
                        className="h-7 w-7 p-0"
                        style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
                        onClick={() => handleBookClass(classItem)}
                      >
                        Book
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderClassDetailDialog = () => {
    if (!selectedClass) return null;

    const typeConfig = getClassTypeConfig(selectedClass.type);
    const TypeIcon = typeConfig.icon;
    const enrollmentPercentage = getEnrollmentPercentage(selectedClass.enrolled, selectedClass.capacity);

    return (
      <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
        <DialogContent className="max-w-2xl">
          {/* Hero Header */}
          <div 
            className="relative -m-6 mb-6 p-6 text-white rounded-t-lg"
            style={{ background: `linear-gradient(135deg, ${typeConfig.color}CC 0%, ${typeConfig.color}99 100%)` }}
          >
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <TypeIcon className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedClass.name}</h2>
                <p className="text-white/90 mt-1">
                  {typeConfig.name} • {selectedClass.duration} minutes
                </p>
              </div>
              <Avatar className="h-16 w-16 border-4 border-white/20">
                <AvatarImage src={selectedClass.trainer.avatar} />
                <AvatarFallback className="text-lg bg-white/20 text-white">
                  {selectedClass.trainer.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="space-y-6">
            {/* Class Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Schedule</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      <span>{new Date(selectedClass.date).toLocaleDateString('en-GB', { 
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{selectedClass.startTime} - {selectedClass.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{selectedClass.location}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Pricing</h3>
                  <div className="text-xl font-bold text-primary">
                    {selectedClass.price}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Trainer</h3>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedClass.trainer.avatar} />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {selectedClass.trainer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedClass.trainer.name}</div>
                      <div className="text-sm text-gray-500">
                        {selectedClass.trainer.experience} • ⭐ {selectedClass.trainer.rating}
                      </div>
                      <div className="text-xs text-gray-400">
                        {selectedClass.trainer.specialties.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Availability</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Enrolled</span>
                      <span>{selectedClass.enrolled}/{selectedClass.capacity}</span>
                    </div>
                    <Progress value={enrollmentPercentage} className="h-2" />
                    <div className="text-xs text-gray-500">
                      {selectedClass.capacity - selectedClass.enrolled} spots remaining
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2" style={{ color: '#2B7A78' }}>About This Class</h3>
              <p className="text-gray-600 leading-relaxed">
                {selectedClass.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                className="flex-1"
                style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
                onClick={() => {
                  handleBookClass(selectedClass);
                  setShowClassDialog(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book This Class
              </Button>
              <Button
                variant="outline"
                style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
                onClick={() => {
                  toast.info("Share Class", {
                    description: "Share functionality coming soon!"
                  });
                }}
              >
                Share
              </Button>
              <Button
                variant="outline"
                style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
                onClick={() => setShowClassDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#2B7A78' }}>
            Trainings & Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage fitness classes, training sessions, and group activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsStaffView(!isStaffView)}
            style={isStaffView ? { backgroundColor: '#2B7A7815', color: '#2B7A78', borderColor: '#2B7A7840' } : { color: '#2B7A78', borderColor: '#2B7A7840' }}
          >
            {isStaffView ? 'Member View' : 'Staff View'}
          </Button>
          <Button
            style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="shadow-sm" style={{ borderColor: '#2B7A7820' }}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search classes or trainers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                style={{ borderColor: '#2B7A7840' }}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" style={{ borderColor: '#2B7A7840' }}>
                  <SelectValue placeholder="Class Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {classTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                <SelectTrigger className="w-40" style={{ borderColor: '#2B7A7840' }}>
                  <SelectValue placeholder="Trainer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {mockTrainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={view === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("calendar")}
                  style={view === "calendar" ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                  className={view === "calendar" ? "" : "hover:bg-white"}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("list")}
                  style={view === "list" ? { background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' } : {}}
                  className={view === "list" ? "" : "hover:bg-white"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {view === "calendar" ? renderCalendarView() : renderListView()}

      {/* Class Detail Dialog */}
      {renderClassDetailDialog()}

      {/* Add Class Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
              Add New Class
            </DialogTitle>
            <DialogDescription>
              Create a new training class or session
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g., Morning Yoga Flow"
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class-type">Class Type</Label>
                <Select>
                  <SelectTrigger className="border-primary/20">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {classTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="trainer">Trainer</Label>
                <Select>
                  <SelectTrigger className="border-primary/20">
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTrainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  className="border-primary/20 focus:border-primary"
                />
              </div>
              
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Studio A"
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="20"
                className="border-primary/20 focus:border-primary"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border-primary/20"
            >
              Cancel
            </Button>
            <Button
              className="btn-primary"
              onClick={() => {
                toast.success("Class Added!", {
                  description: "New class has been successfully created",
                });
                setShowAddDialog(false);
              }}
            >
              Create Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <button
        className="fab md:hidden"
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

