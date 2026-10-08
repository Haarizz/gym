import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ComposedChart } from 'recharts';
import {
  Brain,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Database,
  Activity,
  Zap,
  Target,
  Users,
  DollarSign,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Filter,
  Settings,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  TrendingUpDown,
  BarChart3,
  PieChart as PieChartIcon,
  Award,
  AlertCircle,
  Info,
  Star
} from 'lucide-react';

interface BusinessIntelligenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
}

export function BusinessIntelligenceDialog({
  open,
  onOpenChange,
  formatCurrency,
  getCurrentPeriod
}: BusinessIntelligenceDialogProps) {
  // AI-Generated Insights
  const aiInsights = [
    {
      id: 1,
      type: 'opportunity',
      title: 'Peak Hour Revenue Optimization',
      description: 'Analysis shows 6-8 PM generates 40% more revenue per member. Recommend introducing premium "Prime Time" pricing tier.',
      confidence: 94,
      impact: 'High',
      potentialValue: 15500,
      category: 'Revenue',
      dataPoints: 2847,
      generated: '2 hours ago',
      actionable: true,
      status: 'new'
    },
    {
      id: 2,
      type: 'insight',
      title: 'Member Engagement Pattern Discovered',
      description: 'Members who attend group classes within first 14 days have 87% higher retention rate. Implement mandatory intro class for new members.',
      confidence: 91,
      impact: 'High',
      potentialValue: 12300,
      category: 'Retention',
      dataPoints: 1523,
      generated: '5 hours ago',
      actionable: true,
      status: 'new'
    },
    {
      id: 3,
      type: 'alert',
      title: 'Churn Risk Prediction',
      description: 'ML model identifies 23 members showing early churn indicators (reduced check-ins, cancelled PT sessions). Immediate intervention recommended.',
      confidence: 88,
      impact: 'Medium',
      potentialValue: 8900,
      category: 'Risk',
      dataPoints: 892,
      generated: '1 day ago',
      actionable: true,
      status: 'reviewed'
    },
    {
      id: 4,
      type: 'opportunity',
      title: 'Personal Training Upsell Window',
      description: 'Members between 45-90 days tenure show highest PT conversion rate (32%). Automated campaign targeting this cohort could increase PT revenue.',
      confidence: 89,
      impact: 'Medium',
      potentialValue: 18700,
      category: 'Revenue',
      dataPoints: 1247,
      generated: '1 day ago',
      actionable: true,
      status: 'in-progress'
    },
    {
      id: 5,
      type: 'insight',
      title: 'Equipment Utilization Imbalance',
      description: 'Cardio equipment at 94% capacity while strength equipment at 52%. Member surveys indicate demand for more cardio. Budget reallocation recommended.',
      confidence: 92,
      impact: 'High',
      potentialValue: 0,
      category: 'Operations',
      dataPoints: 3421,
      generated: '2 days ago',
      actionable: true,
      status: 'implemented'
    },
    {
      id: 6,
      type: 'insight',
      title: 'Weekend Class Opportunity',
      description: 'Saturday morning slots show 23% higher attendance than weekday mornings. Consider expanding weekend class schedule.',
      confidence: 87,
      impact: 'Medium',
      potentialValue: 6200,
      category: 'Operations',
      dataPoints: 1876,
      generated: '3 days ago',
      actionable: true,
      status: 'new'
    }
  ];

  // Data Sources
  const dataSources = [
    {
      source: 'Member Management System',
      status: 'Active',
      lastSync: '5 minutes ago',
      records: 847,
      quality: 98,
      integration: 'Real-time'
    },
    {
      source: 'Financial System',
      status: 'Active',
      lastSync: '10 minutes ago',
      records: 2341,
      quality: 99,
      integration: 'Real-time'
    },
    {
      source: 'Booking System',
      status: 'Active',
      lastSync: '2 minutes ago',
      records: 1523,
      quality: 97,
      integration: 'Real-time'
    },
    {
      source: 'Check-in System',
      status: 'Active',
      lastSync: '1 minute ago',
      records: 5847,
      quality: 96,
      integration: 'Real-time'
    },
    {
      source: 'Retail POS',
      status: 'Active',
      lastSync: '15 minutes ago',
      records: 432,
      quality: 95,
      integration: 'Batch (15min)'
    },
    {
      source: 'Survey System',
      status: 'Active',
      lastSync: '1 hour ago',
      records: 234,
      quality: 93,
      integration: 'Batch (1hr)'
    },
    {
      source: 'Marketing Platform',
      status: 'Active',
      lastSync: '30 minutes ago',
      records: 1247,
      quality: 94,
      integration: 'Batch (30min)'
    },
    {
      source: 'External Industry Data',
      status: 'Active',
      lastSync: '1 day ago',
      records: 156,
      quality: 90,
      integration: 'Daily'
    }
  ];

  // Analysis Models
  const analysisModels = [
    {
      model: 'Churn Prediction Model',
      type: 'Machine Learning',
      accuracy: 87.5,
      status: 'Active',
      lastTrained: '5 days ago',
      predictions: 847,
      version: 'v2.3'
    },
    {
      model: 'Revenue Forecasting',
      type: 'Time Series',
      accuracy: 92.3,
      status: 'Active',
      lastTrained: '3 days ago',
      predictions: 6,
      version: 'v3.1'
    },
    {
      model: 'Member Segmentation',
      type: 'Clustering',
      accuracy: 89.1,
      status: 'Active',
      lastTrained: '7 days ago',
      predictions: 847,
      version: 'v1.8'
    },
    {
      model: 'Demand Prediction',
      type: 'Regression',
      accuracy: 84.7,
      status: 'Active',
      lastTrained: '2 days ago',
      predictions: 168,
      version: 'v2.0'
    },
    {
      model: 'Sentiment Analysis',
      type: 'NLP',
      accuracy: 91.2,
      status: 'Active',
      lastTrained: '1 day ago',
      predictions: 234,
      version: 'v1.5'
    }
  ];

  // Insight Performance Data
  const insightPerformance = [
    { month: 'Jan', implemented: 4, successful: 3, revenue: 12500 },
    { month: 'Feb', implemented: 6, successful: 5, revenue: 18200 },
    { month: 'Mar', implemented: 5, successful: 4, revenue: 15800 },
    { month: 'Apr', implemented: 7, successful: 6, revenue: 22400 },
    { month: 'May', implemented: 8, successful: 7, revenue: 28900 },
    { month: 'Jun', implemented: 6, successful: 5, revenue: 19700 }
  ];

  // Category Distribution
  const categoryData = [
    { category: 'Revenue', count: 12, value: 45 },
    { category: 'Retention', count: 8, value: 30 },
    { category: 'Operations', count: 6, value: 22 },
    { category: 'Risk', count: 3, value: 11 }
  ];

  // Insight Impact vs Confidence
  const impactConfidenceData = [
    { name: 'Peak Hour Pricing', confidence: 94, impact: 85, value: 15500 },
    { name: 'PT Upsell Campaign', confidence: 89, impact: 75, value: 18700 },
    { name: 'Churn Prevention', confidence: 88, impact: 70, value: 8900 },
    { name: 'Weekend Classes', confidence: 87, impact: 65, value: 6200 },
    { name: 'Equipment Reallocation', confidence: 92, impact: 80, value: 12000 },
    { name: 'Intro Class Program', confidence: 91, impact: 90, value: 12300 }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Zap className="h-5 w-5 text-green-600" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'insight':
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'implemented':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-[#2B7A78]" />
            <span>Business Intelligence - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            AI-powered insights, predictive analytics, and data-driven recommendations
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="datasources">Data Sources</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-[#2B7A78]" />
                <div>
                  <h3 className="font-semibold">Active Insights</h3>
                  <p className="text-sm text-muted-foreground">{aiInsights.length} AI-generated recommendations</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              {aiInsights.map((insight) => (
                <Card key={insight.id} className="border-l-4" style={{ borderLeftColor: insight.type === 'opportunity' ? '#10b981' : insight.type === 'alert' ? '#f59e0b' : '#3b82f6' }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <CardTitle className="text-base">{insight.title}</CardTitle>
                            <Badge className={getStatusColor(insight.status)}>
                              {insight.status.replace('-', ' ')}
                            </Badge>
                          </div>
                          <CardDescription className="mt-1">{insight.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className={getImpactColor(insight.impact)}>
                        {insight.impact} Impact
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={insight.confidence} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{insight.confidence}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Category</p>
                        <Badge variant="outline">{insight.category}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Potential Value</p>
                        <p className="text-sm font-medium">{insight.potentialValue > 0 ? formatCurrency(insight.potentialValue) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Data Points</p>
                        <p className="text-sm font-medium">{insight.dataPoints.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Generated</p>
                        <p className="text-sm">{insight.generated}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Implement
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        Deep Dive
                      </Button>
                      <Button size="sm" variant="outline">
                        <Bell className="h-4 w-4 mr-2" />
                        Set Alert
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Helpful
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Not Relevant
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Insight Impact vs Confidence</CardTitle>
                  <CardDescription>Comparing prediction confidence with business impact</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="confidence" name="Confidence" unit="%" domain={[80, 100]} />
                      <YAxis type="number" dataKey="impact" name="Impact" domain={[50, 100]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border rounded shadow-lg">
                                <p className="font-medium">{payload[0].payload.name}</p>
                                <p className="text-sm">Confidence: {payload[0].payload.confidence}%</p>
                                <p className="text-sm">Impact: {payload[0].payload.impact}</p>
                                <p className="text-sm">Value: {formatCurrency(payload[0].payload.value)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={impactConfidenceData} fill="#2B7A78" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Insights by Category</CardTitle>
                  <CardDescription>Distribution of insights across business areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryData.map((cat, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{cat.category}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{cat.count} insights</Badge>
                            <span className="text-sm font-medium">{cat.value}%</span>
                          </div>
                        </div>
                        <Progress value={cat.value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Insight Implementation Performance</CardTitle>
                  <CardDescription>Monthly tracking of implemented insights and revenue impact</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={insightPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="implemented" fill="#3b82f6" name="Insights Implemented" />
                      <Bar yAxisId="left" dataKey="successful" fill="#10b981" name="Successful" />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#E63946" strokeWidth={2} name="Revenue Impact (AED)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="datasources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected Data Sources</CardTitle>
                <CardDescription>Real-time and batch data integrations powering your insights</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead className="text-right">Quality</TableHead>
                      <TableHead>Integration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataSources.map((source, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-[#2B7A78]" />
                            <span>{source.source}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <Activity className="h-3 w-3 mr-1" />
                            {source.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{source.lastSync}</TableCell>
                        <TableCell className="text-right">{source.records.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Progress value={source.quality} className="h-2 w-16" />
                            <span className="text-sm font-medium">{source.quality}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{source.integration}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Data Points</p>
                      <p className="text-2xl font-bold">12,487</p>
                      <p className="text-xs text-green-600 mt-1">+847 today</p>
                    </div>
                    <Database className="h-10 w-10 text-[#2B7A78] opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Data Quality</p>
                      <p className="text-2xl font-bold">95.3%</p>
                      <p className="text-xs text-green-600 mt-1">+1.2% this month</p>
                    </div>
                    <Award className="h-10 w-10 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Sources</p>
                      <p className="text-2xl font-bold">8/8</p>
                      <p className="text-xs text-green-600 mt-1">All operational</p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active AI/ML Models</CardTitle>
                <CardDescription>Machine learning models generating predictive insights</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Accuracy</TableHead>
                      <TableHead>Last Trained</TableHead>
                      <TableHead className="text-right">Predictions</TableHead>
                      <TableHead>Version</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisModels.map((model, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Brain className="h-4 w-4 text-[#2B7A78]" />
                            <span>{model.model}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{model.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Progress value={model.accuracy} className="h-2 w-16" />
                            <span className="text-sm font-medium">{model.accuracy}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{model.lastTrained}</TableCell>
                        <TableCell className="text-right">{model.predictions.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{model.version}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analysisModels}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="model" angle={-45} textAnchor="end" height={100} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="accuracy" fill="#2B7A78" name="Accuracy %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model Training Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">All Models Operational</p>
                          <p className="text-xs text-muted-foreground">5 active models, 0 errors</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Accuracy</span>
                        <span className="text-sm font-medium">88.96%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Predictions</span>
                        <span className="text-sm font-medium">3,102</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Models Updated</span>
                        <span className="text-sm font-medium">Last week</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Insights</p>
                      <p className="text-2xl font-bold">127</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">+23 this month</span>
                      </div>
                    </div>
                    <Lightbulb className="h-8 w-8 text-yellow-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Implemented</p>
                      <p className="text-2xl font-bold">42</p>
                      <div className="flex items-center mt-1">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">33% adoption</span>
                      </div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">87.5%</p>
                      <div className="flex items-center mt-1">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-yellow-600">High accuracy</span>
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue Impact</p>
                      <p className="text-2xl font-bold">118K</p>
                      <div className="flex items-center mt-1">
                        <DollarSign className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">AED gained</span>
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">BI System Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Insight Accuracy</span>
                        <span className="text-sm font-medium">87.5%</span>
                      </div>
                      <Progress value={87.5} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Implementation Rate</span>
                        <span className="text-sm font-medium">33.1%</span>
                      </div>
                      <Progress value={33.1} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Data Quality Score</span>
                        <span className="text-sm font-medium">95.3%</span>
                      </div>
                      <Progress value={95.3} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">User Engagement</span>
                        <span className="text-sm font-medium">78.2%</span>
                      </div>
                      <Progress value={78.2} className="h-2" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">ROI from BI Insights</p>
                          <p className="text-2xl font-bold text-green-600">8.7x</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">Avg Response Time</p>
                          <p className="text-2xl font-bold text-blue-600">1.2s</p>
                        </div>
                        <Zap className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-800">Processing Uptime</p>
                          <p className="text-2xl font-bold text-purple-600">99.8%</p>
                        </div>
                        <Activity className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">BI System Configuration</CardTitle>
                <CardDescription>Configure alerts, automation, and insight preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Insight Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-generate insights</p>
                        <p className="text-xs text-muted-foreground">Automatically discover patterns and opportunities</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Minimum confidence threshold</p>
                        <p className="text-xs text-muted-foreground">Only show insights above this confidence level</p>
                      </div>
                      <Badge variant="outline">85%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Insight notifications</p>
                        <p className="text-xs text-muted-foreground">Get notified of high-impact insights</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Model Training</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-retrain models</p>
                        <p className="text-xs text-muted-foreground">Automatically retrain with new data</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Training frequency</p>
                        <p className="text-xs text-muted-foreground">How often to retrain models</p>
                      </div>
                      <Badge variant="outline">Weekly</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Data Refresh</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Real-time sync</p>
                        <p className="text-xs text-muted-foreground">Continuous data synchronization</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Last full refresh</p>
                        <p className="text-xs text-muted-foreground">Complete data reload</p>
                      </div>
                      <span className="text-sm">2 hours ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Refresh
              </Button>
              <Button className="bg-[#2B7A78] hover:bg-[#236663]">
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]">
            <Download className="h-4 w-4 mr-2" />
            Export Insights Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]">
            <FileText className="h-4 w-4 mr-2" />
            Generate Analysis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
