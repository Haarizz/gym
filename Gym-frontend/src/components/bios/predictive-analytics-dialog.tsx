import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import {
  TrendingUpDown,
  Zap,
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  DollarSign,
  Target,
  Bell,
  Settings,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  Info,
  Award,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Sparkles,
  LineChart as LineChartIcon,
  BarChart3,
  UserX,
  ShoppingCart,
  Wrench,
  CalendarClock,
  MessagesSquare
} from 'lucide-react';
import { type BiosLiveData, downloadCsv, BiosScheduleTable } from './bios-live';

interface PredictiveAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  predictiveInsights: Array<{
    insight: string;
    prediction: string;
    confidence: number;
    timeframe: string;
    action: string;
    priority: string;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function PredictiveAnalyticsDialog({
  open,
  onOpenChange,
  defaultTab = 'predictions',
  predictiveInsights,
  formatCurrency,
  getCurrentPeriod,
  live,
  onRefresh,
  refreshing = false
}: PredictiveAnalyticsDialogProps) {
  const [selectedPrediction, setSelectedPrediction] = React.useState('all');
  const [predictionHorizon, setPredictionHorizon] = React.useState('30');

  // Predictive insights from the AI service (or its rule-based fallback on live data).
  const categorize = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('churn') || t.includes('retention') || t.includes('expir')) return 'Churn Risk';
    if (t.includes('revenue') || t.includes('income') || t.includes('forecast')) return 'Revenue';
    if (t.includes('maint') || t.includes('equipment')) return 'Maintenance';
    if (t.includes('peak') || t.includes('staff') || t.includes('hour') || t.includes('check')) return 'Operations';
    if (t.includes('payment') || t.includes('overdue')) return 'Risk';
    if (t.includes('member') || t.includes('engag')) return 'Engagement';
    return 'Risk';
  };
  const enhancedInsights = predictiveInsights.map((insight, index) => ({
    id: index + 1,
    category: categorize(`${insight.insight} ${insight.prediction}`),
    insight: insight.insight,
    prediction: insight.prediction,
    confidence: insight.confidence,
    timeframe: insight.timeframe,
    action: insight.action,
    priority: insight.priority,
    potentialImpact: 0,
    affectedMembers: live.totalMembers,
    dataPoints: live.totalMembers,
    model: 'GymBios Insights',
    lastUpdated: 'This session',
    status: 'Active',
    recommendations: [insight.action]
  }));

  const exportPredictions = () => {
    downloadCsv(
      `bios-predictions_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Insight', 'Prediction', 'Confidence (%)', 'Timeframe', 'Recommended Action', 'Priority'],
      predictiveInsights.map((i) => [i.insight, i.prediction, i.confidence, i.timeframe, i.action, i.priority])
    );
  };

  // Prediction Scenarios — next month projected from the live trend.
  const trend = live.monthlyTrend;
  const lastRevenue = trend.length > 0 ? trend[trend.length - 1].revenue : 0;
  const avgChange = trend.length > 1 ? (lastRevenue - trend[0].revenue) / (trend.length - 1) : 0;
  const expectedRevenue = Math.max(0, Math.round(lastRevenue + avgChange));
  const memberGrowth = (live.memberGrowthRate ?? 0) / 100;
  const expectedMembers = Math.max(0, Math.round(live.activeMembers * (1 + memberGrowth)));
  const scenarios = [
    {
      name: 'Best Case Scenario',
      description: '10% above the current trend',
      revenue: Math.round(expectedRevenue * 1.1),
      members: Math.round(expectedMembers * 1.05),
      retention: Math.min(100, Number((live.retentionRate + 2).toFixed(1))),
      probability: 'Upside'
    },
    {
      name: 'Expected Scenario',
      description: 'Your last months of revenue and member growth, continued',
      revenue: expectedRevenue,
      members: expectedMembers,
      retention: live.retentionRate,
      probability: 'Current trend'
    },
    {
      name: 'Conservative Scenario',
      description: '8% below the current trend',
      revenue: Math.round(expectedRevenue * 0.92),
      members: Math.round(expectedMembers * 0.97),
      retention: Math.max(0, Number((live.retentionRate - 3).toFixed(1))),
      probability: 'Downside'
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Churn Risk':
        return <UserX className="h-5 w-5 text-red-600" />;
      case 'Revenue':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'Operations':
        return <Activity className="h-5 w-5 text-blue-600" />;
      case 'Maintenance':
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case 'Sales':
        return <ShoppingCart className="h-5 w-5 text-purple-600" />;
      case 'Engagement':
        return <Users className="h-5 w-5 text-cyan-600" />;
      case 'Risk':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'Marketing':
        return <Sparkles className="h-5 w-5 text-pink-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 80) return 'text-blue-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUpDown className="h-6 w-6 text-[#2B7A78]" />
            <span>Predictive Analytics - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            AI-powered predictions, forecasts, and proactive insights for business planning
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="alerts">Auto-Alerts</TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Brain className="h-5 w-5 text-[#2B7A78]" />
                <div>
                  <h3 className="font-semibold">Active Predictions</h3>
                  <p className="text-sm text-muted-foreground">{enhancedInsights.length} AI-powered forecasts</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={predictionHorizon} onValueChange={setPredictionHorizon}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              {enhancedInsights.length === 0 && (
                <p className="text-sm text-muted-foreground">No predictions yet — click Refresh once member and revenue data is available.</p>
              )}
              {enhancedInsights.map((insight) => (
                <Card key={insight.id} className="border-l-4" style={{ 
                  borderLeftColor: 
                    insight.priority === 'High' ? '#ef4444' : 
                    insight.priority === 'Medium' ? '#f59e0b' : 
                    '#10b981' 
                }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getCategoryIcon(insight.category)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-base">{insight.insight}</CardTitle>
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority} Priority
                            </Badge>
                            <Badge variant="outline">{insight.category}</Badge>
                          </div>
                          <CardDescription className="mt-1 font-medium text-base">
                            {insight.prediction}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={insight.confidence} className="h-2 flex-1" />
                          <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                            {insight.confidence}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Timeframe</p>
                        <div className="flex items-center space-x-1">
                          <CalendarClock className="h-3 w-3" />
                          <p className="text-sm">{insight.timeframe}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Potential Impact</p>
                        <p className={`text-sm font-medium ${insight.potentialImpact > 0 ? 'text-green-600' : insight.potentialImpact < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {insight.potentialImpact !== 0 ? formatCurrency(Math.abs(insight.potentialImpact)) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Model Used</p>
                        <Badge variant="outline" className="text-xs">{insight.model}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                        <p className="text-sm">{insight.lastUpdated}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded mb-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        <Lightbulb className="h-4 w-4 inline mr-1" />
                        Recommended Action
                      </p>
                      <p className="text-sm text-blue-700">{insight.action}</p>
                    </div>

                    <div className="space-y-2 mb-3">
                      <p className="text-xs font-medium text-muted-foreground">Actionable Recommendations:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {insight.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Implement Action
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Bell className="h-4 w-4 mr-2" />
                        Set Alert
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportPredictions}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-4">
            <div className="space-y-4">
              {scenarios.map((scenario, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{scenario.name}</CardTitle>
                        <CardDescription>{scenario.description}</CardDescription>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {scenario.probability}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(scenario.revenue)}</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground mb-1">Members</p>
                        <p className="text-xl font-bold text-blue-600">{scenario.members.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground mb-1">Retention</p>
                        <p className="text-xl font-bold text-purple-600">{scenario.retention}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Custom Scenario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Scenario Name</Label>
                    <Input placeholder="Enter scenario name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Revenue ({live.currencyCode})</Label>
                      <Input type="number" placeholder="140000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Members</Label>
                      <Input type="number" placeholder="900" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Key Assumptions</Label>
                    <Textarea placeholder="Describe the assumptions for this scenario..." />
                  </div>
                  <Button className="w-full bg-[#2B7A78] hover:bg-[#236663]">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Scenario
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div>
              <h3 className="font-semibold">Auto-Alert Configuration</h3>
              <p className="text-sm text-muted-foreground">The alerts BiOS sends for this branch, and their thresholds</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <BiosScheduleTable settings={live.settings} onConfigure={live.onConfigure} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]" onClick={exportPredictions}>
            <Download className="h-4 w-4 mr-2" />
            Export All Predictions
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]" onClick={live.onExportReport}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
