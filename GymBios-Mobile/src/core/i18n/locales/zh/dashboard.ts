const dashboard = {
  dashboard: {
    quickActionsTitle: '快捷操作',
    trainer: {
      loading: '正在加载仪表板...',
      welcomeGreeting: '{{greeting}}，{{name}}！👋',
      ratingLabel: '评分',
      review_one: '{{count}} 条评价',
      review_other: '{{count}} 条评价',
      noRatings: '暂无评分',
      stats: {
        sessionsToday: '今日课程',
        todayEarnings: '今日收入',
        activeMembers: '活跃会员',
        monthlyTarget: '月度目标',
      },
      pendingTasks: {
        title: '待办事项',
        urgent: '紧急',
      },
      schedule: {
        title: '今日日程',
        viewAll: '查看全部',
        noMember: '无会员',
        completed: '已完成',
        startSession: '开始课程',
        finishSession: '结束课程',
        finishSessionA11y: '结束与 {{name}} 的课程',
        startSessionA11y: '开始与 {{name}} 的课程',
        messageMemberA11y: '发消息给 {{name}}',
      },
      quickActions: {
        messageMember: '联系会员',
        createWorkout: '创建训练计划',
        trackProgress: '追踪进度',
        viewLedger: '查看账本',
      },
    },
    staff: {
      loading: '正在加载仪表板...',
      welcomeGreeting: '你好，{{name}}！👋',
      branchLabel: '分店：',
      stats: {
        leadsAdded: '新增潜客',
        followUps: '跟进任务',
        conversions: '成单数',
        checkIns: '签到数',
      },
      quickActions: {
        addNewLead: '添加新潜客',
        memberCheckIn: '会员签到',
      },
      urgentFollowUps: {
        title: '紧急跟进',
        viewAll: '查看全部',
        priorityHigh: '高',
        priorityMed: '中',
        lastContact: '上次联系：{{contact}}',
        callNow: '立即拨打',
        callA11y: '拨打电话给 {{name}}',
      },
      recentConversions: {
        title: '今日成单！🎉',
      },
      monthlySummary: {
        title: '本月汇总',
        targetAchievement: '目标达成率',
        totalConversions: '总成单数',
        revenueGenerated: '创收金额',
        conversionRate: '转化率',
      },
    },
  },
};

export default dashboard;
