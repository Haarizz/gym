import type { LocaleResource } from '../en';

const settings = {
  settings: {
    title: '设置',
    subtitle: '语言、通知、关联账号和隐私',
    languageCard: '语言',
    appLanguage: '应用语言',
    appLanguageDescription: '用于菜单、按钮和提示信息',
    notificationsCard: '通知偏好',
    emailNotifications: '邮件通知',
    emailNotificationsDescription: '通过邮件接收摘要和账号更新',
    pushNotifications: '推送通知',
    pushNotificationsDescription: '在此设备上接收实时提醒',
    smsNotifications: '短信通知',
    smsNotificationsDescription: '通过短信接收紧急安全和薪资通知',
    performanceUpdates: '业绩更新',
    performanceUpdatesDescription: '季度和月度 KPI 分数通知',
    targetReminders: '目标提醒',
    targetRemindersDescription: '目标截止日期临近时提醒',
    payrollEarnings: '薪资与收入',
    payrollEarningsDescription: '工资和奖金处理完成时通知',
    linkedAccountsCard: '关联账号',
    connected: '已连接',
    privacyCard: '隐私设置',
    profileVisibility: '资料可见性',
    profileVisibilityDescription: '允许团队成员和员工查看你的资料',
    performanceVisibility: '业绩可见性',
    performanceVisibilityDescription: '在排行榜上分享你的成就和分数',
    activityStatus: '活动状态',
    activityStatusDescription: '登录时显示在线状态',
  },
} satisfies LocaleResource;

export default settings;
