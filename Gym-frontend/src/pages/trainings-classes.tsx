import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
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
import {
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  Eye,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Dumbbell,
  CalendarDays,
  Grid3X3,
  List,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { trainingService, TrainingSessionApi } from "../utils/supabase/training-service";
import { staffService, Staff } from "../utils/supabase/staff-service";

const classTypes = [
  { id: "class", name: "Group Class", color: "#2B7A78", icon: Users },
  { id: "pt", name: "Personal Training", color: "#E63946", icon: Dumbbell },
  { id: "facility", name: "Facility Booking", color: "#2563EB", icon: MapPin },
];

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00"
];

interface TrainingsClassesProps {
  onNavigate?: (section: string) => void;
}

interface TrainerProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  rating?: number;
  experience?: string;
  specialties?: string[];
}

interface ClassItem {
  id: string;
  name: string;
  trainer: TrainerProfile;
  type: "class" | "pt" | "facility";
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  capacity: number;
  enrolled: number;
  status: "active" | "cancelled";
  description: string;
  price: number;
}

export function TrainingsClasses({ onNavigate }: TrainingsClassesProps) {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTrainer, setFilterTrainer] = useState("all");
  const [isStaffView, setIsStaffView] = useState(false);
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionApi[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);
  const [newClassData, setNewClassData] = useState({
    name: "",
    type: "class",
    trainerId: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    capacity: "",
    price: "",
  });
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const formatTime = (value?: string | null) => {
    if (!value) return "";
    return value.length >= 5 ? value.slice(0, 5) : value;
  };

  const calculateDurationMinutes = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);
    const diff = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  };

  const resolveSlotKey = (value?: string) => {
    if (!value) return "";
    const parts = value.split(":");
    if (parts.length < 2) return "";
    return `${parts[0].padStart(2, "0")}:00`;
  };

  const formatPrice = (price: number) => `${price} AED`;

  const getExperienceLabel = (joinDate?: string) => {
    if (!joinDate) return "Trainer";
    const parsed = new Date(joinDate);
    if (Number.isNaN(parsed.getTime())) return "Trainer";
    const years = Math.max(0, new Date().getFullYear() - parsed.getFullYear());
    return years > 0 ? `${years} years` : "New Coach";
  };

  const mapTrainer = (staff: Staff): TrainerProfile => ({
    id: String(staff.id),
    name: staff.name,
    email: staff.email,
    avatar: staff.photo_url || undefined,
    rating: 4.8,
    experience: getExperienceLabel(staff.join_date),
    specialties: [staff.department, staff.role].filter(Boolean),
  });

  const trainerLookup = useMemo(() => {
    const map = new Map<string, TrainerProfile>();
    trainers.forEach((trainer) => {
      map.set(trainer.id, trainer);
    });
    return map;
  }, [trainers]);

  const classes = useMemo(() => {
    return sessions.map((session) => {
      const trainerId = session.trainerId ? String(session.trainerId) : "";
      const fallbackTrainer: TrainerProfile = {
        id: trainerId || "trainer",
        name: session.trainerName || "Trainer",
        rating: 4.8,
        experience: "Trainer",
        specialties: [],
      };
      const trainer = trainerLookup.get(trainerId) || fallbackTrainer;
      const startTime = formatTime(session.startTime);
      const endTime = formatTime(session.endTime);
      const duration = session.durationMinutes ?? calculateDurationMinutes(startTime, endTime);

      return {
        id: String(session.id),
        name: session.name,
        trainer,
        type: session.type,
        date: session.date,
        startTime,
        endTime,
        duration,
        location: session.location || "Main Studio",
        capacity: Number(session.capacity ?? 0),
        enrolled: Number(session.booked ?? 0),
        status: (session.status as ClassItem["status"]) || "active",
        description: session.description || "Session details will be shared at the front desk.",
        price: Number(session.price ?? 0),
      };
    });
  }, [sessions, trainerLookup]);

  const resetNewClassForm = () => {
    setNewClassData({
      name: "",
      type: "class",
      trainerId: "",
      date: selectedDate.toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      location: "",
      capacity: "",
      price: "",
    });
    setEditingClassId(null);
  };

  const fetchTrainers = async () => {
    const response = await staffService.getStaff({}, 1, 200);
    setTrainers(response.items.map(mapTrainer));
  };

  const fetchSessions = async () => {
    const response = await trainingService.getSessions();
    setSessions(response);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchTrainers(), fetchSessions()]);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load trainings data");
      }
    };
    load();
  }, []);

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
    if (!capacity) return 0;
    return Math.round((enrolled / capacity) * 100);
  };

  const totalClasses = classes.length;
  const activeClasses = classes.filter((cls) => cls.status === "active").length;
  const totalTrainers = trainers.length;
  const avgFill = classes.length
    ? Math.round(classes.reduce((sum, cls) => sum + getEnrollmentPercentage(cls.enrolled, cls.capacity), 0) / classes.length)
    : 0;

  const handleViewClass = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setShowClassDialog(true);
  };

  const handleBookClass = (classItem: ClassItem) => {
    if (onNavigate) {
      onNavigate("bookings");
      toast.info("Continue booking in Bookings Management.");
      return;
    }
    toast.success("Class Booked!", {
      description: `Successfully booked ${classItem.name} with ${classItem.trainer.name}`,
    });
  };

  const handleCreateClass = async () => {
    if (!newClassData.name.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (!newClassData.date) {
      toast.error("Class date is required");
      return;
    }
    if (!newClassData.startTime || !newClassData.endTime) {
      toast.error("Start and end time are required");
      return;
    }
    const duration = calculateDurationMinutes(newClassData.startTime, newClassData.endTime);
    if (!duration) {
      toast.error("End time must be after start time");
      return;
    }

    const rawCapacity = Number(newClassData.capacity);
    const capacity = rawCapacity > 0 ? rawCapacity : 1;
    const rawPrice = Number(newClassData.price);
    const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
    const payload = {
      name: newClassData.name.trim(),
      type: newClassData.type as "class" | "pt" | "facility",
      trainerId: newClassData.trainerId ? Number(newClassData.trainerId) : undefined,
      date: newClassData.date,
      startTime: newClassData.startTime,
      endTime: newClassData.endTime,
      durationMinutes: duration,
      location: newClassData.location || "Main Studio",
      capacity,
      price,
      status: "active",
      description: "",
    };

    try {
      if (editingClassId) {
        await trainingService.updateSession(editingClassId, payload);
      } else {
        await trainingService.createSession(payload);
      }
      await fetchSessions();
      toast.success(editingClassId ? "Class Updated!" : "Class Added!", {
        description: editingClassId
          ? "Class schedule has been updated"
          : "New class has been successfully created",
      });
      setShowAddDialog(false);
      resetNewClassForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save class");
    }
  };

  const handleEditClass = (classItem: ClassItem) => {
    setEditingClassId(classItem.id);
    setNewClassData({
      name: classItem.name,
      type: classItem.type,
      trainerId: classItem.trainer.id || "",
      date: classItem.date,
      startTime: classItem.startTime,
      endTime: classItem.endTime,
      location: classItem.location,
      capacity: String(classItem.capacity ?? ""),
      price: String(classItem.price ?? ""),
    });
    setShowAddDialog(true);
  };

  const handleDeleteClass = async (classItem: ClassItem) => {
    setClassToDelete(classItem);
    setShowDeleteDialog(true);
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await trainingService.deleteSession(classToDelete.id);
      await fetchSessions();
      toast.success("Class deleted");
      if (selectedClass?.id === classToDelete.id) {
        setShowClassDialog(false);
        setSelectedClass(null);
      }
      setShowDeleteDialog(false);
      setClassToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete class");
    }
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
                    const classDate = new Date(`${cls.date}T00:00:00`);
                    const slotKey = resolveSlotKey(cls.startTime);
                    return classDate.toDateString() === day.toDateString() &&
                           slotKey === time;
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
                                {isStaffView ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 border-primary/20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClass(classItem);
                                      }}
                                    >
                                      Reschedule
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 border-red-200 text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClass(classItem);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  <>
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
                                  </>
                                )}
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
        {filteredClasses.length === 0 && (
          <div className="text-center text-sm text-gray-500">
            No sessions scheduled for the selected week.
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-primary/10 overflow-hidden">
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
                        {new Date(`${classItem.date}T00:00:00`).toLocaleDateString('en-GB')}
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
                      {isStaffView ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClass(classItem)}
                            className="h-7 w-7 p-0"
                            style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClass(classItem)}
                            className="h-7 w-7 p-0"
                            style={{ borderColor: '#E6394640', color: '#E63946' }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
                          onClick={() => handleBookClass(classItem)}
                        >
                          Book
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredClasses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-gray-500">
                  No sessions match the current filters.
                </TableCell>
              </TableRow>
            )}
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
    const trainerExperience = selectedClass.trainer.experience || "Trainer";
    const trainerRating = selectedClass.trainer.rating ?? 4.8;
    const trainerSpecialties = selectedClass.trainer.specialties?.length
      ? selectedClass.trainer.specialties.join(", ")
      : "General Training";

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
                  {typeConfig.name} - {selectedClass.duration} minutes
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
                      <span>{new Date(`${selectedClass.date}T00:00:00`).toLocaleDateString('en-GB', { 
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
                    {formatPrice(selectedClass.price)}
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
                        {trainerExperience} - {trainerRating} rating
                      </div>
                      <div className="text-xs text-gray-400">
                        {trainerSpecialties}
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
              {isStaffView ? (
                <>
                  <Button
                    className="flex-1"
                    style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                    onClick={() => {
                      handleEditClass(selectedClass);
                      setShowClassDialog(false);
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    style={{ borderColor: '#E6394640', color: '#E63946' }}
                    onClick={() => handleDeleteClass(selectedClass)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    style={{ borderColor: '#2B7A7840', color: '#2B7A78' }}
                    onClick={() => setShowClassDialog(false)}
                  >
                    Close
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trainings & Classes</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage fitness classes, training sessions, and group activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsStaffView(!isStaffView)}
            className={isStaffView ? "bg-primary/10 text-primary border-primary/30" : "border-primary/30 text-primary"}
          >
            {isStaffView ? 'Member View' : 'Staff View'}
          </Button>
          <Button
            onClick={() => {
              resetNewClassForm();
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Classes</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalClasses}</div>
            <p className="text-xs text-muted-foreground">All scheduled sessions</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Classes</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeClasses}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Trainers</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <User className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalTrainers}</div>
            <p className="text-xs text-muted-foreground">Available coaches</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Fill</CardTitle>
            <div className="bg-amber-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{avgFill}%</div>
            <p className="text-xs text-muted-foreground">Average occupancy</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className={cardShell}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search classes or trainers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-0 bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 border-0 bg-muted/40">
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
                <SelectTrigger className="w-40 border-0 bg-muted/40">
                  <SelectValue placeholder="Trainer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.map((trainer) => (
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
      <div key={view} className="animate-in fade-in-0 zoom-in-95 duration-200">
        {view === "calendar" ? renderCalendarView() : renderListView()}
      </div>

      {/* Class Detail Dialog */}
      {renderClassDetailDialog()}

      {/* Add Class Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (open) {
            setNewClassData((prev) => ({
              ...prev,
              date: selectedDate.toISOString().split("T")[0],
            }));
          } else {
            resetNewClassForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {editingClassId ? "Reschedule Class" : "Add New Class"}
            </DialogTitle>
            <DialogDescription>
              {editingClassId ? "Update the class schedule details" : "Create a new training class or session"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="class-name" className="block mb-2">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g., Morning Yoga Flow"
                value={newClassData.name}
                onChange={(e) => setNewClassData((prev) => ({ ...prev, name: e.target.value }))}
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class-type" className="block mb-2">Class Type</Label>
                <Select
                  value={newClassData.type}
                  onValueChange={(value) => setNewClassData((prev) => ({ ...prev, type: value }))}
                >
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
                <Label htmlFor="trainer" className="block mb-2">Trainer</Label>
                <Select
                  value={newClassData.trainerId}
                  onValueChange={(value) => setNewClassData((prev) => ({ ...prev, trainerId: value }))}
                >
                  <SelectTrigger className="border-primary/20">
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="class-date" className="block mb-2">Date</Label>
              <Input
                id="class-date"
                type="date"
                value={newClassData.date}
                onChange={(e) => setNewClassData((prev) => ({ ...prev, date: e.target.value }))}
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time" className="block mb-2">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newClassData.startTime}
                  onChange={(e) => setNewClassData((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="border-primary/20 focus:border-primary"
                />
              </div>
              
              <div>
                <Label htmlFor="end-time" className="block mb-2">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newClassData.endTime}
                  onChange={(e) => setNewClassData((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="location" className="block mb-2">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Studio A"
                value={newClassData.location}
                onChange={(e) => setNewClassData((prev) => ({ ...prev, location: e.target.value }))}
                className="border-primary/20 focus:border-primary"
              />
            </div>
            
            <div>
              <Label htmlFor="capacity" className="block mb-2">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="20"
                value={newClassData.capacity}
                onChange={(e) => setNewClassData((prev) => ({ ...prev, capacity: e.target.value }))}
                className="border-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <Label htmlFor="price" className="block mb-2">Price</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  value={newClassData.price}
                  onChange={(e) => setNewClassData((prev) => ({ ...prev, price: e.target.value }))}
                  className="border-primary/20 focus:border-primary"
                />
                <span className="text-sm font-medium text-gray-500">AED</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetNewClassForm();
              }}
              className="border-primary/20"
            >
              Cancel
            </Button>
            <Button
              className="btn-primary"
              onClick={handleCreateClass}
            >
              {editingClassId ? "Save Changes" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Class Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) {
            setClassToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
              Delete Class
            </DialogTitle>
            <DialogDescription className="text-center">
              This action cannot be undone. The class will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          {classToDelete && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm">
                <div className="font-medium text-gray-900">{classToDelete.name}</div>
                <div className="text-gray-600">{classToDelete.trainer.name}</div>
                <div className="text-xs text-gray-500">
                  {classToDelete.date} at {classToDelete.startTime}
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
                  onClick={handleConfirmDeleteClass}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
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

