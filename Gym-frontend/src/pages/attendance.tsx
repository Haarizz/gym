import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  Search, 
  Filter,
  Download,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const attendanceData = [
  {
    id: 1,
    memberName: "Sarah Johnson",
    avatar: "/avatars/sarah.jpg",
    checkIn: "06:30 AM",
    checkOut: "08:15 AM",
    date: "2024-09-24",
    duration: "1h 45m",
    activity: "Strength Training"
  },
  {
    id: 2,
    memberName: "Mike Chen",
    avatar: "/avatars/mike.jpg",
    checkIn: "07:00 AM",
    checkOut: "08:30 AM",
    date: "2024-09-24",
    duration: "1h 30m",
    activity: "HIIT Class"
  },
  {
    id: 3,
    memberName: "Emily Rodriguez",
    avatar: "/avatars/emily.jpg",
    checkIn: "05:45 PM",
    checkOut: "07:00 PM",
    date: "2024-09-24",
    duration: "1h 15m",
    activity: "Yoga Class"
  },
  {
    id: 4,
    memberName: "David Thompson",
    avatar: "/avatars/david.jpg",
    checkIn: "12:00 PM",
    checkOut: "01:30 PM",
    date: "2024-09-24",
    duration: "1h 30m",
    activity: "Cardio"
  }
];

const weeklyAttendance = [
  { day: 'Mon', visits: 45 },
  { day: 'Tue', visits: 52 },
  { day: 'Wed', visits: 38 },
  { day: 'Thu', visits: 61 },
  { day: 'Fri', visits: 44 },
  { day: 'Sat', visits: 67 },
  { day: 'Sun', visits: 31 },
];

const monthlyTrends = [
  { month: 'Jan', visits: 1230 },
  { month: 'Feb', visits: 1450 },
  { month: 'Mar', visits: 1320 },
  { month: 'Apr', visits: 1580 },
  { month: 'May', visits: 1420 },
  { month: 'Jun', visits: 1650 },
];

interface AttendanceProps {
  onNavigate?: (section: string) => void;
}

export function Attendance({ onNavigate }: AttendanceProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");

  const filteredAttendance = attendanceData.filter(record =>
    record.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.activity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayVisits = attendanceData.length;
  const avgDuration = "1h 30m";
  const peakHour = "6-7 PM";
  const totalMembers = 521;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track member attendance and gym usage patterns.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayVisits}</div>
            <p className="text-xs text-muted-foreground">
              Active check-ins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration}</div>
            <p className="text-xs text-muted-foreground">
              Per visit today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakHour}</div>
            <p className="text-xs text-muted-foreground">
              Busiest time today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">
              Of active members
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList>
          <TabsTrigger value="today">Today's Attendance</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Trends</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Check-ins</CardTitle>
                  <CardDescription>Real-time attendance tracking</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      className="pl-10 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="today">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={record.avatar} />
                            <AvatarFallback>{record.memberName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{record.memberName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-green-600" />
                          {record.checkIn}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-red-600" />
                            {record.checkOut}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">In progress</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{record.duration}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.activity}</Badge>
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Attendance Trends</CardTitle>
              <CardDescription>Daily visit patterns throughout the week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="visits" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Busiest Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">Saturday</div>
                <p className="text-sm text-muted-foreground">67 visits average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quietest Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">Sunday</div>
                <p className="text-sm text-muted-foreground">31 visits average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">+8.2%</div>
                <p className="text-sm text-muted-foreground">vs last week</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attendance Trends</CardTitle>
              <CardDescription>Long-term attendance patterns and growth</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="visits" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,650</div>
                <p className="text-sm text-muted-foreground">Total visits</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">55</div>
                <p className="text-sm text-muted-foreground">Visits per day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">89%</div>
                <p className="text-sm text-muted-foreground">Regular attendees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">+16%</div>
                <p className="text-sm text-muted-foreground">Year over year</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
              <CardDescription>Generate detailed attendance reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="bg-gradient-light p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <UserCheck className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Advanced Attendance Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Generate comprehensive reports on member attendance patterns, peak hours, and facility utilization.
                </p>
                <Button 
                  className="btn-primary"
                  onClick={() => onNavigate?.('attendance-reports')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Detailed Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

