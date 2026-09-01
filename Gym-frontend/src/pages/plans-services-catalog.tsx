import React, { useState, useEffect } from 'react';
import { CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AddMember } from "./add-member";
import { MemberDraftModal } from "../components/shared/member-draft-modal";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { plansService, Plan } from "../utils/supabase/plans-service";
import { trainingService, TrainingSessionApi } from "../utils/supabase/training-service";
import { trainingStreamsService, TrainingStreamApi } from "../utils/supabase/training-streams-service";
import { facilitiesService } from "../utils/supabase/facilities-service";
import { leadService } from "../utils/supabase/lead-service";
import {
  Search,
  Maximize2,
  Minimize2,
  Clock,
  Users,
  Star,
  Award,
  Calendar,
  MapPin,
  Phone,
  Mail,
  QrCode,
  Heart,
  Activity,
  Target,
  Zap,
  CheckCircle,
  UserPlus,
  Gift,
  Trophy,
  Smartphone,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Play,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Video,
  Radio,
  ExternalLink
} from 'lucide-react';

// Sample data - in real app, this would come from the GymOS configuration
const catalogConfig = {
  membershipPlans: true,
  trainingStreams: true,
  classes: false // This would be controlled by GymOS configuration
};

// Membership plans are loaded live from plansService (see fetchPlans below) —
// the hardcoded array that used to live here (with fabricated prices and fake
// "2,450+ Members" social-proof counts) has been removed.

// Training Streams are loaded live from trainingStreamsService (see fetchStreams
// below) — this is a different concept than the old mock cards (named programs
// like "Personal Training"/"CrossFit" with a trainer roster and per-session
// pricing, which has no real backend). What's actually real here is live/
// recorded video streaming sessions — title, instructor, category, difficulty,
// participants, views/likes, and a Live/Scheduled/Ended status.

// Scheduled classes are loaded live from trainingService.getSessions({ type: 'class' })
// (see fetchSessions below) — the hardcoded array that used to live here has been removed.

export function PlansServicesCatalog() {
    const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showChoosePlan, setShowChoosePlan] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    name: "",
    phone: "",
    email: "",
    interest: "",
    message: ""
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  // Real membership plans (plansService -> GET /api/plans)
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Real facility catalog, used to resolve plan.selectedFacilities (ids) to names
  const [facilityMap, setFacilityMap] = useState<Record<string, string>>({});

  // Real scheduled classes (trainingService -> GET /api/sessions?type=class)
  const [sessions, setSessions] = useState<TrainingSessionApi[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Real training streams (trainingStreamsService -> GET /api/training-streams)
  const [streams, setStreams] = useState<TrainingStreamApi[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(true);
  const [streamsError, setStreamsError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await plansService.getPlans('Active');
      setPlans(data);
    } catch (error) {
      console.error('Failed to load membership plans:', error);
      setPlansError('Unable to load membership plans right now.');
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await trainingService.getSessions({ type: 'class' });
      setSessions(data);
    } catch (error) {
      console.error('Failed to load class schedule:', error);
      setSessionsError('Unable to load the class schedule right now.');
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const list = await facilitiesService.getFacilities({ status: 'Active' });
      const map: Record<string, string> = {};
      list.forEach((f) => { map[f.id] = f.name; });
      setFacilityMap(map);
    } catch (error) {
      // Non-critical: plan cards fall back to showing raw facility ids.
      console.error('Failed to load facilities:', error);
    }
  };

  const fetchStreams = async () => {
    setStreamsLoading(true);
    setStreamsError(null);
    try {
      const data = await trainingStreamsService.getStreams();
      // Cancelled streams have nothing worth showing a member/kiosk visitor.
      setStreams(data.filter(s => s.status !== 'Cancelled'));
    } catch (error) {
      console.error('Failed to load training streams:', error);
      setStreamsError('Unable to load training streams right now.');
    } finally {
      setStreamsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchSessions();
    fetchFacilities();
    fetchStreams();
  }, []);

  // Auto-refresh functionality for kiosk mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && isFullscreen) {
      interval = setInterval(() => {
        setLastRefresh(new Date());
        fetchPlans();
        fetchSessions();
        fetchStreams();
      }, 10 * 60 * 1000); // 10 minutes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        // Check if fullscreen is available before attempting
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          // Fallback: just toggle the UI state without actual fullscreen
          setIsFullscreen(true);
          console.log('Fullscreen API not available, using simulated fullscreen mode');
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      // If fullscreen fails (e.g., due to permissions policy), just toggle UI state
      console.log('Fullscreen API blocked, using simulated fullscreen mode');
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleInquirySubmit = async () => {
    if (!inquiryData.name || !inquiryData.phone) return;
    setSubmittingInquiry(true);
    try {
      const [firstName, ...rest] = inquiryData.name.trim().split(/\s+/);
      await leadService.create({
        firstName: firstName || inquiryData.name,
        lastName: rest.join(' ') || undefined,
        email: inquiryData.email || undefined,
        phone: inquiryData.phone,
        source: 'walk_in',
        status: 'new',
        membershipInterest: inquiryData.interest || undefined,
        notes: inquiryData.message || undefined,
      });
      toast.success("Thanks! We've received your interest and will be in touch soon.");
      setShowInquiryForm(false);
      setInquiryData({ name: "", phone: "", email: "", interest: "", message: "" });
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      toast.error("Couldn't submit your inquiry right now. Please try again or speak to our front desk.");
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // A scheduled stream has no "book a seat" backend of its own, so route interest
  // through the same real leadService-backed inquiry flow used elsewhere on this page.
  const handleStreamInterest = (stream: TrainingStreamApi) => {
    setInquiryData({
      ...inquiryData,
      interest: stream.category || 'general',
      message: `I'm interested in "${stream.title}"${stream.scheduled_time ? ` (scheduled ${new Date(stream.scheduled_time).toLocaleString()})` : ''}.`,
    });
    setShowInquiryForm(true);
  };

  const getStreamStatusColor = (status: string) => {
    switch (status) {
      case 'Live': return 'bg-red-100 text-red-800';
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStreamDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateQRCode = () => {
    setShowQRCode(true);
  };

  const exportToPDF = () => {
    toast.success('Opening print dialog — choose "Save as PDF" to export the catalog.');
    window.print();
  };

  // Deterministic color assignment for plan cards (purely visual — plans
  // don't carry a "color" field from the backend).
  const planColorCycle = ['blue', 'purple', 'gold', 'emerald'];
  const getPlanColor = (index: number) => {
    switch (planColorCycle[index % planColorCycle.length]) {
      case 'blue': return 'from-blue-500 to-blue-600';
      case 'purple': return 'from-purple-500 to-purple-600';
      case 'gold': return 'from-yellow-500 to-yellow-600';
      case 'emerald': return 'from-emerald-500 to-emerald-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // Builds a human-readable feature/benefit list from the real Plan fields
  // returned by plansService — no fabricated benefits.
  const getPlanFeatures = (plan: Plan): string[] => {
    const features: string[] = [];
    if (plan.description) features.push(plan.description);
    features.push(plan.maxSessions ? `${plan.maxSessions} sessions included` : 'Unlimited sessions');
    if (plan.attendanceLimit && plan.attendanceLimit !== 'Unlimited' && plan.attendanceValue) {
      features.push(`${plan.attendanceValue} visits per ${plan.attendancePeriod || 'period'}`);
    } else {
      features.push('Unlimited gym access');
    }
    if (plan.selectedFacilities && plan.selectedFacilities.length > 0) {
      const names = plan.selectedFacilities.map((id) => facilityMap[id] || id);
      features.push(`Facility access: ${names.join(', ')}`);
    }
    if (plan.maxFreezeDays) {
      features.push(`Up to ${plan.maxFreezeDays} freeze day${plan.maxFreezeDays === 1 ? '' : 's'}`);
    }
    return features;
  };

  const getSessionStatusColor = (status?: string | null) => {
    switch ((status || '').toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleClassInterest = (session: TrainingSessionApi) => {
    setInquiryData({
      ...inquiryData,
      interest: 'group-classes',
      message: `I'd like to reserve a spot in "${session.name}" (${session.date}, ${session.startTime}-${session.endTime}).`
    });
    setShowInquiryForm(true);
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''} p-6 space-y-6 bg-gray-50 min-h-screen overflow-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${isFullscreen ? 'text-4xl' : 'text-3xl'} font-bold text-gray-900`}>
            Plans & Services Catalog
          </h1>
          <p className={`text-gray-600 mt-1 ${isFullscreen ? 'text-lg' : ''}`}>
            Discover our comprehensive fitness plans, training programs, and group classes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isFullscreen && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </div>
          )}
          
          {/* Header Action Buttons */}
          <Button
            variant="outline"
            size={isFullscreen ? "default" : "sm"}
            onClick={generateQRCode}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
          
          <Button
            variant="outline"
            size={isFullscreen ? "default" : "sm"}
            onClick={exportToPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          
          <Button
            variant="outline"
            size={isFullscreen ? "default" : "sm"}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Full Screen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                Full Screen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Actions for Walk-in Inquiries */}
      {!isFullscreen && (
        <div className="flex items-center justify-center space-x-4">
          <Dialog open={showInquiryForm} onOpenChange={setShowInquiryForm}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <UserPlus className="h-4 w-4 mr-2" />
                I'm Interested
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Express Your Interest</DialogTitle>
                <DialogDescription>
                  Fill out this quick form and our team will contact you soon!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={inquiryData.name}
                      onChange={(e) => setInquiryData({...inquiryData, name: e.target.value})}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={inquiryData.phone}
                      onChange={(e) => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) setInquiryData({...inquiryData, phone: v}); }}
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inquiryData.email}
                    onChange={(e) => setInquiryData({...inquiryData, email: e.target.value})}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="interest">I'm Interested In</Label>
                  <Select value={inquiryData.interest} onValueChange={(value) => setInquiryData({...inquiryData, interest: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Membership Plans</SelectItem>
                      <SelectItem value="personal-training">Personal Training</SelectItem>
                      <SelectItem value="group-classes">Group Classes</SelectItem>
                      <SelectItem value="crossfit">CrossFit Training</SelectItem>
                      <SelectItem value="yoga">Yoga & Mindfulness</SelectItem>
                      <SelectItem value="hiit">HIIT Bootcamp</SelectItem>
                      <SelectItem value="general">General Information</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Additional Message</Label>
                  <Textarea
                    id="message"
                    value={inquiryData.message}
                    onChange={(e) => setInquiryData({...inquiryData, message: e.target.value})}
                    placeholder="Tell us more about your fitness goals..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowInquiryForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInquirySubmit} disabled={!inquiryData.name || !inquiryData.phone || submittingInquiry}>
                  {submittingInquiry ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Inquiry'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showOnboardForm} onOpenChange={setShowOnboardForm}>
            <DialogTrigger asChild>
              <Button className="bg-[#2B7A78] hover:bg-[#2B7A78]/90 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Member On-board
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>Member On-boarding</DialogTitle>
                <DialogDescription>
                  Complete the form below to register a new member
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6">
                <AddMember onNavigate={() => setShowOnboardForm(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Content Sections */}
      <Tabs defaultValue="memberships" className="space-y-6">
        <TabsList className={`w-full flex ${isFullscreen ? 'h-16 text-lg' : ''}`}>
          {catalogConfig.membershipPlans && (
            <TabsTrigger value="memberships" className="flex-1 flex items-center justify-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Membership Plans & Pricing</span>
            </TabsTrigger>
          )}
          {catalogConfig.trainingStreams && (
            <TabsTrigger value="training" className="flex-1 flex items-center justify-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Training Streams</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="classes" className="flex-1 flex items-center justify-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Scheduled Classes</span>
          </TabsTrigger>
        </TabsList>

        {/* Membership Plans Section */}
        {catalogConfig.membershipPlans && (
          <TabsContent value="memberships" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <h2 className={`${isFullscreen ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>Choose Your Perfect Plan</h2>
              <p className={`text-gray-600 max-w-2xl mx-auto ${isFullscreen ? 'text-lg' : ''}`}>
                Start your fitness journey with our flexible membership options designed for every lifestyle and budget
              </p>
            </div>

            {plansLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p>Loading membership plans...</p>
              </div>
            )}

            {!plansLoading && plansError && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                <p className="text-gray-700 mb-4">{plansError}</p>
                <Button variant="outline" onClick={fetchPlans}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {!plansLoading && !plansError && plans.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                No active membership plans are configured yet.
              </div>
            )}

            {!plansLoading && !plansError && plans.length > 0 && (
              <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                {plans.map((plan, index) => (
                  <Card key={plan.id} className={`${cardShell} relative overflow-hidden transition-all duration-300 ${isFullscreen ? 'h-auto' : ''}`}>
                    <div className={`bg-gradient-to-r ${getPlanColor(index)} text-white p-6`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={`${isFullscreen ? 'text-xl' : 'text-lg'} font-bold`}>{plan.name}</h3>
                          <p className={`${isFullscreen ? 'text-base' : 'text-sm'} opacity-90`}>{plan.duration}</p>
                        </div>
                        {plan.discount > 0 && (
                          <Badge variant="secondary" className="bg-white/20 text-white">
                            {plan.discount}% OFF
                          </Badge>
                        )}
                      </div>

                      <div className="text-center">
                        <div className={`${isFullscreen ? 'text-4xl' : 'text-3xl'} font-bold mb-1`}>
                          <CurrencyGlyph /> {plan.price.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <ul className="space-y-3 mb-6">
                        {getPlanFeatures(plan).map((feature, idx) => (
                          <li key={idx} className={`flex items-start space-x-2 ${isFullscreen ? 'text-base' : 'text-sm'}`}>
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="space-y-3">
                        <Button
                          className="w-full bg-[#2B7A78] hover:bg-[#236360] text-white"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowChoosePlan(true);
                          }}
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Choose Plan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-primary text-primary hover:bg-primary/10"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowPlanDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Training Streams Section */}
        {catalogConfig.trainingStreams && (
          <TabsContent value="training" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <h2 className={`${isFullscreen ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>Training Streams</h2>
              <p className={`text-gray-600 max-w-2xl mx-auto ${isFullscreen ? 'text-lg' : ''}`}>
                Join a live session or catch up on a past recording, led by our trainers
              </p>
            </div>

            {streamsLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p>Loading training streams...</p>
              </div>
            )}

            {!streamsLoading && streamsError && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                <p className="text-gray-700 mb-4">{streamsError}</p>
                <Button variant="outline" onClick={fetchStreams}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {!streamsLoading && !streamsError && streams.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                No training streams are scheduled right now.
              </div>
            )}

            {!streamsLoading && !streamsError && streams.length > 0 && (
              <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                {streams.map((stream) => (
                  <Card key={stream.id} className={`${cardShell} overflow-hidden transition-all duration-300`}>
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className={`${isFullscreen ? 'text-xl' : 'text-lg'}`}>{stream.title}</CardTitle>
                            {stream.status === 'Live' && <Radio className="h-4 w-4 text-red-600 animate-pulse" />}
                          </div>
                          <CardDescription className={`${isFullscreen ? 'text-base' : ''} mt-1 flex items-center space-x-2`}>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {stream.instructor_name ? stream.instructor_name.charAt(0) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{stream.instructor_name || 'Trainer TBA'}</span>
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getStreamStatusColor(stream.status)}>{stream.status}</Badge>
                          {stream.difficulty && (
                            <Badge className={getStreamDifficultyColor(stream.difficulty)} variant="outline">{stream.difficulty}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-4">
                      {stream.description && (
                        <p className={`${isFullscreen ? 'text-sm' : 'text-xs'} text-gray-600`}>{stream.description}</p>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-4">
                        <Badge variant="outline">{stream.category}</Badge>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{stream.duration} min</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{stream.participants}{stream.max_participants ? `/${stream.max_participants}` : ''}</span>
                        </div>
                      </div>

                      {stream.status === 'Scheduled' && stream.scheduled_time && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(stream.scheduled_time).toLocaleString()}</span>
                        </div>
                      )}

                      {(stream.status === 'Live' || stream.status === 'Ended') && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{stream.views} views</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-4 w-4" />
                            <span>{stream.likes} likes</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        {stream.status === 'Live' && stream.stream_url ? (
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => window.open(stream.stream_url!, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Join Live Session
                          </Button>
                        ) : stream.status === 'Ended' && stream.stream_url ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(stream.stream_url!, '_blank', 'noopener,noreferrer')}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Watch Recording
                          </Button>
                        ) : stream.status === 'Scheduled' ? (
                          <Button
                            className="w-full bg-[#2B7A78] hover:bg-[#236360] text-white"
                            onClick={() => handleStreamInterest(stream)}
                          >
                            I'm Interested
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Classes Section */}
        <TabsContent value="classes" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="text-center mb-8">
            <h2 className={`${isFullscreen ? 'text-3xl' : 'text-2xl'} font-bold mb-4`}>Group Class Schedule</h2>
            <p className={`text-gray-600 max-w-2xl mx-auto ${isFullscreen ? 'text-lg' : ''}`}>
              Join our energizing group classes designed for all fitness levels
            </p>
          </div>

          {sessionsLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p>Loading class schedule...</p>
            </div>
          )}

          {!sessionsLoading && sessionsError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
              <p className="text-gray-700 mb-4">{sessionsError}</p>
              <Button variant="outline" onClick={fetchSessions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {!sessionsLoading && !sessionsError && sessions.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              No group classes are scheduled right now.
            </div>
          )}

          {!sessionsLoading && !sessionsError && sessions.length > 0 && (
            <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
              {sessions.map((classItem) => {
                const isFull = classItem.capacity != null && classItem.booked != null && classItem.booked >= classItem.capacity;
                return (
                  <Card key={classItem.id} className={`${cardShell} overflow-hidden transition-all duration-300`}>
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className={`${isFullscreen ? 'text-xl' : 'text-lg'}`}>{classItem.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex items-center space-x-2 mt-2">
                              <Users className="h-4 w-4" />
                              <span>with {classItem.trainerName || 'Trainer TBA'}</span>
                            </div>
                          </CardDescription>
                        </div>
                        {classItem.status && (
                          <Badge className={getSessionStatusColor(classItem.status)}>
                            {classItem.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{classItem.date}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{classItem.startTime} - {classItem.endTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{classItem.location || 'Location TBA'}</span>
                      </div>

                      {classItem.price != null && (
                        <div className="text-sm text-gray-600">
                          Price: <span className="font-medium text-gray-900"><CurrencyGlyph /> {classItem.price}</span>
                        </div>
                      )}

                      {classItem.capacity != null && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">Enrollment:</span>
                            <span className="font-medium">{classItem.booked ?? 0}/{classItem.capacity} spots</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#2B7A78] h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, ((classItem.booked ?? 0) / classItem.capacity) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full bg-[#2B7A78] hover:bg-[#236360] text-white"
                        disabled={isFull}
                        onClick={() => handleClassInterest(classItem)}
                      >
                        {isFull ? 'Class Full' : 'Reserve Spot'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Action Buttons in Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed bottom-8 right-8 flex space-x-4">
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={() => setShowInquiryForm(true)}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            I'm Interested
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={generateQRCode}
          >
            <QrCode className="h-5 w-5 mr-2" />
            QR Code
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={exportToPDF}
          >
            <Download className="h-5 w-5 mr-2" />
            Print PDF
          </Button>
        </div>
      )}

      {/* Plan Details Dialog */}
      <Dialog open={showPlanDetails} onOpenChange={setShowPlanDetails}>
        <DialogContent className="sm:max-w-[600px]" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="text-2xl">{selectedPlan.name}</span>
                  {selectedPlan.discount > 0 && (
                    <Badge className={`bg-gradient-to-r ${getPlanColor(Math.max(0, plans.findIndex(p => p.id === selectedPlan.id)))} text-white`}>
                      {selectedPlan.discount}% OFF
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Complete details about this membership plan
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Pricing Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Plan Price</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-[#2B7A78]"><CurrencyGlyph /> {selectedPlan.price.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Duration: {selectedPlan.duration}</p>
                </div>

                {/* Features Section */}
                <div>
                  <h4 className="font-semibold text-lg mb-4">Plan Features & Benefits</h4>
                  <ul className="space-y-3">
                    {getPlanFeatures(selectedPlan).map((feature: string, index: number) => (
                      <li key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Additional Information */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2 text-yellow-800">Important Notes:</h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• All prices are in <CurrencyGlyph /> and inclusive of VAT</li>
                    <li>• Membership starts from the date of registration</li>
                    <li>• No refunds on early cancellation</li>
                    <li>• Photo ID required for registration</li>
                    <li>• Terms and conditions apply</li>
                  </ul>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-[#2B7A78]" />
                    <span>+971 50 123 4567</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-[#2B7A78]" />
                    <span>info@gymbios.com</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <Button 
                  className="flex-1 bg-[#2B7A78] hover:bg-[#236360] text-white"
                  onClick={() => {
                    setShowPlanDetails(false);
                    setShowChoosePlan(true);
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Choose This Plan
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowPlanDetails(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Choose Plan Dialog */}
      <Dialog open={showChoosePlan} onOpenChange={setShowChoosePlan}>
        <DialogContent className="sm:max-w-[600px]" style={{ maxHeight: '90vh', overflow: 'auto' }}>
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle>Choose {selectedPlan.name}</DialogTitle>
                <DialogDescription>
                  Select how you want to proceed with this membership plan
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {/* Selected Plan Summary */}
                <div className={`bg-gradient-to-r ${getPlanColor(Math.max(0, plans.findIndex(p => p.id === selectedPlan.id)))} text-white p-6 rounded-lg`}>
                  <h3 className="text-xl font-bold mb-2">{selectedPlan.name}</h3>
                  <div className="flex items-baseline space-x-2 mb-3">
                    <span className="text-3xl font-bold"><CurrencyGlyph /> {selectedPlan.price.toLocaleString()}</span>
                    <span className="text-sm opacity-75">for {selectedPlan.duration}</span>
                  </div>
                </div>

                {/* Action Options */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Choose Your Action:</h4>
                  
                  {/* Option 1: Existing Member */}
                  <Card className={`${cardShell} border-2 border-transparent hover:border-[#2B7A78] transition-all cursor-pointer`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg mb-2">I'm an Existing Member</h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Add this plan to your current membership or upgrade your existing plan
                          </p>
                          <Button
                            className="bg-[#2B7A78] hover:bg-[#236360] text-white"
                            onClick={() => {
                              setShowChoosePlan(false);
                              // Honest gap: there is no member self-service portal in this app —
                              // every plan/addon change goes through staff via the Members section.
                              // Kiosk visitors can't add a plan to their own account from here yet.
                              toast.info(`To add ${selectedPlan.name} to an existing membership, please see our front desk team.`);
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Add to My Account
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 2: New Member */}
                  <Card className={`${cardShell} border-2 border-transparent hover:border-[#2B7A78] transition-all cursor-pointer`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg mb-2">I'm a New Member</h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Start your fitness journey by completing our quick on-boarding process
                          </p>
                          <Button 
                            className="bg-[#2B7A78] hover:bg-[#236360] text-white"
                            onClick={() => {
                              setShowChoosePlan(false);
                              setShowDraftModal(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register as New Member
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 3: Inquiry */}
                  <Card className={`${cardShell} border-2 border-transparent hover:border-[#2B7A78] transition-all cursor-pointer`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg mb-2">I Have Questions</h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Get in touch with our team to learn more about this plan
                          </p>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline"
                              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                              onClick={() => {
                                setShowChoosePlan(false);
                                setInquiryData({ ...inquiryData, interest: 'membership' });
                                setShowInquiryForm(true);
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Inquiry
                            </Button>
                            <Button 
                              variant="outline"
                              className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10"
                              onClick={() => {
                                window.location.href = 'tel:+971501234567';
                              }}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call Us
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setShowChoosePlan(false)}
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to View This Catalog</DialogTitle>
            <DialogDescription className="text-center">
              Scan with your phone to open this page on your own device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <QRCode value={window.location.href} size={192} bgColor="#FFFFFF" fgColor="#1f2937" level="M" />
            </div>
            <p className="text-xs text-gray-500 break-all text-center">{window.location.href}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Draft Modal */}
      <MemberDraftModal
        open={showDraftModal}
        onOpenChange={setShowDraftModal}
        selectedPlan={selectedPlan ? {
          id: selectedPlan.id.toString(),
          name: selectedPlan.name,
          price: selectedPlan.price,
          duration: selectedPlan.duration,
          benefits: getPlanFeatures(selectedPlan),
          discount: selectedPlan.discount
        } : null}
        onSubmitDraft={(draftData) => {
          setPendingMembers(prev => [...prev, draftData]);
          
          // Save to sessionStorage (simulating backend)
          const existing = JSON.parse(sessionStorage.getItem('pendingMembers') || '[]');
          existing.push(draftData);
          sessionStorage.setItem('pendingMembers', JSON.stringify(existing));
          
          // Notify other components
          window.dispatchEvent(new Event('pendingMembersUpdated'));
          
          console.log('Draft submitted:', draftData);
        }}
      />
    </div>
  );
}

