export interface GymDataContext {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  monthlyTrend: { month: string; revenue: number; expenses: number; profit: number }[];
  revenueBySource: { source: string; amount: number }[];
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  overdueMembers: number;
  suspendedMembers: number;
  membershipTypes: Record<string, number>;
  recentJoins: number;
  todayCheckIns: number;
  avgSessionMinutes: number;
  peakHours: Record<string, number>;
  expensesByCategory: Record<string, number>;
  currencyCode?: string;
}

export interface AIInsight {
  insight: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  action: string;
  priority: 'High' | 'Medium' | 'Low';
}

class ClaudeAIService {
  private apiKey = import.meta.env.VITE_CLAUDE_API_KEY || '';
  private model = 'claude-opus-4-5';
  private base = 'https://api.anthropic.com/v1/messages';

  isConfigured() {
    const key = this.apiKey.trim();
    return key.length > 0 && !key.includes('your-key-here');
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  private buildSystemPrompt(ctx: GymDataContext): string {
    const currency = ctx.currencyCode || 'AED';
    const monthlyTrend = ctx.monthlyTrend.length
      ? ctx.monthlyTrend
          .map(
            (point) =>
              `- ${point.month}: Revenue ${point.revenue.toLocaleString()} ${currency} | Expenses ${point.expenses.toLocaleString()} ${currency} | Profit ${point.profit.toLocaleString()} ${currency}`
          )
          .join('\n')
      : '- No monthly trend data available';

    const revenueSources = ctx.revenueBySource.length
      ? ctx.revenueBySource
          .map((entry) => `- ${entry.source}: ${entry.amount.toLocaleString()} ${currency}`)
          .join('\n')
      : '- No revenue source data available';

    const membershipTypes = Object.keys(ctx.membershipTypes).length
      ? Object.entries(ctx.membershipTypes)
          .map(([type, count]) => `- ${type}: ${count}`)
          .join('\n')
      : '- No membership type breakdown available';

    const peakHours = Object.keys(ctx.peakHours).length
      ? Object.entries(ctx.peakHours)
          .sort((first, second) => second[1] - first[1])
          .slice(0, 3)
          .map(([hour, checkIns]) => `- ${hour}: ${checkIns} check-ins`)
          .join('\n')
      : '- No attendance peak-hour data available';

    const expenseCategories = Object.keys(ctx.expensesByCategory).length
      ? Object.entries(ctx.expensesByCategory)
          .sort((first, second) => second[1] - first[1])
          .map(([category, amount]) => `- ${category}: ${amount.toLocaleString()} ${currency}`)
          .join('\n')
      : '- No expense category data available';

    return [
      'You are a Gym Business Intelligence Analyst.',
      'Use only the aggregated operational totals below.',
      'Do not mention or infer member names, emails, phone numbers, payment identifiers, or any other PII.',
      'Ground every prediction in the data provided and keep recommendations specific and operational.',
      '=== FINANCIAL ===',
      `Revenue: ${ctx.totalRevenue.toLocaleString()} ${currency} | Expenses: ${ctx.totalExpenses.toLocaleString()} ${currency} | Net: ${ctx.netIncome.toLocaleString()} ${currency} | Margin: ${ctx.profitMargin.toFixed(1)}%`,
      `Monthly Trend (last 6 months):\n${monthlyTrend}`,
      `Revenue by Source:\n${revenueSources}`,
      '=== MEMBERS ===',
      `Total: ${ctx.totalMembers} | Active: ${ctx.activeMembers} | Expired: ${ctx.expiredMembers} | Overdue: ${ctx.overdueMembers} | Suspended: ${ctx.suspendedMembers} | New this month: ${ctx.recentJoins}`,
      `Types:\n${membershipTypes}`,
      '=== ATTENDANCE ===',
      `Today: ${ctx.todayCheckIns} check-ins | Avg session: ${ctx.avgSessionMinutes} min`,
      `Peak Hours:\n${peakHours}`,
      '=== EXPENSES ===',
      `By Category:\n${expenseCategories}`,
      `Today: ${new Date().toISOString().split('T')[0]}`,
    ].join('\n');
  }

  private extractJson(text: string) {
    return text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  private normalizeInsight(value: any): AIInsight | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const priority =
      value.priority === 'High' || value.priority === 'Medium' || value.priority === 'Low'
        ? value.priority
        : 'Medium';

    const confidenceValue = Number(value.confidence);
    const confidence = Number.isFinite(confidenceValue)
      ? Math.min(98, Math.max(70, Math.round(confidenceValue)))
      : 80;

    if (!value.insight || !value.prediction || !value.timeframe || !value.action) {
      return null;
    }

    return {
      insight: String(value.insight),
      prediction: String(value.prediction),
      confidence,
      timeframe: String(value.timeframe),
      action: String(value.action),
      priority,
    };
  }

  private calculatePercentChange(current: number, previous: number) {
    if (previous <= 0) {
      return 0;
    }

    return ((current - previous) / previous) * 100;
  }

  private getTopRevenueSource(ctx: GymDataContext) {
    return [...ctx.revenueBySource].sort((first, second) => second.amount - first.amount)[0];
  }

  private getTopExpenseCategory(ctx: GymDataContext) {
    return Object.entries(ctx.expensesByCategory).sort((first, second) => second[1] - first[1])[0];
  }

  private getTopPeakHour(ctx: GymDataContext) {
    return Object.entries(ctx.peakHours).sort((first, second) => second[1] - first[1])[0];
  }

  private buildLocalInsights(ctx: GymDataContext): AIInsight[] {
    const currency = ctx.currencyCode || 'AED';
    const latestMonth = ctx.monthlyTrend[ctx.monthlyTrend.length - 1];
    const previousMonth = ctx.monthlyTrend[ctx.monthlyTrend.length - 2];
    const revenueChange = latestMonth && previousMonth
      ? this.calculatePercentChange(latestMonth.revenue, previousMonth.revenue)
      : 0;
    const projectedRevenue = latestMonth
      ? Math.max(0, Math.round(latestMonth.revenue * (1 + revenueChange / 100)))
      : Math.round(ctx.totalRevenue);

    const activeRatio = ctx.totalMembers > 0 ? (ctx.activeMembers / ctx.totalMembers) * 100 : 0;
    const atRiskMembers = Math.max(
      ctx.expiredMembers + ctx.overdueMembers,
      Math.round((ctx.totalMembers - ctx.activeMembers) * 0.6)
    );

    const peakHour = this.getTopPeakHour(ctx);
    const peakHourLabel = peakHour?.[0] ?? '18:00';
    const peakHourCheckIns = peakHour?.[1] ?? 0;
    const attendancePressure = ctx.todayCheckIns > 0
      ? Math.round((peakHourCheckIns / ctx.todayCheckIns) * 100)
      : 0;

    const topRevenueSource = this.getTopRevenueSource(ctx);
    const topRevenueShare = ctx.totalRevenue > 0 && topRevenueSource
      ? Math.round((topRevenueSource.amount / ctx.totalRevenue) * 100)
      : 0;

    const topExpenseCategory = this.getTopExpenseCategory(ctx);
    const topExpenseShare = ctx.totalExpenses > 0 && topExpenseCategory
      ? Math.round((topExpenseCategory[1] / ctx.totalExpenses) * 100)
      : 0;

    return [
      {
        insight: 'Member Churn Risk',
        prediction: `${atRiskMembers} members need retention follow-up based on expired and overdue status`,
        confidence: ctx.totalMembers > 0 ? 88 : 74,
        timeframe: 'Next 30 days',
        action: `Prioritize renewal outreach for overdue members and protect the ${activeRatio.toFixed(1)}% active base`,
        priority: atRiskMembers > 10 ? 'High' : 'Medium',
      },
      {
        insight: 'Revenue Forecast',
        prediction: `${projectedRevenue.toLocaleString()} ${currency} projected for the next month from current trend`,
        confidence: latestMonth && previousMonth ? 86 : 76,
        timeframe: 'Next 30 days',
        action: revenueChange >= 0
          ? `Keep focus on ${topRevenueSource?.source ?? 'core services'}, currently contributing about ${topRevenueShare}% of revenue`
          : 'Review pricing, renewals, and upsell campaigns to recover recent revenue softness',
        priority: revenueChange >= 0 ? 'Medium' : 'High',
      },
      {
        insight: 'Attendance Load',
        prediction: `${peakHourLabel} is the busiest slot with ${peakHourCheckIns} check-ins, about ${attendancePressure}% of today's traffic`,
        confidence: peakHour ? 84 : 72,
        timeframe: 'Next 7 days',
        action: peakHour
          ? `Align staffing and class capacity around ${peakHourLabel} to reduce congestion`
          : 'Collect more check-in data to improve schedule planning',
        priority: attendancePressure >= 35 ? 'High' : 'Medium',
      },
      {
        insight: 'Margin Opportunity',
        prediction: `${topExpenseCategory?.[0] ?? 'Operations'} is the largest cost driver at roughly ${topExpenseShare}% of expenses`,
        confidence: topExpenseCategory ? 82 : 73,
        timeframe: 'This month',
        action: topExpenseCategory
          ? `Audit ${topExpenseCategory[0]} spend while protecting a ${ctx.profitMargin.toFixed(1)}% profit margin`
          : 'Categorize expense data more deeply to identify savings opportunities',
        priority: ctx.profitMargin < 20 ? 'High' : 'Medium',
      },
    ];
  }

  /**
   * A short written narrative summarizing the gym's current state — entirely
   * rule-based from real numbers, no LLM call involved (works identically with
   * or without VITE_CLAUDE_API_KEY configured), so BiOS always has something
   * real to show instead of raw KPI tiles alone.
   */
  generateExecutiveSummary(ctx: GymDataContext): string {
    const currency = ctx.currencyCode || 'AED';
    const latestMonth = ctx.monthlyTrend[ctx.monthlyTrend.length - 1];
    const previousMonth = ctx.monthlyTrend[ctx.monthlyTrend.length - 2];
    const revenueChange = latestMonth && previousMonth
      ? this.calculatePercentChange(latestMonth.revenue, previousMonth.revenue)
      : 0;
    const activeRatio = ctx.totalMembers > 0 ? (ctx.activeMembers / ctx.totalMembers) * 100 : 0;
    const topRevenueSource = this.getTopRevenueSource(ctx);
    const topExpenseCategory = this.getTopExpenseCategory(ctx);
    const peakHour = this.getTopPeakHour(ctx);

    const sentences: string[] = [];

    if (ctx.totalRevenue > 0) {
      const trendPhrase = latestMonth && previousMonth
        ? (revenueChange >= 0
            ? `up ${revenueChange.toFixed(1)}% from the prior month`
            : `down ${Math.abs(revenueChange).toFixed(1)}% from the prior month`)
        : 'holding steady';
      sentences.push(
        `Revenue stands at ${ctx.totalRevenue.toLocaleString()} ${currency} with a ${ctx.profitMargin.toFixed(1)}% profit margin, ${trendPhrase}.`
      );
    } else {
      sentences.push('No revenue has been recorded yet for the current period.');
    }

    if (topRevenueSource) {
      sentences.push(`${topRevenueSource.source} is the leading revenue driver.`);
    }

    if (ctx.totalMembers > 0) {
      sentences.push(
        `${ctx.activeMembers.toLocaleString()} of ${ctx.totalMembers.toLocaleString()} members are active (${activeRatio.toFixed(1)}%), with ${ctx.recentJoins} new join${ctx.recentJoins === 1 ? '' : 's'} this month.`
      );
      const atRisk = ctx.expiredMembers + ctx.overdueMembers;
      if (atRisk > 0) {
        sentences.push(`${atRisk} member${atRisk === 1 ? '' : 's'} are expired or overdue and worth a retention follow-up.`);
      }
    }

    if (ctx.todayCheckIns > 0 && peakHour) {
      sentences.push(`Today's traffic peaked around ${peakHour[0]} with ${peakHour[1]} check-ins.`);
    }

    if (topExpenseCategory) {
      sentences.push(`${topExpenseCategory[0]} remains the largest expense category.`);
    }

    return sentences.join(' ');
  }

  async generatePredictiveInsights(ctx: GymDataContext): Promise<AIInsight[]> {
    if (!this.isConfigured()) {
      return this.buildLocalInsights(ctx);
    }

    let response: Response;

    try {
      response = await fetch(this.base, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1200,
        system: this.buildSystemPrompt(ctx),
        messages: [
          {
            role: 'user',
            content: `Analyze this gym's real data and return exactly 4 predictions as a JSON array.
Each object must have EXACTLY these keys:
  insight (string — category name e.g. "Member Churn Risk"),
  prediction (string — specific prediction with numbers),
  confidence (integer 70-98),
  timeframe (string),
  action (string — specific next step),
  priority ("High" | "Medium" | "Low")
Return ONLY the JSON array, no other text.`,
          },
        ],
      }),
      });
    } catch {
      return this.buildLocalInsights(ctx);
    }

    if (!response.ok) {
      return this.buildLocalInsights(ctx);
    }

    const payload = await response.json();
    const rawText = Array.isArray(payload?.content)
      ? payload.content
          .filter((item: any) => item?.type === 'text')
          .map((item: any) => item.text)
          .join('\n')
      : '';

    if (!rawText.trim()) {
      return this.buildLocalInsights(ctx);
    }

    try {
      const parsed = JSON.parse(this.extractJson(rawText));
      if (!Array.isArray(parsed)) {
        return this.buildLocalInsights(ctx);
      }

      const normalized = parsed
        .map((item) => this.normalizeInsight(item))
        .filter((item): item is AIInsight => item !== null)
        .slice(0, 4);

      return normalized.length > 0 ? normalized : this.buildLocalInsights(ctx);
    } catch {
      return this.buildLocalInsights(ctx);
    }
  }
}

export const aiService = new ClaudeAIService();

