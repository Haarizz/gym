import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Play,
  Pause,
  Users,
  Clock,
  Calendar,
  Video,
  Plus,
  Edit,
  Trash2,
  Monitor,
  Upload,
  Download,
  Eye,
  Heart,
  BarChart3,
  Building2,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  Radio,
  Filter
} from 'lucide-react';
import { trainingStreamsService, TrainingStreamApi, TrainingStreamRequest, TrainingStreamAnalytics } from '../utils/supabase/training-streams-service';
import { staffService } from '../utils/supabase/staff-service';
import type { Staff } from '../utils/supabase/staff-service';

const CATEGORIES = ["HIIT", "Yoga", "Strength", "Cardio", "Pilates", "Dance"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const STREAM_TYPES = [
  { value: "live", label: "Live Stream" },
  { value: "recording", label: "Pre-recorded" },
  { value: "hybrid", label: "Hybrid (Live + Recording)" },
];

const CATEGORY_COLORS: Record<string, string> = {
  HIIT: "bg-red-100 text-red-800",
  Yoga: "bg-purple-100 text-purple-800",
  Strength: "bg-blue-100 text-blue-800",
  Cardio: "bg-green-100 text-green-800",
  Pilates: "bg-pink-100 text-pink-800",
  Dance: "bg-yellow-100 text-yellow-800",
};

interface TrainingStreamsProps {
  onNavigate?: (section: string) => void;
}

const emptyForm = (): TrainingStreamRequest => ({
  title: '',
  instructor_id: null,
  category: '',
  duration: 45,
  difficulty: 'Beginner',
  max_participants: 30,
  status: 'Scheduled',
  scheduled_time: null,
  description: '',
  stream_url: '',
  stream_type: 'live',
});

export function TrainingStreams({ onNavigate }: TrainingStreamsProps = {}) {
  const [streams, setStreams] = useState<TrainingStreamApi[]>([]);
  const [analytics, setAnalytics] = useState<TrainingStreamAnalytics | null>(null);
  const [instructors, setInstructors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamFilter, setStreamFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TrainingStreamRequest>(emptyForm());
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editStream, setEditStream] = useState<TrainingStreamApi | null>(null);
  const [editForm, setEditForm] = useState<Partial<TrainingStreamRequest>>({});
  const [saving, setSaving] = useState(false);

  // Upload recording dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', category: '', duration: 45, difficulty: 'Beginner', instructor_id: null as number | null, description: '', stream_url: '' });
  const [uploading, setUploading] = useState(false);

  // View Stream / Monitor / Watch dialogs
  const [viewStream, setViewStream] = useState<TrainingStreamApi | null>(null);
  const [monitorStream, setMonitorStream] = useState<TrainingStreamApi | null>(null);
  const [watchStream, setWatchStream] = useState<TrainingStreamApi | null>(null);

  // Library category filter
  const [libraryCategory, setLibraryCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [streamsData, analyticsData, staffData] = await Promise.all([
        trainingStreamsService.getStreams(),
        trainingStreamsService.getAnalytics(),
        staffService.getStaff({}, 1, 200),
      ]);
      setStreams(streamsData);
      setAnalytics(analyticsData);
      setInstructors(staffData.items);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live": return "bg-red-100 text-red-800";
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Ended": return "bg-gray-100 text-gray-800";
      case "Cancelled": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-100 text-green-800";
      case "Intermediate": return "bg-yellow-100 text-yellow-800";
      case "Advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredStreams = streamFilter === "all"
    ? streams
    : streams.filter(s => s.status.toLowerCase() === streamFilter.toLowerCase());

  const liveStreams = streams.filter(s => s.status === "Live");
  const scheduledStreams = streams.filter(s => s.status === "Scheduled");
  const endedStreams = streams.filter(s => s.status === "Ended");

  const getInitials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  // --- Create Stream ---
  const handleCreate = async () => {
    if (!createForm.title || !createForm.category || !createForm.duration) return;
    try {
      setCreating(true);
      const created = await trainingStreamsService.createStream(createForm);
      setStreams(prev => [created, ...prev]);
      setCreateOpen(false);
      setCreateForm(emptyForm());
      // refresh analytics
      trainingStreamsService.getAnalytics().then(setAnalytics).catch(() => {});
    } catch (e: any) {
      alert(e.message || 'Failed to create stream');
    } finally {
      setCreating(false);
    }
  };

  // --- Edit Stream ---
  const openEdit = (stream: TrainingStreamApi) => {
    setEditStream(stream);
    setEditForm({
      title: stream.title,
      category: stream.category,
      duration: stream.duration,
      difficulty: stream.difficulty,
      max_participants: stream.max_participants,
      description: stream.description || '',
      stream_url: stream.stream_url || '',
      stream_type: stream.stream_type,
      instructor_id: stream.instructor_id,
    });
  };

  const handleSaveEdit = async () => {
    if (!editStream) return;
    try {
      setSaving(true);
      const updated = await trainingStreamsService.updateStream(editStream.id, editForm);
      setStreams(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditStream(null);
    } catch (e: any) {
      alert(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // --- Delete Stream ---
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stream?')) return;
    try {
      await trainingStreamsService.deleteStream(id);
      setStreams(prev => prev.filter(s => s.id !== id));
      trainingStreamsService.getAnalytics().then(setAnalytics).catch(() => {});
    } catch (e: any) {
      alert(e.message || 'Failed to delete stream');
    }
  };

  // --- Start / End Stream ---
  const handleStartStream = async (id: string) => {
    try {
      const updated = await trainingStreamsService.startStream(id);
      setStreams(prev => prev.map(s => s.id === updated.id ? updated : s));
      trainingStreamsService.getAnalytics().then(setAnalytics).catch(() => {});
    } catch (e: any) {
      alert(e.message || 'Failed to start stream');
    }
  };

  const handleEndStream = async (id: string) => {
    if (!confirm('End this live stream?')) return;
    try {
      const updated = await trainingStreamsService.endStream(id);
      setStreams(prev => prev.map(s => s.id === updated.id ? updated : s));
      trainingStreamsService.getAnalytics().then(setAnalytics).catch(() => {});
    } catch (e: any) {
      alert(e.message || 'Failed to end stream');
    }
  };

  // --- Upload Recording (pre-recorded) ---
  const handleUploadRecording = async () => {
    if (!uploadForm.title || !uploadForm.category) return;
    try {
      setUploading(true);
      const payload: TrainingStreamRequest = {
        ...uploadForm,
        status: 'Ended',
        stream_type: 'recording',
      };
      const created = await trainingStreamsService.createStream(payload);
      setStreams(prev => [created, ...prev]);
      setUploadOpen(false);
      setUploadForm({ title: '', category: '', duration: 45, difficulty: 'Beginner', instructor_id: null, description: '', stream_url: '' });
      trainingStreamsService.getAnalytics().then(setAnalytics).catch(() => {});
    } catch (e: any) {
      alert(e.message || 'Failed to upload recording');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  const liveCount = analytics?.live_count ?? liveStreams.length;
  const scheduledCount = analytics?.scheduled_count ?? scheduledStreams.length;
  const activeViewers = analytics?.active_viewers ?? streams.reduce((s, x) => s + x.participants, 0);
  const avgViews = analytics?.avg_views ?? (streams.length > 0 ? Math.round(streams.reduce((s, x) => s + x.views, 0) / streams.length) : 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Training Streams</h1>
          <p className="text-gray-600 mt-1">Manage live and on-demand fitness streaming content.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={() => onNavigate && onNavigate("facilities")}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Manage Facilities
          </Button>

          {/* Upload Recording Dialog */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all">
                <Upload className="mr-2 h-4 w-4" />
                Upload Recording
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Pre-recorded Session</DialogTitle>
                <DialogDescription>Add a recorded training session to the library.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Session title" value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Instructor</Label>
                    <Select value={uploadForm.instructor_id?.toString() ?? ''} onValueChange={v => setUploadForm(f => ({ ...f, instructor_id: v ? Number(v) : null }))}>
                      <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                      <SelectContent>
                        {instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={uploadForm.duration} onChange={e => setUploadForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={uploadForm.difficulty} onValueChange={v => setUploadForm(f => ({ ...f, difficulty: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recording URL</Label>
                  <Input placeholder="https://..." value={uploadForm.stream_url} onChange={e => setUploadForm(f => ({ ...f, stream_url: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe this session..." value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button onClick={handleUploadRecording} disabled={uploading}>
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Stream Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Create Stream
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Training Stream</DialogTitle>
                <DialogDescription>Set up a new live stream or scheduled training session.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  <Label>Stream Title *</Label>
                  <Input placeholder="Morning HIIT Blast" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Instructor</Label>
                    <Select value={createForm.instructor_id?.toString() ?? ''} onValueChange={v => setCreateForm(f => ({ ...f, instructor_id: v ? Number(v) : null }))}>
                      <SelectTrigger><SelectValue placeholder="Choose instructor" /></SelectTrigger>
                      <SelectContent>
                        {instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={createForm.category} onValueChange={v => setCreateForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (min) *</Label>
                    <Input type="number" value={createForm.duration} onChange={e => setCreateForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={createForm.difficulty ?? ''} onValueChange={v => setCreateForm(f => ({ ...f, difficulty: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Participants</Label>
                    <Input type="number" value={createForm.max_participants ?? ''} onChange={e => setCreateForm(f => ({ ...f, max_participants: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Schedule Date</Label>
                    <Input type="date" onChange={e => {
                      const time = createForm.scheduled_time?.split('T')[1] ?? '00:00';
                      setCreateForm(f => ({ ...f, scheduled_time: e.target.value ? `${e.target.value}T${time}` : null }));
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule Time</Label>
                    <Input type="time" onChange={e => {
                      const date = createForm.scheduled_time?.split('T')[0] ?? new Date().toISOString().split('T')[0];
                      setCreateForm(f => ({ ...f, scheduled_time: `${date}T${e.target.value}` }));
                    }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the training session..." value={createForm.description ?? ''} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} className="min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label>Stream Type</Label>
                  <Select value={createForm.stream_type ?? 'live'} onValueChange={v => setCreateForm(f => ({ ...f, stream_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STREAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateForm(emptyForm()); }}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !createForm.title || !createForm.category || !createForm.duration}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Stream
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Live Streams</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <Video className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{liveCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently broadcasting</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Scheduled Streams</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{scheduledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming sessions</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Active Viewers</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{activeViewers}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently watching</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Avg. Views</CardTitle>
            <div className="bg-slate-50 p-2 rounded-lg">
              <Eye className="h-4 w-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{avgViews}</div>
            <p className="text-xs text-muted-foreground mt-1">Per stream</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="streams" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="streams">All Streams</TabsTrigger>
          <TabsTrigger value="live">Live Streams</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="library">Stream Library</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── ALL STREAMS TAB ── */}
        <TabsContent value="streams" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Streams</CardTitle>
                  <CardDescription>Manage all your fitness streaming content</CardDescription>
                </div>
                <Select value={streamFilter} onValueChange={setStreamFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Streams</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStreams.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Streams Found</h3>
                  <p>Create your first training stream to get started.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredStreams.map((stream) => (
                    <Card key={stream.id} className="overflow-hidden bg-white border-0 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                                <Play className="h-8 w-8 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold truncate">{stream.title}</h3>
                                <Badge className={getStatusColor(stream.status)}>{stream.status}</Badge>
                                {stream.difficulty && (
                                  <Badge className={getDifficultyColor(stream.difficulty)}>{stream.difficulty}</Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarFallback>{getInitials(stream.instructor_name)}</AvatarFallback>
                                  </Avatar>
                                  {stream.instructor_name ?? 'No instructor'}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {stream.duration} min
                                </div>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {stream.participants}/{stream.max_participants ?? '∞'}
                                </div>
                                {stream.scheduled_time && (
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {new Date(stream.scheduled_time).toLocaleString()}
                                  </div>
                                )}
                              </div>
                              {stream.description && (
                                <p className="text-sm text-muted-foreground">{stream.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-3 text-sm">
                                <div className="flex items-center">
                                  <Eye className="h-4 w-4 mr-1" />
                                  {stream.views} views
                                </div>
                                <div className="flex items-center">
                                  <Heart className="h-4 w-4 mr-1" />
                                  {stream.likes} likes
                                </div>
                                <Badge className={CATEGORY_COLORS[stream.category] ?? "bg-gray-100 text-gray-800"}>
                                  {stream.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            {stream.status === "Live" && (
                              <Button size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={() => setViewStream(stream)}>
                                <Monitor className="mr-2 h-4 w-4" />
                                View Stream
                              </Button>
                            )}
                            {stream.status === "Ended" && stream.stream_url && (
                              <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => setWatchStream(stream)}>
                                <Play className="mr-2 h-4 w-4" />
                                Watch
                              </Button>
                            )}
                            {stream.status === "Scheduled" && (
                              <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => handleStartStream(stream.id)}>
                                <Play className="mr-2 h-4 w-4" />
                                Start Stream
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => openEdit(stream)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all text-red-600 hover:text-red-700" onClick={() => handleDelete(stream.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LIVE STREAMS TAB ── */}
        <TabsContent value="live" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Live Streams Control Center</CardTitle>
              <CardDescription>Monitor and control active live streams</CardDescription>
            </CardHeader>
            <CardContent>
              {liveStreams.length > 0 ? (
                <div className="space-y-4">
                  {liveStreams.map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div>
                          <div className="font-medium">{stream.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {stream.instructor_name ?? 'No instructor'} • {stream.participants} viewers
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {stream.category} • {stream.duration} min • {stream.difficulty}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => setMonitorStream(stream)}>
                          <Monitor className="mr-2 h-4 w-4" />
                          Monitor
                        </Button>
                        <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all text-red-600" onClick={() => handleEndStream(stream.id)}>
                          <Pause className="mr-2 h-4 w-4" />
                          End Stream
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Live Streams</h3>
                  <p>No training streams are currently broadcasting.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SCHEDULED TAB ── */}
        <TabsContent value="scheduled" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Scheduled Streams</CardTitle>
              <CardDescription>Upcoming training sessions and streams</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledStreams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Scheduled Streams</h3>
                  <p>Create a stream and set a schedule to see it here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledStreams.map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{getInitials(stream.instructor_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{stream.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {stream.instructor_name ?? 'No instructor'}
                            {stream.scheduled_time && ` • ${new Date(stream.scheduled_time).toLocaleString()}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {stream.category} • {stream.duration} min • {stream.difficulty}
                            {stream.max_participants && ` • Max ${stream.max_participants} participants`}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={() => handleStartStream(stream.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Start Now
                        </Button>
                        <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all" onClick={() => openEdit(stream)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STREAM LIBRARY TAB ── */}
        <TabsContent value="library" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Stream Library</CardTitle>
              <CardDescription>Browse recorded sessions and on-demand content</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category cards from analytics */}
              {analytics?.category_stats && analytics.category_stats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {analytics.category_stats.map((cat) => (
                    <Card key={cat.category}
                      className={`bg-white border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${libraryCategory === cat.category ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setLibraryCategory(libraryCategory === cat.category ? null : cat.category)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{cat.category}</CardTitle>
                          <Badge className={CATEGORY_COLORS[cat.category] ?? "bg-gray-100 text-gray-800"}>
                            {cat.count} videos
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full shadow-sm hover:shadow-md transition-all" variant={libraryCategory === cat.category ? 'default' : 'outline'}
                          onClick={e => { e.stopPropagation(); setLibraryCategory(libraryCategory === cat.category ? null : cat.category); }}>
                          <Filter className="mr-2 h-4 w-4" />
                          {libraryCategory === cat.category ? `Showing ${cat.category}` : `Browse ${cat.category}`}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {libraryCategory ? `${libraryCategory} Recordings` : 'Recent Recordings'}
                  </h3>
                  {libraryCategory && (
                    <Button size="sm" variant="ghost" onClick={() => setLibraryCategory(null)}>
                      <X className="mr-1 h-4 w-4" /> Clear filter
                    </Button>
                  )}
                </div>
                {(() => {
                  const libStreams = libraryCategory
                    ? endedStreams.filter(s => s.category === libraryCategory)
                    : endedStreams;
                  return libStreams.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>{libraryCategory ? `No ${libraryCategory} recordings found.` : 'No recorded sessions yet. Upload a recording to start building your library.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {libStreams.map((stream) => (
                        <div key={stream.id} className="flex items-center justify-between p-3 border border-gray-100 rounded hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded flex items-center justify-center cursor-pointer"
                              onClick={() => setWatchStream(stream)}>
                              <Play className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{stream.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {stream.instructor_name ?? 'No instructor'} • {stream.views} views • {stream.duration} min
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-xs ${CATEGORY_COLORS[stream.category] ?? "bg-gray-100 text-gray-800"}`}>{stream.category}</Badge>
                                <Badge className={`text-xs ${getDifficultyColor(stream.difficulty)}`}>{stream.difficulty}</Badge>
                                {stream.scheduled_time && (
                                  <span className="text-xs text-muted-foreground">Aired: {new Date(stream.scheduled_time).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all"
                              onClick={() => setWatchStream(stream)}>
                              <Play className="mr-2 h-4 w-4" />
                              Watch
                            </Button>
                            <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all"
                              onClick={() => {
                                if (stream.stream_url) {
                                  const a = document.createElement('a');
                                  a.href = stream.stream_url;
                                  a.download = `${stream.title}.mp4`;
                                  a.target = '_blank';
                                  a.click();
                                } else {
                                  alert('No download URL available for this recording.');
                                }
                              }}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Stream Analytics</CardTitle>
              <CardDescription>Performance metrics and viewership data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Total Streams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics?.total_streams ?? streams.length}</div>
                    <p className="text-sm text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Total Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics?.total_views ?? streams.reduce((s, x) => s + x.views, 0)}</div>
                    <p className="text-sm text-muted-foreground">All streams</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Engagement Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics?.engagement_rate ?? 0}%</div>
                    <p className="text-sm text-muted-foreground">Average completion</p>
                  </CardContent>
                </Card>
              </div>

              {/* Category breakdown in analytics */}
              {analytics?.category_stats && analytics.category_stats.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Streams by Category</h3>
                  <div className="space-y-3">
                    {analytics.category_stats.map((cat) => {
                      const total = analytics.category_stats.reduce((s, c) => s + Number(c.count), 0);
                      const pct = total > 0 ? Math.round((Number(cat.count) / total) * 100) : 0;
                      return (
                        <div key={cat.category} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium">{cat.category}</div>
                          <div className="flex-1 bg-gray-100 rounded-full h-3">
                            <div
                              className="h-3 rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-16 text-sm text-right text-muted-foreground">{cat.count} ({pct}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!analytics?.category_stats || analytics.category_stats.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Data Yet</h3>
                  <p>Create streams to see analytics here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── VIEW STREAM DIALOG (Live) ── */}
      {viewStream && (
        <Dialog open={!!viewStream} onOpenChange={() => setViewStream(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {viewStream.title}
                <Badge className="bg-red-100 text-red-800 ml-1">LIVE</Badge>
              </DialogTitle>
              <DialogDescription>
                {viewStream.instructor_name ?? 'No instructor'} • {viewStream.category} • {viewStream.duration} min
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Player area */}
              {viewStream.stream_url ? (
                <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={viewStream.stream_url}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                    title={viewStream.title}
                  />
                </div>
              ) : (
                <div className="w-full rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center text-white py-16 gap-3">
                  <Radio className="h-12 w-12 animate-pulse" />
                  <p className="font-semibold text-lg">Stream is Live</p>
                  <p className="text-sm opacity-80">No embed URL configured for this stream.</p>
                </div>
              )}
              {/* Stream stats */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold text-red-600">{viewStream.participants}</div>
                  <div className="text-xs text-muted-foreground">Live Viewers</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold">{viewStream.views}</div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold">{viewStream.likes}</div>
                  <div className="text-xs text-muted-foreground">Likes</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold">{viewStream.duration}</div>
                  <div className="text-xs text-muted-foreground">Duration (min)</div>
                </div>
              </div>
              {viewStream.description && (
                <p className="text-sm text-muted-foreground border-t pt-3">{viewStream.description}</p>
              )}
              {viewStream.stream_url && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
                  <ExternalLink className="h-4 w-4" />
                  <a href={viewStream.stream_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline truncate">{viewStream.stream_url}</a>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { setViewStream(null); handleEndStream(viewStream.id); }}>
                <Pause className="mr-2 h-4 w-4" /> End Stream
              </Button>
              <Button variant="outline" onClick={() => setViewStream(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── MONITOR DIALOG (Live Control) ── */}
      {monitorStream && (
        <Dialog open={!!monitorStream} onOpenChange={() => setMonitorStream(null)}>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Monitor — {monitorStream.title}
              </DialogTitle>
              <DialogDescription>Real-time stream monitoring and controls</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Live indicator banner */}
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-red-700">Stream is LIVE</div>
                  {monitorStream.scheduled_time && (
                    <div className="text-xs text-red-500">
                      Started: {new Date(monitorStream.scheduled_time).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                <Badge className="bg-red-100 text-red-800">BROADCASTING</Badge>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Active Viewers</div>
                  <div className="text-3xl font-bold text-emerald-600">{monitorStream.participants}</div>
                  <div className="text-xs text-muted-foreground">of {monitorStream.max_participants ?? '∞'} max</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total Views</div>
                  <div className="text-3xl font-bold">{monitorStream.views}</div>
                  <div className="text-xs text-muted-foreground">all time</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Likes</div>
                  <div className="text-3xl font-bold text-pink-500">{monitorStream.likes}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Duration</div>
                  <div className="text-3xl font-bold">{monitorStream.duration}</div>
                  <div className="text-xs text-muted-foreground">minutes</div>
                </div>
              </div>

              {/* Stream info */}
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instructor</span>
                  <span className="font-medium">{monitorStream.instructor_name ?? 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge className={CATEGORY_COLORS[monitorStream.category] ?? "bg-gray-100 text-gray-800"}>{monitorStream.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty</span>
                  <Badge className={getDifficultyColor(monitorStream.difficulty)}>{monitorStream.difficulty}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stream Type</span>
                  <span className="font-medium capitalize">{monitorStream.stream_type}</span>
                </div>
                {monitorStream.stream_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Stream URL</span>
                    <a href={monitorStream.stream_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <Button className="text-red-600 border-red-200 hover:bg-red-50" variant="outline"
                onClick={() => { setMonitorStream(null); handleEndStream(monitorStream.id); }}>
                <Pause className="mr-2 h-4 w-4" /> End Stream
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setMonitorStream(null); setViewStream(monitorStream); }}>
                  <Eye className="mr-2 h-4 w-4" /> View Stream
                </Button>
                <Button variant="outline" onClick={() => setMonitorStream(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── WATCH DIALOG (Library) ── */}
      {watchStream && (
        <Dialog open={!!watchStream} onOpenChange={() => setWatchStream(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{watchStream.title}</DialogTitle>
              <DialogDescription>
                {watchStream.instructor_name ?? 'No instructor'} • {watchStream.category} • {watchStream.duration} min • {watchStream.difficulty}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Player */}
              {watchStream.stream_url ? (
                <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                  {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(watchStream.stream_url) ? (
                    <video
                      src={watchStream.stream_url}
                      controls
                      className="w-full h-full"
                      controlsList="nodownload"
                    />
                  ) : (
                    <iframe
                      src={watchStream.stream_url}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                      title={watchStream.title}
                    />
                  )}
                </div>
              ) : (
                <div className="w-full rounded-lg bg-gray-100 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Video className="h-12 w-12 opacity-40" />
                  <p className="font-medium">No recording URL available</p>
                  <p className="text-sm">Edit this stream to add a recording URL.</p>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold">{watchStream.views}</div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold text-pink-500">{watchStream.likes}</div>
                  <div className="text-xs text-muted-foreground">Likes</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xl font-bold">{watchStream.duration}</div>
                  <div className="text-xs text-muted-foreground">Duration (min)</div>
                </div>
              </div>
              {watchStream.description && (
                <p className="text-sm text-muted-foreground border-t pt-3">{watchStream.description}</p>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline"
                onClick={() => {
                  if (watchStream.stream_url) {
                    const a = document.createElement('a');
                    a.href = watchStream.stream_url;
                    a.download = `${watchStream.title}.mp4`;
                    a.target = '_blank';
                    a.click();
                  } else {
                    alert('No download URL available for this recording.');
                  }
                }}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              {watchStream.stream_url && (
                <Button variant="outline" asChild>
                  <a href={watchStream.stream_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => setWatchStream(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── EDIT STREAM DIALOG ── */}
      {editStream && (
        <Dialog open={!!editStream} onOpenChange={() => setEditStream(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Stream — {editStream.title}</DialogTitle>
              <DialogDescription>Modify the stream details and settings</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <Label>Stream Title</Label>
                <Input value={editForm.title ?? ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editForm.category ?? ''} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={editForm.difficulty ?? ''} onValueChange={v => setEditForm(f => ({ ...f, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={editForm.duration ?? ''} onChange={e => setEditForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Participants</Label>
                  <Input type="number" value={editForm.max_participants ?? ''} onChange={e => setEditForm(f => ({ ...f, max_participants: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Select value={editForm.instructor_id?.toString() ?? ''} onValueChange={v => setEditForm(f => ({ ...f, instructor_id: v ? Number(v) : null }))}>
                  <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                  <SelectContent>
                    {instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stream Type</Label>
                <Select value={editForm.stream_type ?? 'live'} onValueChange={v => setEditForm(f => ({ ...f, stream_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STREAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stream URL</Label>
                <Input placeholder="https://..." value={editForm.stream_url ?? ''} onChange={e => setEditForm(f => ({ ...f, stream_url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editForm.description ?? ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="min-h-[80px]" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditStream(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
