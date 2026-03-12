import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Calendar, CalendarDays, Clock, Plus, Users, MapPin, Edit, Trash2 } from 'lucide-react';
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

const classes = [
  {
    id: 1,
    name: "Morning Yoga",
    instructor: "Sarah Johnson",
    time: "07:00 - 08:00",
    date: "2024-09-25",
    capacity: 20,
    enrolled: 18,
    room: "Studio A",
    type: "Yoga",
    status: "confirmed"
  },
  {
    id: 2,
    name: "HIIT Training",
    instructor: "Mike Chen",
    time: "09:00 - 10:00",
    date: "2024-09-25",
    capacity: 15,
    enrolled: 15,
    room: "Main Floor",
    type: "HIIT",
    status: "full"
  },
  {
    id: 3,
    name: "Pilates Basics",
    instructor: "Emily Rodriguez",
    time: "18:00 - 19:00",
    date: "2024-09-25",
    capacity: 12,
    enrolled: 8,
    room: "Studio B",
    type: "Pilates",
    status: "confirmed"
  },
  {
    id: 4,
    name: "Strength Training",
    instructor: "David Thompson",
    time: "19:30 - 20:30",
    date: "2024-09-25",
    capacity: 10,
    enrolled: 6,
    room: "Weight Room",
    type: "Strength",
    status: "confirmed"
  },
  {
    id: 5,
    name: "Evening Yoga",
    instructor: "Lisa Wong",
    time: "20:00 - 21:00",
    date: "2024-09-26",
    capacity: 16,
    enrolled: 12,
    room: "Studio A",
    type: "Yoga",
    status: "confirmed"
  },
  {
    id: 6,
    name: "CrossFit",
    instructor: "John Smith",
    time: "06:00 - 07:00",
    date: "2024-09-26",
    capacity: 12,
    enrolled: 0,
    room: "Main Floor",
    type: "CrossFit",
    status: "pending"
  }
];

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

const rooms = ["Studio A", "Studio B", "Main Floor", "Weight Room", "Cardio Area"];
const instructors = ["Sarah Johnson", "Mike Chen", "Emily Rodriguez", "David Thompson", "Lisa Wong", "John Smith"];

export function Scheduling() {
  const [selectedDate, setSelectedDate] = useState("2024-09-25");
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const filteredClasses = classes.filter(cls => {
    if (viewMode === "day") {
      return cls.date === selectedDate;
    }
    // For week view, you would filter for the selected week
    return cls.date >= selectedDate && cls.date <= "2024-09-27";
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "full": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Yoga": return "bg-purple-100 text-purple-800";
      case "HIIT": return "bg-orange-100 text-orange-800";
      case "Pilates": return "bg-pink-100 text-pink-800";
      case "Strength": return "bg-blue-100 text-blue-800";
      case "CrossFit": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class Scheduling</h1>
          <p className="text-muted-foreground">Manage classes, instructors, and bookings.</p>
        </div>
        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule New Class</DialogTitle>
                <DialogDescription>
                  Create a new class session for your members.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name</Label>
                  <Input id="className" placeholder="Morning Yoga" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instructor">Instructor</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor} value={instructor}>
                            {instructor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Start Time</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input id="duration" type="number" placeholder="60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" type="number" placeholder="20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Class description..." />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button>Schedule Class</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                onClick={() => setViewMode("day")}
              >
                Day View
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
              >
                Week View
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Schedule */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Classes for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
            <CardDescription>
              {filteredClasses.length} classes scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredClasses.sort((a, b) => a.time.localeCompare(b.time)).map((cls) => (
                <div key={cls.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{cls.name}</h3>
                        <Badge className={getTypeColor(cls.type)}>
                          {cls.type}
                        </Badge>
                        <Badge className={getStatusColor(cls.status)}>
                          {cls.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{cls.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{cls.enrolled}/{cls.capacity} enrolled</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{cls.room}</span>
                        </div>
                        <div>
                          <span>Instructor: {cls.instructor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {cls.capacity > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Enrollment</span>
                        <span>{Math.round((cls.enrolled / cls.capacity) * 100)}% full</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(cls.enrolled / cls.capacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredClasses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No classes scheduled for this date.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

