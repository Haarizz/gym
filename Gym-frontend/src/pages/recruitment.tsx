import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Calendar } from "../components/ui/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { toast } from "sonner";
import {
  Plus,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  Eye,
  X,
  ChevronRight,
  Star,
  MessageSquare,
  Download,
  MoreVertical,
  Send,
  Video,
  Building2,
  Award,
  Target,
  LayoutGrid,
  List,
  Calendar as CalIcon,
  ArrowUpRight,
  Pause,
  Play,
  XCircle,
  TrendingUp,
  UserCheck,
  Link as LinkIcon,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  ChevronDown
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: 'active' | 'paused' | 'closed';
  applicants: number;
  postedDate: string;
  salary: string;
  description: string;
  requirements: string[];
  priority: 'high' | 'medium' | 'low';
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  stage: 'applied' | 'shortlisted' | 'interviewed' | 'offered' | 'hired' | 'rejected';
  appliedDate: string;
  score: number;
  tags: string[];
  experience: string;
  location: string;
  resume: string;
  notes: string;
  avatar?: string;
}

interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  date: string;
  time: string;
  interviewer: string;
  type: 'online' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
  department: string;
  meetingLink?: string;
  location?: string;
}

export function Recruitment() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'kanban' | 'calendar'>('dashboard');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isJobDrawerOpen, setIsJobDrawerOpen] = useState(false);
  const [isCandidateDrawerOpen, setIsCandidateDrawerOpen] = useState(false);
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Mock data - Job Openings
  const [jobs] = useState<Job[]>([
    {
      id: '1',
      title: 'Fitness Trainer',
      department: 'Fitness',
      location: 'Dubai - Main Branch',
      type: 'Full-time',
      status: 'active',
      applicants: 18,
      postedDate: '2024-01-15',
      salary: 'AED 5,000 - 8,000',
      description: 'We are looking for an experienced fitness trainer to join our growing team.',
      requirements: ['Certified Trainer', '2+ years experience', 'CPR Certified'],
      priority: 'high'
    },
    {
      id: '2',
      title: 'Sales Executive',
      department: 'Sales',
      location: 'Dubai - Main Branch',
      type: 'Full-time',
      status: 'active',
      applicants: 24,
      postedDate: '2024-01-20',
      salary: 'AED 4,000 - 6,000',
      description: 'Seeking a motivated sales executive to drive membership growth.',
      requirements: ['Sales Experience', 'Customer Service', 'English Speaking'],
      priority: 'high'
    },
    {
      id: '3',
      title: 'Front Desk Receptionist',
      department: 'Operations',
      location: 'Abu Dhabi Branch',
      type: 'Full-time',
      status: 'active',
      applicants: 12,
      postedDate: '2024-02-01',
      salary: 'AED 3,500 - 4,500',
      description: 'Friendly receptionist needed for member check-in and support.',
      requirements: ['Customer Service', 'Computer Skills', 'Organized'],
      priority: 'medium'
    },
    {
      id: '4',
      title: 'Yoga Instructor',
      department: 'Fitness',
      location: 'Dubai - Main Branch',
      type: 'Part-time',
      status: 'active',
      applicants: 8,
      postedDate: '2024-02-05',
      salary: 'AED 150 per session',
      description: 'Experienced yoga instructor for group classes.',
      requirements: ['Yoga Certification', 'Group Class Experience'],
      priority: 'medium'
    },
    {
      id: '5',
      title: 'Nutrition Consultant',
      department: 'Wellness',
      location: 'Dubai - Main Branch',
      type: 'Full-time',
      status: 'paused',
      applicants: 15,
      postedDate: '2024-01-10',
      salary: 'AED 6,000 - 9,000',
      description: 'Certified nutritionist to provide dietary consultations.',
      requirements: ['Nutrition Degree', 'DHA License', '3+ years experience'],
      priority: 'high'
    },
    {
      id: '6',
      title: 'Maintenance Technician',
      department: 'Facilities',
      location: 'All Branches',
      type: 'Full-time',
      status: 'closed',
      applicants: 6,
      postedDate: '2024-01-05',
      salary: 'AED 3,000 - 4,000',
      description: 'Responsible for equipment maintenance and facility upkeep.',
      requirements: ['Technical Skills', 'Equipment Knowledge'],
      priority: 'low'
    }
  ]);

  // Mock data - Candidates
  const [candidates] = useState<Candidate[]>([
    {
      id: '1',
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@email.com',
      phone: '+971 50 123 4567',
      jobId: '1',
      stage: 'applied',
      appliedDate: '2024-02-08',
      score: 85,
      tags: ['Certified Trainer', '5+ Years'],
      experience: '5 years',
      location: 'Dubai',
      resume: 'ahmed_hassan_resume.pdf',
      notes: 'Strong background in strength training'
    },
    {
      id: '2',
      name: 'Sara Mohammed',
      email: 'sara.m@email.com',
      phone: '+971 55 987 6543',
      jobId: '1',
      stage: 'shortlisted',
      appliedDate: '2024-02-06',
      score: 92,
      tags: ['Certified', 'Nutrition Specialist'],
      experience: '7 years',
      location: 'Dubai',
      resume: 'sara_mohammed_resume.pdf',
      notes: 'Excellent credentials, multilingual'
    },
    {
      id: '3',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+971 50 456 7890',
      jobId: '2',
      stage: 'interviewed',
      appliedDate: '2024-02-05',
      score: 88,
      tags: ['Sales Pro', 'B2B Experience'],
      experience: '4 years',
      location: 'Dubai',
      resume: 'john_smith_resume.pdf',
      notes: 'Interview completed - strong candidate'
    },
    {
      id: '4',
      name: 'Fatima Ali',
      email: 'fatima.ali@email.com',
      phone: '+971 52 345 6789',
      jobId: '3',
      stage: 'offered',
      appliedDate: '2024-02-03',
      score: 95,
      tags: ['Bilingual', 'Customer Service'],
      experience: '3 years',
      location: 'Dubai',
      resume: 'fatima_ali_resume.pdf',
      notes: 'Offer extended on Feb 10'
    },
    {
      id: '5',
      name: 'Maria Garcia',
      email: 'maria.g@email.com',
      phone: '+971 50 234 5678',
      jobId: '4',
      stage: 'hired',
      appliedDate: '2024-01-28',
      score: 90,
      tags: ['Yoga Alliance', 'Group Classes'],
      experience: '6 years',
      location: 'Dubai',
      resume: 'maria_garcia_resume.pdf',
      notes: 'Onboarded Feb 12, 2024'
    },
    {
      id: '6',
      name: 'Omar Abdullah',
      email: 'omar.a@email.com',
      phone: '+971 55 111 2222',
      jobId: '2',
      stage: 'applied',
      appliedDate: '2024-02-09',
      score: 78,
      tags: ['Fresh Graduate', 'Energetic'],
      experience: '1 year',
      location: 'Sharjah',
      resume: 'omar_abdullah_resume.pdf',
      notes: 'Recent graduate, good potential'
    },
    {
      id: '7',
      name: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '+971 50 888 9999',
      jobId: '2',
      stage: 'shortlisted',
      appliedDate: '2024-02-07',
      score: 86,
      tags: ['Multilingual', 'Sales Awards'],
      experience: '3 years',
      location: 'Dubai',
      resume: 'lisa_chen_resume.pdf',
      notes: 'Top performer at previous company'
    },
    {
      id: '8',
      name: 'Khalid Al Mansouri',
      email: 'khalid.am@email.com',
      phone: '+971 52 777 6666',
      jobId: '1',
      stage: 'rejected',
      appliedDate: '2024-02-04',
      score: 62,
      tags: ['No Certification'],
      experience: '2 years',
      location: 'Abu Dhabi',
      resume: 'khalid_almansouri_resume.pdf',
      notes: 'Lacks required certifications'
    }
  ]);

  // Mock data - Interviews
  const [interviews] = useState<Interview[]>([
    {
      id: '1',
      candidateId: '3',
      candidateName: 'John Smith',
      jobTitle: 'Sales Executive',
      date: '2024-02-12',
      time: '10:00 AM',
      interviewer: 'Michael Chen',
      type: 'online',
      status: 'scheduled',
      department: 'Sales',
      meetingLink: 'https://zoom.us/j/123456789'
    },
    {
      id: '2',
      candidateId: '2',
      candidateName: 'Sara Mohammed',
      jobTitle: 'Fitness Trainer',
      date: '2024-02-12',
      time: '2:00 PM',
      interviewer: 'Sarah Ahmed',
      type: 'in-person',
      status: 'scheduled',
      department: 'Fitness',
      location: 'Dubai Main Branch - Meeting Room 2'
    },
    {
      id: '3',
      candidateId: '7',
      candidateName: 'Lisa Chen',
      jobTitle: 'Sales Executive',
      date: '2024-02-13',
      time: '11:00 AM',
      interviewer: 'David Johnson',
      type: 'online',
      status: 'scheduled',
      department: 'Sales',
      meetingLink: 'https://teams.microsoft.com/l/meetup-join/xxx'
    },
    {
      id: '4',
      candidateId: '4',
      candidateName: 'Fatima Ali',
      jobTitle: 'Front Desk Receptionist',
      date: '2024-02-10',
      time: '9:00 AM',
      interviewer: 'Lisa Johnson',
      type: 'in-person',
      status: 'completed',
      department: 'Operations',
      location: 'Abu Dhabi Branch - HR Office'
    }
  ]);

  // Calculated metrics
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalApplicants = candidates.length;
  const todayInterviews = interviews.filter(i => 
    i.date === new Date().toISOString().split('T')[0] && i.status === 'scheduled'
  ).length;

  const stageCounts = {
    applied: candidates.filter(c => c.stage === 'applied').length,
    shortlisted: candidates.filter(c => c.stage === 'shortlisted').length,
    interviewed: candidates.filter(c => c.stage === 'interviewed').length,
    offered: candidates.filter(c => c.stage === 'offered').length,
    hired: candidates.filter(c => c.stage === 'hired').length,
    rejected: candidates.filter(c => c.stage === 'rejected').length
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'applied': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shortlisted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'interviewed': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'offered': return 'bg-green-100 text-green-800 border-green-200';
      case 'hired': return 'bg-[#2B7A78] text-white border-[#2B7A78]';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || job.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B]">
              Recruitment
            </h1>
            <p className="text-gray-600 mt-1">
              Manage job openings, candidates, and interview scheduling
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78] hover:text-white"
              onClick={() => setIsScheduleInterviewOpen(true)}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
            <Button
              className="bg-[#2B7A78] hover:bg-[#21615f] text-white"
              onClick={() => setIsNewJobDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Job Opening
            </Button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="bg-gradient-to-r from-[#2B7A78] to-[#21615f] text-white rounded-lg p-4 mb-4">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-2xl font-bold">{activeJobs}</div>
              <div className="text-sm opacity-90">Active Openings</div>
            </div>
            <Separator orientation="vertical" className="h-12 bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold">{totalApplicants}</div>
              <div className="text-sm opacity-90">Total Applicants</div>
            </div>
            <Separator orientation="vertical" className="h-12 bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold">{todayInterviews}</div>
              <div className="text-sm opacity-90">Interviews Today</div>
            </div>
            <Separator orientation="vertical" className="h-12 bg-white/30" />
            <div className="text-center">
              <div className="text-2xl font-bold">{stageCounts.hired}</div>
              <div className="text-sm opacity-90">Recent Hires</div>
            </div>
          </div>
        </div>

        {/* Search and Filters + View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search candidates, job titles, or departments..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Fitness">Fitness</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Wellness">Wellness</SelectItem>
                <SelectItem value="Facilities">Facilities</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white border rounded-lg ml-4">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('dashboard')}
              className={currentView === 'dashboard' ? 'bg-[#2B7A78] hover:bg-[#21615f]' : ''}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={currentView === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('kanban')}
              className={currentView === 'kanban' ? 'bg-[#2B7A78] hover:bg-[#21615f]' : ''}
            >
              <List className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={currentView === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('calendar')}
              className={currentView === 'calendar' ? 'bg-[#2B7A78] hover:bg-[#21615f]' : ''}
            >
              <CalIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Dashboard View */}
      {currentView === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#2B7A78] rounded-lg"
              onClick={() => {
                setSelectedJob(job);
                setIsJobDrawerOpen(true);
              }}
            >
              <CardContent className="p-6">
                {/* Job Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#1E293B] mb-1">
                      {job.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="h-3 w-3" />
                      <span>{job.department}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(job.status)} variant="outline">
                    {job.status}
                  </Badge>
                </div>

                {/* Job Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-3 w-3 mr-2" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-3 w-3 mr-2" />
                    {job.salary}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-3 w-3 mr-2" />
                    Posted {new Date(job.postedDate).toLocaleDateString()}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Applicants & Priority */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-[#2B7A78]" />
                    <span className="font-semibold text-[#2B7A78]">{job.applicants}</span>
                    <span className="text-sm text-gray-500">Applicants</span>
                  </div>
                  <Badge className={getPriorityColor(job.priority)} variant="outline">
                    {job.priority} priority
                  </Badge>
                </div>

                {/* View Pipeline Button */}
                <Button
                  className="w-full mt-4 bg-[#2B7A78] hover:bg-[#21615f] text-white"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentView('kanban');
                  }}
                >
                  View Pipeline
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content - Kanban View */}
      {currentView === 'kanban' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#1E293B]">
              Candidate Pipeline
            </h2>
            <Button
              variant="outline"
              className="border-[#2B7A78] text-[#2B7A78]"
              onClick={() => toast.success('Add Candidate feature coming soon!')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </div>

          <div className="flex space-x-4 overflow-x-auto pb-4">
            {/* Applied */}
            <KanbanColumn
              title="Applied"
              count={stageCounts.applied}
              color="blue"
              candidates={candidates.filter(c => c.stage === 'applied')}
              onCandidateClick={(candidate) => {
                setSelectedCandidate(candidate);
                setIsCandidateDrawerOpen(true);
              }}
            />

            {/* Shortlisted */}
            <KanbanColumn
              title="Shortlisted"
              count={stageCounts.shortlisted}
              color="purple"
              candidates={candidates.filter(c => c.stage === 'shortlisted')}
              onCandidateClick={(candidate) => {
                setSelectedCandidate(candidate);
                setIsCandidateDrawerOpen(true);
              }}
            />

            {/* Interviewed */}
            <KanbanColumn
              title="Interviewed"
              count={stageCounts.interviewed}
              color="cyan"
              candidates={candidates.filter(c => c.stage === 'interviewed')}
              onCandidateClick={(candidate) => {
                setSelectedCandidate(candidate);
                setIsCandidateDrawerOpen(true);
              }}
            />

            {/* Offered */}
            <KanbanColumn
              title="Offered"
              count={stageCounts.offered}
              color="green"
              candidates={candidates.filter(c => c.stage === 'offered')}
              onCandidateClick={(candidate) => {
                setSelectedCandidate(candidate);
                setIsCandidateDrawerOpen(true);
              }}
            />

            {/* Hired */}
            <KanbanColumn
              title="Hired"
              count={stageCounts.hired}
              color="teal"
              candidates={candidates.filter(c => c.stage === 'hired')}
              onCandidateClick={(candidate) => {
                setSelectedCandidate(candidate);
                setIsCandidateDrawerOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content - Calendar View */}
      {currentView === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Interview Schedule</span>
                  <div className="text-sm font-normal text-gray-600">
                    February 2024
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <LinkIcon className="h-4 w-4" />
                    <span>Sync hint: Linked to Outlook / Google Calendar</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalIcon className="h-5 w-5 text-[#2B7A78]" />
                  <span>Upcoming Interviews</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {interviews.filter(i => i.status === 'scheduled').map((interview) => (
                      <div
                        key={interview.id}
                        className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow bg-white hover:border-[#2B7A78]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold mb-1">{interview.candidateName}</h4>
                            <p className="text-sm text-gray-600">{interview.jobTitle}</p>
                          </div>
                          <Badge
                            className={
                              interview.type === 'online'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }
                          >
                            {interview.type === 'online' ? (
                              <Video className="h-3 w-3 mr-1" />
                            ) : (
                              <Users className="h-3 w-3 mr-1" />
                            )}
                            {interview.type}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {new Date(interview.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {interview.time}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {interview.interviewer}
                          </div>
                          {interview.type === 'online' && interview.meetingLink && (
                            <div className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              <a href={interview.meetingLink} className="text-[#2B7A78] hover:underline" target="_blank" rel="noopener noreferrer">
                                Join Meeting
                              </a>
                            </div>
                          )}
                          {interview.type === 'in-person' && interview.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {interview.location}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" className="flex-1 bg-[#2B7A78] hover:bg-[#21615f]">
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Job Details Drawer */}
      <Sheet open={isJobDrawerOpen} onOpenChange={setIsJobDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-2xl">{selectedJob.title}</SheetTitle>
                    <SheetDescription>
                      {selectedJob.department} • {selectedJob.location}
                    </SheetDescription>
                  </div>
                  <Badge className={getStatusColor(selectedJob.status)}>
                    {selectedJob.status}
                  </Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="candidates">
                    Candidates ({candidates.filter(c => c.jobId === selectedJob.id).length})
                  </TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-[#2B7A78]">Job Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">Job Type</Label>
                        <p className="font-medium">{selectedJob.type}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Salary Range</Label>
                        <p className="font-medium">{selectedJob.salary}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Posted Date</Label>
                        <p className="font-medium">{new Date(selectedJob.postedDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Priority</Label>
                        <Badge className={getPriorityColor(selectedJob.priority)}>
                          {selectedJob.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3 text-[#2B7A78]">Description</h3>
                    <p className="text-gray-700">{selectedJob.description}</p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3 text-[#2B7A78]">Requirements</h3>
                    <ul className="space-y-2">
                      {selectedJob.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-[#2B7A78]" />
                          <span className="text-gray-700">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button className="flex-1 bg-[#2B7A78] hover:bg-[#21615f]">
                      <Send className="h-4 w-4 mr-2" />
                      Share Job Post
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="candidates" className="mt-6">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {candidates.filter(c => c.jobId === selectedJob.id).map((candidate) => (
                        <CandidateListItem
                          key={candidate.id}
                          candidate={candidate}
                          onView={() => {
                            setSelectedCandidate(candidate);
                            setIsCandidateDrawerOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      <ActivityItem
                        icon={<Briefcase className="h-4 w-4" />}
                        color="teal"
                        title="Job posting created"
                        description={`Posted on ${new Date(selectedJob.postedDate).toLocaleDateString()}`}
                      />
                      <ActivityItem
                        icon={<Users className="h-4 w-4" />}
                        color="blue"
                        title="Applications received"
                        description={`${selectedJob.applicants} candidates have applied`}
                      />
                      {selectedJob.status === 'paused' && (
                        <ActivityItem
                          icon={<Pause className="h-4 w-4" />}
                          color="amber"
                          title="Job paused"
                          description="Applications temporarily paused"
                        />
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Candidate Drawer */}
      <Sheet open={isCandidateDrawerOpen} onOpenChange={setIsCandidateDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedCandidate && (
            <>
              <SheetHeader>
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedCandidate.avatar} />
                    <AvatarFallback className="bg-[#2B7A78] text-white text-xl">
                      {getInitials(selectedCandidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl">{selectedCandidate.name}</SheetTitle>
                    <SheetDescription>
                      {jobs.find(j => j.id === selectedCandidate.jobId)?.title}
                    </SheetDescription>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getStageColor(selectedCandidate.stage)}>
                        {selectedCandidate.stage}
                      </Badge>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400 mr-1" />
                        <span className="font-semibold">{selectedCandidate.score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-semibold mb-3 text-[#2B7A78]">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <a href={`mailto:${selectedCandidate.email}`} className="text-[#2B7A78] hover:underline">
                        {selectedCandidate.email}
                      </a>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <a href={`tel:${selectedCandidate.phone}`} className="text-[#2B7A78] hover:underline">
                        {selectedCandidate.phone}
                      </a>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{selectedCandidate.location}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Experience & Tags */}
                <div>
                  <h3 className="font-semibold mb-3 text-[#2B7A78]">Experience & Skills</h3>
                  <p className="text-sm text-gray-600 mb-3">{selectedCandidate.experience} of experience</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Resume */}
                <div>
                  <h3 className="font-semibold mb-3 text-[#2B7A78]">Resume</h3>
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-[#2B7A78]" />
                        <div>
                          <p className="font-medium">{selectedCandidate.resume}</p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <h3 className="font-semibold mb-3 text-[#2B7A78]">Notes & Comments</h3>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedCandidate.notes}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button className="flex-1 bg-[#2B7A78] hover:bg-[#21615f]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Job Opening Dialog */}
      <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Job Opening</DialogTitle>
            <DialogDescription>
              Fill in the details to post a new job opening
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Title *</Label>
                <Input placeholder="e.g., Fitness Trainer" />
              </div>
              <div>
                <Label>Department *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location *</Label>
                <Input placeholder="e.g., Dubai - Main Branch" />
              </div>
              <div>
                <Label>Job Type *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Salary Range *</Label>
                <Input placeholder="e.g., AED 5,000 - 8,000" />
              </div>
              <div>
                <Label>Priority *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Job Description *</Label>
              <Textarea
                placeholder="Describe the role, responsibilities, and expectations..."
                rows={4}
              />
            </div>

            <div>
              <Label>Requirements</Label>
              <Textarea
                placeholder="List the required qualifications, skills, and experience (one per line)..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsNewJobDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#2B7A78] hover:bg-[#21615f]"
                onClick={() => {
                  toast.success('Job opening created successfully!');
                  setIsNewJobDialogOpen(false);
                }}
              >
                Create Job Opening
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={isScheduleInterviewOpen} onOpenChange={setIsScheduleInterviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Set up an interview with a candidate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Candidate *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Job Position *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interview Date *</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>Interview Time *</Label>
                <Input type="time" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interviewer *</Label>
                <Input placeholder="Enter interviewer name" />
              </div>
              <div>
                <Label>Interview Type *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-person">In-Person</SelectItem>
                    <SelectItem value="online">Online (Video)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Meeting Link / Location</Label>
              <Input placeholder="Enter Zoom/Teams link or office location" />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes or preparation requirements..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <input type="checkbox" id="auto-email" className="rounded" />
              <label htmlFor="auto-email" className="text-sm text-gray-700">
                Auto-send email invitation to candidate
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsScheduleInterviewOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#2B7A78] hover:bg-[#21615f]"
                onClick={() => {
                  toast.success('Interview scheduled successfully!');
                  setIsScheduleInterviewOpen(false);
                }}
              >
                Schedule Interview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({ 
  title, 
  count, 
  color, 
  candidates,
  onCandidateClick 
}: { 
  title: string; 
  count: number; 
  color: string; 
  candidates: Candidate[];
  onCandidateClick: (candidate: Candidate) => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    teal: 'bg-[#2B7A7820] border-[#2B7A78]'
  };

  const badgeClasses = {
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    cyan: 'bg-cyan-600 text-white',
    green: 'bg-green-600 text-white',
    teal: 'bg-[#2B7A78] text-white'
  };

  return (
    <div className="flex-shrink-0 w-80">
      <div className={`rounded-lg p-4 mb-3 border-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{title}</h3>
          <Badge className={badgeClasses[color as keyof typeof badgeClasses]}>
            {count}
          </Badge>
        </div>
        <p className="text-xs opacity-75">
          {title === 'Applied' && 'Recently applied candidates'}
          {title === 'Shortlisted' && 'Passed initial screening'}
          {title === 'Interviewed' && 'Completed interviews'}
          {title === 'Offered' && 'Offer extended'}
          {title === 'Hired' && 'Successfully onboarded'}
        </p>
      </div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-4">
          {candidates.map((candidate) => (
            <CandidateCard 
              key={candidate.id} 
              candidate={candidate}
              onClick={() => onCandidateClick(candidate)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Candidate Card Component (for Kanban)
function CandidateCard({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#2B7A78]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={candidate.avatar} />
            <AvatarFallback className="bg-[#2B7A78] text-white">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{candidate.name}</h4>
            <p className="text-xs text-gray-600">{candidate.experience}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold">{candidate.score}</span>
          </div>
        </div>

        <div className="space-y-2 mb-3 text-xs text-gray-600">
          <div className="flex items-center truncate">
            <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
          <div className="flex items-center">
            <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
            <span>{candidate.phone}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {candidate.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {candidate.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{candidate.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-[#2B7A78] hover:bg-[#21615f] text-white text-xs"
            onClick={(e) => {
              e.stopPropagation();
              toast.success('Schedule interview feature');
            }}
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Candidate List Item (for drawer)
function CandidateListItem({ candidate, onView }: { candidate: Candidate; onView: () => void }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'applied': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shortlisted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'interviewed': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'offered': return 'bg-green-100 text-green-800 border-green-200';
      case 'hired': return 'bg-[#2B7A78] text-white border-[#2B7A78]';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 border-2 rounded-lg hover:shadow-md transition-all hover:border-[#2B7A78]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={candidate.avatar} />
            <AvatarFallback className="bg-[#2B7A78] text-white">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h4 className="font-semibold">{candidate.name}</h4>
              <Badge className={getStageColor(candidate.stage)} variant="outline">
                {candidate.stage}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {candidate.email}
              </div>
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-1" />
                {candidate.phone}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{candidate.score}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {candidate.tags.map((tag, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex space-x-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
          <Eye className="h-3 w-3 mr-1" />
          View Profile
        </Button>
        <Button size="sm" className="flex-1 bg-[#2B7A78] hover:bg-[#21615f]">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Schedule
        </Button>
        <Button size="sm" variant="outline">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ 
  icon, 
  color, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  color: string; 
  title: string; 
  description: string;
}) {
  const colorClasses = {
    teal: 'bg-[#2B7A78]',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500'
  };

  return (
    <div className="flex items-start space-x-3">
      <div className={`w-8 h-8 rounded-full ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

