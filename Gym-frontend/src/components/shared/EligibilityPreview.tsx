import React, { useMemo, useState } from "react";
import { evaluateRules, Member, Rule, RuleMatch } from "../../utils/policyRuleEngine";
import { Button } from "../ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "../ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Sparkles,
  Eye,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EligibilityPreviewProps {
  members: Member[];
  rules: Rule[];
  onApply?: (matches: RuleMatch[]) => Promise<void> | void;
}

export default function EligibilityPreview({
  members,
  rules,
  onApply,
}: EligibilityPreviewProps) {
  const [simApplying, setSimApplying] = useState(false);
  const [appliedResult, setAppliedResult] = useState<any | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);

  const engineResult = useMemo(() => {
    if (rules.length === 0 || members.length === 0) {
      return {
        eligibleMemberIds: [],
        matches: [],
        perRuleCount: {},
        sampleMembers: [],
      };
    }
    return evaluateRules(members, rules, { conflictResolution: "max", sampleSize: 6 });
  }, [members, rules]);

  const handleApply = async () => {
    if (engineResult.eligibleMemberIds.length === 0) {
      toast.error("No eligible members to apply promotion to");
      return;
    }

    setSimApplying(true);
    try {
      const matches = engineResult.matches;
      
      if (onApply) {
        await onApply(matches);
      }
      
      setAppliedResult({
        appliedAt: new Date().toISOString(),
        count: engineResult.eligibleMemberIds.length,
        matches,
      });
      
      toast.success(`Successfully applied promotion to ${engineResult.eligibleMemberIds.length} members`, {
        description: `${engineResult.matches.reduce((sum, m) => sum + m.rewardDays, 0)} total days added`,
      });
    } catch (error) {
      toast.error("Failed to apply promotion", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSimApplying(false);
    }
  };

  const getTotalDaysToBeApplied = () => {
    return engineResult.matches.reduce((sum, match) => sum + match.rewardDays, 0);
  };

  const getConditionTypeLabel = (conditionType: string) => {
    const labels: Record<string, string> = {
      membership_type: "Membership Type",
      package_duration: "Package Duration",
      renewal_count: "Renewal Count",
      first_x_members: "First X Members",
      tenure_days: "Member Tenure",
    };
    return labels[conditionType] || conditionType;
  };

  const displayMembers = showAllMembers 
    ? members.filter((m) => engineResult.eligibleMemberIds.includes(m.id))
    : engineResult.sampleMembers;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#2B7A78]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eligible Members</p>
                <p className="text-3xl font-bold text-[#2B7A78]">
                  {engineResult.eligibleMemberIds.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  out of {members.length} total
                </p>
              </div>
              <Users className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2B7A78]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Days</p>
                <p className="text-3xl font-bold text-[#2B7A78]">
                  {getTotalDaysToBeApplied()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  to be added
                </p>
              </div>
              <Calendar className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2B7A78]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eligibility Rate</p>
                <p className="text-3xl font-bold text-[#2B7A78]">
                  {members.length > 0 
                    ? Math.round((engineResult.eligibleMemberIds.length / members.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  conversion rate
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2B7A78]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-3xl font-bold text-[#2B7A78]">
                  {rules.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  configured
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-[#2B7A78]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Preview Card */}
      <Card className="border-2 border-[#2B7A78]/20">
        <CardHeader className="bg-gradient-to-r from-[#2B7A78]/5 to-transparent">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#1E293B]">
                <Eye className="h-5 w-5 text-[#2B7A78]" />
                Eligibility Preview
              </CardTitle>
              <CardDescription className="mt-2">
                Preview how many members will be eligible based on current rule configuration
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Simulate refresh
                  toast.info("Preview refreshed");
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={simApplying || engineResult.eligibleMemberIds.length === 0}
                className="bg-[#2B7A78] hover:bg-[#2B7A78]/90"
                size="sm"
              >
                {simApplying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Promotion
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Rules Breakdown */}
          {rules.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#1E293B] mb-3">Rule Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rules.map((r, index) => (
                  <div 
                    key={r.id} 
                    className="p-4 bg-gradient-to-br from-[#2B7A78]/5 to-transparent rounded-lg border border-[#2B7A78]/20 hover:border-[#2B7A78]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#2B7A78] text-white flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-semibold text-[#1E293B]">
                          {getConditionTypeLabel(r.conditionType)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="bg-[#2B7A78]/10 text-[#2B7A78]">
                        {engineResult.perRuleCount[r.id] ?? 0}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground">
                        Value: <span className="font-medium text-[#1E293B]">{String(r.conditionValue)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Reward: <span className="font-medium text-[#2B7A78]">{r.rewardDays} days</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Rules Warning */}
          {rules.length === 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                No rules configured yet. Add rules above to see eligibility preview.
              </AlertDescription>
            </Alert>
          )}

          {/* Eligible Members Table */}
          {rules.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-[#1E293B]">
                  {showAllMembers ? "All Eligible Members" : "Sample Eligible Members"}
                </h4>
                {engineResult.eligibleMemberIds.length > engineResult.sampleMembers.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllMembers(!showAllMembers)}
                    className="text-[#2B7A78]"
                  >
                    {showAllMembers ? "Show Sample" : `View All (${engineResult.eligibleMemberIds.length})`}
                  </Button>
                )}
              </div>

              {displayMembers.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No members match the current rule configuration. Consider adjusting the rules to increase eligibility.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F9FAFB]">
                        <TableHead className="font-semibold">Member Name</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Joined</TableHead>
                        <TableHead className="font-semibold">Plan Duration</TableHead>
                        <TableHead className="font-semibold text-right">Days to Add</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayMembers.map((m) => {
                        const memberMatches = engineResult.matches.filter(match => match.memberId === m.id);
                        const totalDays = memberMatches.reduce((sum, match) => sum + match.rewardDays, 0);
                        
                        return (
                          <TableRow key={m.id} className="hover:bg-[#2B7A78]/5">
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell className="text-muted-foreground">{m.email || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {m.membershipType || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {m.joinedAt ? format(new Date(m.joinedAt), 'MMM dd, yyyy') : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {m.currentPlan ? `${m.currentPlan.durationMonths} months` : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-[#2B7A78] hover:bg-[#2B7A78]/90">
                                +{totalDays} days
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Applied Result Summary */}
          {appliedResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold mb-1">✓ Promotion Successfully Applied</div>
                <div className="text-sm space-y-1">
                  <p>Applied at: {format(new Date(appliedResult.appliedAt), 'PPpp')}</p>
                  <p>Members affected: <strong>{appliedResult.count}</strong></p>
                  <p>Total days added: <strong>{getTotalDaysToBeApplied()}</strong></p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          {rules.length > 0 && engineResult.eligibleMemberIds.length > 0 && (
            <Alert className="border-[#2B7A78]/20 bg-[#2B7A78]/5">
              <AlertCircle className="h-4 w-4 text-[#2B7A78]" />
              <AlertDescription className="text-[#1E293B]">
                <strong>How it works:</strong> When you click "Apply Promotion", {engineResult.eligibleMemberIds.length} eligible 
                {engineResult.eligibleMemberIds.length === 1 ? ' member' : ' members'} will automatically receive their extra 
                complimentary days added to their membership expiration date based on the configured rules.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

