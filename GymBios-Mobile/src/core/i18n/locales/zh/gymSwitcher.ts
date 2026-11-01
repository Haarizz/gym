import type { LocaleResource } from '../en';

const gymSwitcher = {
  gymSwitcher: {
    switchGym: "切换健身房",
    switchGymSubtitle: "当前使用：{{gym}}",
    sheetTitle: "你的健身房",
    sheetSubtitle: "选择在应用中使用的健身房",
    pickerTitle: "选择健身房",
    pickerSubtitle: "你是多家健身房的会员。请选择要打开的一家——之后可随时在个人资料中切换。",
    current: "当前",
    joinAnother: "加入其他健身房",
    switched: "已切换到 {{gym}}",
    ends: "{{date}} 到期",
    loadFailed: "无法加载你的健身房。",
    retry: "重试",
    signOut: "退出登录",
    headerSwitchA11y: "切换健身房。当前健身房：{{gym}}",
    status: {
      ACTIVE: "有效",
      EXPIRED: "已过期",
      INACTIVE: "未生效",
      SUSPENDED: "已暂停",
      PENDING_APPROVAL: "等待审批",
      PAYMENT_REJECTED: "付款被拒",
      UNAVAILABLE: "不可用",
    },
  },
} satisfies LocaleResource;

export default gymSwitcher;
