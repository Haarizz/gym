import type { LocaleResource } from '../en';

const common = {
  common: {
    continue: '继续',
    save: '保存',
    optional: '（选填）',
    error: '错误',
    pleaseWait: '请稍候',
  },

  language: {
    title: '选择你的语言',
    subtitle: '选择你最习惯使用的语言',
    note: '你可以随时在设置中更改',
    save: '保存',
    settingsTitle: '语言',
    settingsSubtitle: '选择应用语言',
    restartTitle: '需要重启',
    restartBody: '请关闭并重新打开应用，以完成布局方向的切换。',
  },

  greeting: {
    welcomeBack: '欢迎回来',
    goodMorning: '早上好',
    goodAfternoon: '下午好',
    goodEvening: '晚上好',
  },

  tabs: {
    home: '首页',
    dashboard: '仪表盘',
    bookings: '预约',
    community: '社区',
    centers: '场馆',
    subscription: '订阅',
    staff: '员工',
    deals: '优惠',
    analytics: '分析',
    schedule: '日程',
    performance: '业绩',
    ledger: '账本',
    messages: '消息',
  },

  portalHeader: {
    allBranches: '所有分店',
    openProfileHub: '打开个人中心',
    notificationsUnread: '通知，{{count}} 条未读',
    adminTitle: '管理员',
    adminSubtitle: '指挥中心',
    memberTitle: '会员中心',
    memberSubtitle: '你的健身之旅',
    trainerTitle: '教练中心',
    trainerSubtitle: '教练门户',
    staffTitle: '员工中心',
    staffSubtitle: '前台',
  },

  validation: {
    fullNameRequired: '请输入姓名',
    phoneRequired: '请输入手机号码',
    emergencyContactRequired: '请输入紧急联系人姓名',
    emergencyPhoneRequired: '请输入紧急联系电话',
    emergencyPhoneSameAsOwn: '紧急联系电话不能与你本人的号码相同',
    invalidHeight: '请输入有效的身高',
    invalidWeight: '请输入有效的体重',
    heightRange: '身高必须在 {{min}} 到 {{max}} 厘米之间',
    weightRange: '体重必须在 {{min}} 到 {{max}} 公斤之间',
    invalidDateOfBirth: '请输入有效的出生日期',
    minAge: '你必须年满 {{min}} 岁',
    maxAge: '年龄不能超过 {{max}} 岁',
  },
} satisfies LocaleResource;

export default common;
