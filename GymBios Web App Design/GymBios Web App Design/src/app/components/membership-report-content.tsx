import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Download, RefreshCw, Users, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface MembershipReportContentProps {
  membershipData: any[];
  totalMembers: number;
  totalNewMembers: number;
  totalCancellations: number;
  retentionRate: string;
  selectedDateRange: string;
  selectedFormat: string;
  memberDemographics: any[];
  onDownload: () => void;
  onGenerateNew: () => void;
}

export function MembershipReportContent({
  membershipData,
  totalMembers,
  totalNewMembers,
  totalCancellations,
  retentionRate,
  selectedDateRange,
  selectedFormat,
  memberDemographics,
  onDownload,
  onGenerateNew,
}: MembershipReportContentProps) {
  return (
    <div className="mt-8 space-y-6">
      {/* Membership Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                  {totalMembers}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{((totalNewMembers / totalMembers) * 100).toFixed(1)}% growth
                </p>
              </div>
              <Users className="h-8 w-8" style={{ color: '#327F74' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Members</p>
                <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                  {totalNewMembers}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +18.3% from last period
                </p>
              </div>
              <TrendingUp className="h-8 w-8" style={{ color: '#327F74' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancellations</p>
                <p className="text-2xl font-bold" style={{ color: '#E63946' }}>
                  {totalCancellations}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -5.2% from last period
                </p>
              </div>
              <TrendingDown className="h-8 w-8" style={{ color: '#E63946' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                  {retentionRate}%
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +2.3% from last period
                </p>
              </div>
              <Users className="h-8 w-8" style={{ color: '#327F74' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Growth Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Growth Trend</CardTitle>
          <CardDescription>
            Member activity over {selectedDateRange === 'week' ? 'the last 7 days' : 
            selectedDateRange === 'month' ? 'the last 30 days' : 
            selectedDateRange === 'quarter' ? 'the last 3 months' : 'the last 12 months'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={membershipData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalActive" stroke="#327F74" strokeWidth={2} name="Total Active" />
              <Line type="monotone" dataKey="newMembers" stroke="#82ca9d" strokeWidth={2} name="New Members" />
              <Line type="monotone" dataKey="cancellations" stroke="#E63946" strokeWidth={2} name="Cancellations" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Member Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Member Status Distribution</CardTitle>
            <CardDescription>Current membership status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: totalMembers, color: '#327F74' },
                    { name: 'Freezed', value: membershipData.reduce((s, i) => s + i.freezed, 0), color: '#ffc658' },
                    { name: 'Suspended', value: membershipData.reduce((s, i) => s + i.suspended, 0), color: '#E63946' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Active', value: totalMembers, color: '#327F74' },
                    { name: 'Freezed', value: membershipData.reduce((s, i) => s + i.freezed, 0), color: '#ffc658' },
                    { name: 'Suspended', value: membershipData.reduce((s, i) => s + i.suspended, 0), color: '#E63946' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership Activity Metrics</CardTitle>
            <CardDescription>Detailed breakdown by activity type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { 
                name: 'New Members', 
                value: totalNewMembers, 
                color: '#327F74', 
                percentage: (totalNewMembers / totalMembers * 100).toFixed(1)
              },
              { 
                name: 'Renewals', 
                value: membershipData.reduce((s, i) => s + i.renewals, 0), 
                color: '#82ca9d', 
                percentage: (membershipData.reduce((s, i) => s + i.renewals, 0) / totalMembers * 100).toFixed(1)
              },
              { 
                name: 'Freezed', 
                value: membershipData.reduce((s, i) => s + i.freezed, 0), 
                color: '#ffc658', 
                percentage: (membershipData.reduce((s, i) => s + i.freezed, 0) / totalMembers * 100).toFixed(1)
              },
              { 
                name: 'Suspended', 
                value: membershipData.reduce((s, i) => s + i.suspended, 0), 
                color: '#E63946', 
                percentage: (membershipData.reduce((s, i) => s + i.suspended, 0) / totalMembers * 100).toFixed(1)
              },
              { 
                name: 'Cancellations', 
                value: totalCancellations, 
                color: '#ff7c7c', 
                percentage: (totalCancellations / totalMembers * 100).toFixed(1)
              }
            ].map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">{item.value}</span>
                    <Badge variant="secondary" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Membership Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Membership Breakdown</CardTitle>
          <CardDescription>Period-by-period membership analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">New Members</TableHead>
                <TableHead className="text-right">Renewals</TableHead>
                <TableHead className="text-right">Cancellations</TableHead>
                <TableHead className="text-right">Freezed</TableHead>
                <TableHead className="text-right">Suspended</TableHead>
                <TableHead className="text-right">Total Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.period}</TableCell>
                  <TableCell className="text-right">{item.newMembers}</TableCell>
                  <TableCell className="text-right">{item.renewals}</TableCell>
                  <TableCell className="text-right">{item.cancellations}</TableCell>
                  <TableCell className="text-right">{item.freezed}</TableCell>
                  <TableCell className="text-right">{item.suspended}</TableCell>
                  <TableCell className="text-right font-bold" style={{ color: '#327F74' }}>
                    {item.totalActive}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{totalNewMembers}</TableCell>
                <TableCell className="text-right font-bold">
                  {membershipData.reduce((s, i) => s + i.renewals, 0)}
                </TableCell>
                <TableCell className="text-right font-bold">{totalCancellations}</TableCell>
                <TableCell className="text-right font-bold">
                  {membershipData.reduce((s, i) => s + i.freezed, 0)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {membershipData.reduce((s, i) => s + i.suspended, 0)}
                </TableCell>
                <TableCell className="text-right font-bold text-lg" style={{ color: '#327F74' }}>
                  {totalMembers}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Age Demographics */}
      <Card>
        <CardHeader>
          <CardTitle>Member Demographics</CardTitle>
          <CardDescription>Age distribution and characteristics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberDemographics.map((demo, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-sm font-medium w-20">{demo.ageGroup}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full" 
                      style={{ 
                        width: `${demo.percentage * 4}%`,
                        backgroundColor: '#327F74'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <span className="text-sm font-bold">{demo.count} members</span>
                  <Badge variant="secondary" style={{ backgroundColor: '#327F7420', color: '#327F74' }}>
                    {demo.percentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Download Action */}
      <div className="flex items-center justify-center space-x-4 pt-4">
        <Button onClick={onDownload} size="lg" style={{ backgroundColor: '#327F74' }}>
          <Download className="mr-2 h-5 w-5" />
          Download {selectedFormat.toUpperCase()} Report
        </Button>
        <Button variant="outline" size="lg" onClick={onGenerateNew}>
          <RefreshCw className="mr-2 h-5 w-5" />
          Generate New Report
        </Button>
      </div>
    </div>
  );
}
