import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Target,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Eye,
  Share,
  Phone,
  Megaphone,
  Zap,
  CheckCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';

// Sample data for the dashboard
const engagementTrendData = [
  { month: 'Jan', engaged: 245, conversions: 32, followUps: 89 },
  { month: 'Feb', engaged: 278, conversions: 41, followUps: 95 },
  { month: 'Mar', engaged: 312, conversions: 38, followUps: 102 },
  { month: 'Apr', engaged: 289, conversions: 45, followUps: 87 },
  { month: 'May', engaged: 356, conversions: 52, followUps: 114 },
  { month: 'Jun', engaged: 334, conversions: 48, followUps: 98 },
  { month: 'Jul', engaged: 398, conversions: 57, followUps: 125 },
  { month: 'Aug', engaged: 421, conversions: 62, followUps: 131 },
  { month: 'Sep', engaged: 467, conversions: 68, followUps: 142 }
];

const leadFunnelData = [
  { name: 'Website Visits', value: 2400, fill: '#8884d8' },
  { name: 'Inquiries', value: 1200, fill: '#82ca9d' },
  { name: 'Tours Scheduled', value: 480, fill: '#ffc658' },
  { name: 'Tours Completed', value: 320, fill: '#ff7300' },
  { name: 'Memberships Sold', value: 156, fill: '#dd4477' }
];

const referralSourceData = [
  { name: 'Word of Mouth', value: 45, fill: '#0088FE' },
  { name: 'Social Media', value: 28, fill: '#00C49F' },
  { name: 'Website', value: 18, fill: '#FFBB28' },
  { name: 'Google Ads', value: 9, fill: '#FF8042' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function MemberConnect() {
  // KPI Data
  const totalMembersEngaged = 467;
  const campaignConversions = 156;
  const followUpCompletionRate = 87;
  const messagingEffectiveness = 74;
  const engagementScore = 82;
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const handleViewDetails = (section: string) => {
    // In a real app, this would navigate to the specific sub-module
    console.log(`Navigate to ${section} details`);
  };

  return (
      <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Member Connect</h1>
          <p className="text-muted-foreground">Overall Performance Dashboard - Strategic insights across all connect features</p>
        </div>
        <Button onClick={() => handleViewDetails('campaigns')}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          View All Campaigns
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Members Engaged</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalMembersEngaged.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Unique members touched through Connect features
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('members')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Campaign Conversions</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{campaignConversions}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Promotions + referrals + leads converted
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('promotions-campaign')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Follow-up Completion</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{followUpCompletionRate}%</div>
            <p className="text-xs text-muted-foreground mb-3">
              Done vs pending across staff
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('follow-ups')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Messaging Effectiveness</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <MessageSquare className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{messagingEffectiveness}%</div>
            <p className="text-xs text-muted-foreground mb-3">
              Avg open/response rate across campaigns
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('messaging')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Engagement Score</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{engagementScore}/100</div>
            <p className="text-xs text-muted-foreground mb-3">
              Weighted index combining all metrics
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('analytics')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trends Chart */}
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>Monthly performance across key metrics</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewDetails('trends')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="engaged" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Members Engaged"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Conversions"
                />
                <Line 
                  type="monotone" 
                  dataKey="followUps" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Follow-ups"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Referral Sources Pie Chart */}
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Referral Sources</CardTitle>
              <CardDescription>Distribution of new member sources</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewDetails('referrals')}
            >
              <Share className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={referralSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {referralSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lead Funnel Chart */}
      <Card className={cardShell}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lead Conversion Funnel</CardTitle>
            <CardDescription>Track prospects through the conversion journey</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleViewDetails('leads')}
          >
            <Target className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={leadFunnelData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {leadFunnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Score Gauge */}
      <Card className={cardShell}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Engagement Score Overview</CardTitle>
            <CardDescription>Weighted index combining check-ins, responses, referrals, and campaign performance</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleViewDetails('analytics')}
          >
            <Activity className="mr-2 h-4 w-4" />
            View Full Analytics
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Engagement Score Circle */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - engagementScore / 100)}`}
                    className="text-indigo-600 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{engagementScore}</div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="font-medium">Overall Engagement</div>
                <div className="text-sm text-muted-foreground">Excellent Performance</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="col-span-2 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Member Check-ins</span>
                  <span className="text-sm text-muted-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Campaign Response Rate</span>
                  <span className="text-sm text-muted-foreground">74%</span>
                </div>
                <Progress value={74} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Referral Activity</span>
                  <span className="text-sm text-muted-foreground">68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Follow-up Success</span>
                  <span className="text-sm text-muted-foreground">87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Automation Performance</span>
                  <span className="text-sm text-muted-foreground">79%</span>
                </div>
                <Progress value={79} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('promotions-campaign')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Megaphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium">Promotions</div>
              <div className="text-sm text-muted-foreground">Manage campaigns</div>
            </div>
          </div>
        </Card>

        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('referrals')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Share className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-medium">Referrals</div>
              <div className="text-sm text-muted-foreground">Track referrals</div>
            </div>
          </div>
        </Card>

        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('leads')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="font-medium">Leads</div>
              <div className="text-sm text-muted-foreground">Manage prospects</div>
            </div>
          </div>
        </Card>

        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('follow-ups')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium">Follow-ups</div>
              <div className="text-sm text-muted-foreground">Schedule calls</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

