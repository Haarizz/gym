// policyRuleEngine.ts
export type ConditionType =
  | "membership_type"
  | "package_duration"
  | "renewal_count"
  | "first_x_members"
  | "tenure_days";

export type Rule = {
  id: string;
  conditionType: ConditionType;
  conditionValue: any; // e.g. "individual" or 3 or 200
  rewardDays: number;
};

export type Member = {
  id: string;
  name: string;
  email?: string;
  membershipType?: "individual" | "family" | "corporate";
  joinedAt?: string; // ISO date
  currentPlan?: {
    name: string;
    durationMonths: number; // e.g. 3
    startDate?: string;
    endDate?: string;
  } | null;
  renewalCount?: number; // number of times renewed
  purchaseDate?: string; // used for ordering in first_x_members (ISO)
};

export type RuleMatch = {
  ruleId: string;
  memberId: string;
  rewardDays: number;
};

export type EngineResult = {
  eligibleMemberIds: string[];
  matches: RuleMatch[];
  perRuleCount: Record<string, number>;
  sampleMembers: Member[];
};

/**
 * Evaluate rules against members.
 *
 * @param members - array of Member
 * @param rules - array of Rule (order matters only for first_x_members)
 * @param options - { conflictResolution: 'max'|'sum' } default 'max'
 *
 * Returns: EngineResult
 */
export function evaluateRules(
  members: Member[],
  rules: Rule[],
  options?: { conflictResolution?: "max" | "sum"; sampleSize?: number }
): EngineResult {
  const conflictResolution = options?.conflictResolution ?? "max";
  const sampleSize = options?.sampleSize ?? 8;

  // helper: days since join
  const daysSince = (iso?: string) => {
    if (!iso) return Infinity;
    const diff = Date.now() - new Date(iso).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // We'll produce candidate matches per member per rule, then resolve conflicts
  const candidateMap: Record<string, RuleMatch[]> = {}; // memberId -> matches
  const perRuleCount: Record<string, number> = {};
  rules.forEach((r) => (perRuleCount[r.id] = 0));

  // For first_x_members rules we need to compute eligibility order per rule:
  const firstXLists: Record<string, string[]> = {}; // ruleId -> ordered memberIds
  rules
    .filter((r) => r.conditionType === "first_x_members")
    .forEach((r) => {
      // filter members who would pass additional checks? Usually first_x is combined with package_duration etc.
      // Implementation: base ordering by purchaseDate or joinedAt (fallback)
      const sorted = members
        .slice()
        .sort((a, b) => {
          const aDate = a.purchaseDate ?? a.joinedAt ?? "";
          const bDate = b.purchaseDate ?? b.joinedAt ?? "";
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        })
        .map((m) => m.id);
      firstXLists[r.id] = sorted;
    });

  // Evaluate each member & rule
  for (const m of members) {
    candidateMap[m.id] = [];
    for (const r of rules) {
      let matched = false;

      switch (r.conditionType) {
        case "membership_type": {
          if (!m.membershipType) break;
          matched = m.membershipType === r.conditionValue;
          break;
        }
        case "package_duration": {
          const requiredMonths = Number(r.conditionValue);
          const hasMonths = m.currentPlan?.durationMonths ?? 0;
          matched = hasMonths >= requiredMonths;
          break;
        }
        case "renewal_count": {
          const requiredRenewals = Number(r.conditionValue);
          matched = (m.renewalCount ?? 0) >= requiredRenewals;
          break;
        }
        case "tenure_days": {
          const reqDays = Number(r.conditionValue);
          matched = daysSince(m.joinedAt) >= reqDays;
          break;
        }
        case "first_x_members": {
          // matched if member is within first X of the qualified list
          const limit = Number(r.conditionValue);
          const ordered = firstXLists[r.id] ?? [];
          const index = ordered.indexOf(m.id);
          matched = index !== -1 && index < limit;
          break;
        }
        default:
          matched = false;
      }

      if (matched) {
        candidateMap[m.id].push({
          ruleId: r.id,
          memberId: m.id,
          rewardDays: r.rewardDays,
        });
      }
    }
  }

  // Resolve conflicts per member
  const finalMatches: RuleMatch[] = [];
  const eligibleMemberSet = new Set<string>();
  const appliedPerRule: Record<string, number> = {};
  rules.forEach((r) => (appliedPerRule[r.id] = 0));

  for (const m of members) {
    const matches = candidateMap[m.id];
    if (!matches || matches.length === 0) continue;

    let chosenMatches: RuleMatch[] = [];

    if (conflictResolution === "sum") {
      chosenMatches = matches;
    } else {
      // 'max' → pick the one with maximum rewardDays
      const best = matches.reduce((acc, cur) =>
        cur.rewardDays > acc.rewardDays ? cur : acc
      );
      chosenMatches = [best];
    }

    // Append chosen
    for (const ch of chosenMatches) {
      finalMatches.push({ ...ch });
      appliedPerRule[ch.ruleId] = (appliedPerRule[ch.ruleId] ?? 0) + 1;
      eligibleMemberSet.add(m.id);
    }
  }

  // perRuleCount summary
  const perRuleCountFinal: Record<string, number> = {};
  for (const r of rules) {
    perRuleCountFinal[r.id] = appliedPerRule[r.id] ?? 0;
  }

  // sample members
  const eligibleMemberIds = Array.from(eligibleMemberSet);
  const sampleMembers = members
    .filter((m) => eligibleMemberSet.has(m.id))
    .slice(0, sampleSize);

  return {
    eligibleMemberIds,
    matches: finalMatches,
    perRuleCount: perRuleCountFinal,
    sampleMembers,
  };
}
