import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  UserCheck, Calendar, Clock, TrendingUp, Users, Search, Download,
  CheckCircle, RefreshCw, LogOut, UserPlus, BarChart3, Briefcase
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { toast } from 'sonner';
import { staffAttendanceService, type AttendanceListItem, type AttendanceStats, type StaffAttendanceRecord } from '../utils/supabase/staff-attendance-service';

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtAvgDuration(minutes: number) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function exportCsv(items: AttendanceListItem[]) {
  const header = 'Name,ID,Type,Check In,Check Out,Duration,Activity,Status';
  const rows = items.map(r => [
    r.member_name || r.walk_in_name || 'Visitor',
    r.member_biz_id || '',
    r.type,
    r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '',
    r.check_out_time ? new Date(r.check_out_time).toLocaleString() : '',
    r.formatted_duration || '',
    r.activity_type || '',
    r.status,
  ].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AttendanceProps {
  onNavigate?: (section: string) => void;
}

export function Attendance({ onNavigate }: AttendanceProps = {}) {
  const [stats, setStats]             = useState<AttendanceStats | null>(null);
  const [records, setRecords]         = useState<AttendanceListItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm]   = useState('');
  const [selectedDate, setSelectedDate] = useState('today');
  const [page, setPage]               = useState(0);

  const [staffRecords, setStaffRecords]   = useState<StaffAttendanceRecord[]>([]);
  const [staffLoading, setStaffLoading]   = useState(true);
  const [staffSearch, setStaffSearch]     = useState('');

  // ── Data loading ────────────────────────────────────────────────────────────

  const resolveDate = () => {
    const today = new Date();
    if (selectedDate === 'today')     return { date: today.toISOString().split('T')[0] };
    if (selectedDate === 'yesterday') {
      const y = new Date(today); y.setDate(today.getDate() - 1);
      return { date: y.toISOString().split('T')[0] };
    }
    if (selectedDate === 'this-week') {
      const day = today.getDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day; // days to Monday
      const monday = new Date(today); monday.setDate(today.getDate() + diff);
      return {
        startDate: monday.toISOString().split('T')[0],
        endDate:   today.toISOString().split('T')[0],
      };
    }
    return { date: today.toISOString().split('T')[0] };
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { date, startDate, endDate } = resolveDate() as any;
      const res = await staffAttendanceService.getAttendance(date, searchTerm || undefined, page, 50, startDate, endDate);
      setRecords(res.items);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, searchTerm, page]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await staffAttendanceService.getStats();
      setStats(s);
    } catch {
      // non-fatal — show dashes
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadStaffRecords = useCallback(async () => {
    setStaffLoading(true);
    try {
      const data = await staffAttendanceService.getTodayStaffAttendance();
      setStaffRecords(data);
    } catch {
      // non-fatal
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadStaffRecords(); }, [loadStaffRecords]);

  // ── Checkout ────────────────────────────────────────────────────────────────

  const handleCheckOut = async (record: AttendanceListItem) => {
    const name = record.member_name || record.walk_in_name || 'Visitor';
    setCheckingOutId(record.id);
    try {
      const res = await staffAttendanceService.checkout(record.id);
      toast.success(`${name} checked out — ${res.formatted_duration || ''}`);
      loadRecords();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setCheckingOutId(null);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const weeklyData   = stats?.weekly_trend  || [];
  const monthlyData  = stats?.monthly_trend || [];

  // Busiest / quietest day from weekly trend
  const busiestDay  = weeklyData.reduce((a, b) => b.visits > a.visits ? b : a, { day: '—', visits: 0, date: '' });
  const quietestDay = weeklyData.reduce((a, b) => b.visits < a.visits ? b : a, { day: '—', visits: Infinity, date: '' });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 bg-gymbios-main-bg">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gymbios-heading">Attendance</h1>
          <p className="text-muted-foreground">Track member attendance and gym usage patterns.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => { loadRecords(); loadStats(); }}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading || statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(records)} disabled={records.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Today's Visits</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg"><UserCheck className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statsLoading ? '—' : stats?.today_visits ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '' : `${stats?.active_now ?? 0} currently active`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Average Duration</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg"><Clock className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statsLoading ? '—' : fmtAvgDuration(stats?.avg_duration_minutes ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per visit today</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Peak Hours</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg"><TrendingUp className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {statsLoading ? '—' : stats?.peak_hour || '—'}
            </div>
            <p className="text-xs text-muted-foreground">Busiest time today</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Attendance Rate</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg"><Users className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statsLoading ? '—' : `${stats?.attendance_rate ?? 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">Of active members</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="bg-gradient-light">
          <TabsTrigger value="today" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            Today's Attendance
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Staff &amp; Trainers
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            Weekly Trends
          </TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            Monthly Analysis
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            Reports
          </TabsTrigger>
        </TabsList>

        {/* ── Today's attendance table ── */}
        <TabsContent value="today" className="space-y-4">
          <Card className="border-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-primary">Today's Check-ins</CardTitle>
                  <CardDescription>Real-time attendance tracking · {total} records</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      className="pl-10 w-52 border-primary/20 focus:border-primary"
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                    />
                  </div>
                  <Select value={selectedDate} onValueChange={v => { setSelectedDate(v); setPage(0); }}>
                    <SelectTrigger className="w-36 border-primary/20">
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
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm">No attendance records found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(record => {
                      const name     = record.member_name || record.walk_in_name || 'Visitor';
                      const bizId    = record.member_biz_id || '';
                      const isActive = record.status === 'active';
                      const isOut    = checkingOutId === record.id;
                      return (
                        <TableRow key={record.id} className="hover:bg-gradient-light/50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8 border border-primary/20">
                                <AvatarImage src={record.photo_url} />
                                <AvatarFallback className="bg-gradient-light text-primary text-xs">
                                  {initials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  {bizId}
                                  {record.type === 'walk_in' && (
                                    <Badge className="bg-blue-50 text-blue-700 border-0 text-xs h-4">Walk-in</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Clock className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                              {fmt(record.check_in_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.check_out_time ? (
                              <div className="flex items-center text-sm">
                                <Clock className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                                {fmt(record.check_out_time)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">In progress</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {record.formatted_duration || '—'}
                          </TableCell>
                          <TableCell>
                            {record.activity_type ? (
                              <Badge variant="outline" className="text-xs border-primary/20">{record.activity_type}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                <Clock className="mr-1 h-3 w-3" /> Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">
                                <CheckCircle className="mr-1 h-3 w-3" /> Completed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleCheckOut(record)}
                                disabled={isOut}
                              >
                                {isOut
                                  ? <div className="animate-spin rounded-full h-3 w-3 border-b border-red-500 mr-1" />
                                  : <LogOut className="mr-1 h-3 w-3" />
                                }
                                Check Out
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {total > 50 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground">Showing {page * 50 + 1}–{Math.min((page + 1) * 50, total)} of {total}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 50 >= total}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Staff & Trainers tab ── */}
        <TabsContent value="staff" className="space-y-4">
          <Card className="border-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Staff &amp; Trainer Attendance
                  </CardTitle>
                  <CardDescription>Today's clock-in / clock-out records · {staffRecords.length} records</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      className="pl-10 w-52 border-primary/20 focus:border-primary"
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={loadStaffRecords}>
                    <RefreshCw className={`h-4 w-4 ${staffLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {staffLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
                </div>
              ) : staffRecords.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm">No staff have clocked in today</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffRecords
                      .filter(r => !staffSearch || r.staff_name.toLowerCase().includes(staffSearch.toLowerCase()) || r.staff_biz_id.toLowerCase().includes(staffSearch.toLowerCase()))
                      .map(record => (
                        <TableRow key={record.id} className="hover:bg-gradient-light/50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8 border border-primary/20">
                                <AvatarImage src={record.photo_url} />
                                <AvatarFallback className="bg-gradient-light text-primary text-xs">
                                  {initials(record.staff_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{record.staff_name}</div>
                                <div className="text-xs text-muted-foreground">{record.staff_biz_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-primary/20">{record.staff_role}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Clock className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                              {fmt(record.clock_in_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.clock_out_time ? (
                              <div className="flex items-center text-sm">
                                <Clock className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                                {fmt(record.clock_out_time)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">Still working</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {record.formatted_duration || '—'}
                          </TableCell>
                          <TableCell>
                            {record.status === 'working' ? (
                              <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                <CheckCircle className="mr-1 h-3 w-3" /> Working
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">
                                <CheckCircle className="mr-1 h-3 w-3" /> Done
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Weekly Trends ── */}
        <TabsContent value="weekly" className="space-y-6">
          <Card className="border-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <CardTitle className="text-primary">Weekly Attendance Trends</CardTitle>
              <CardDescription>Daily visit patterns for the current week</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {statsLoading ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="#2B7A78" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/10 shadow-md">
              <CardHeader><CardTitle className="text-primary text-sm">Busiest Day</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{busiestDay.day}</div>
                <p className="text-sm text-muted-foreground">{busiestDay.visits} visits</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md">
              <CardHeader><CardTitle className="text-primary text-sm">Quietest Day</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{quietestDay.day}</div>
                <p className="text-sm text-muted-foreground">{quietestDay.visits === Infinity ? 0 : quietestDay.visits} visits</p>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md">
              <CardHeader><CardTitle className="text-primary text-sm">Total This Week</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {weeklyData.reduce((s, d) => s + d.visits, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Combined visits</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Monthly Analysis ── */}
        <TabsContent value="monthly" className="space-y-6">
          <Card className="border-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <CardTitle className="text-primary">Monthly Attendance Trends</CardTitle>
              <CardDescription>Visit patterns for the current year</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {statsLoading ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#2B7A78" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'This Month',
                value: monthlyData[new Date().getMonth()]?.visits ?? 0,
                sub: 'Total visits',
              },
              {
                label: 'Daily Average',
                value: monthlyData[new Date().getMonth()]
                  ? Math.round((monthlyData[new Date().getMonth()].visits) / new Date().getDate())
                  : 0,
                sub: 'Visits per day',
              },
              {
                label: 'Active Members',
                value: stats?.total_active_members ?? 0,
                sub: 'With active membership',
              },
              {
                label: 'Attendance Rate',
                value: `${stats?.attendance_rate ?? 0}%`,
                sub: 'Of active members today',
              },
            ].map(card => (
              <Card key={card.label} className="border-primary/10 shadow-md">
                <CardHeader><CardTitle className="text-primary text-sm">{card.label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{card.value}</div>
                  <p className="text-sm text-muted-foreground">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="border-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <CardTitle className="text-primary">Attendance Reports</CardTitle>
              <CardDescription>Generate detailed attendance reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="bg-gradient-light p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <UserCheck className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-primary">Advanced Attendance Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Generate comprehensive reports on member attendance patterns, peak hours, and facility utilisation.
                </p>
                <div className="flex justify-center gap-3">
                  <Button className="btn-primary" onClick={() => onNavigate?.('attendance-reports')}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Detailed Reports
                  </Button>
                  <Button variant="outline" className="border-primary/30" onClick={() => exportCsv(records)} disabled={records.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
