import type { LocaleResource } from '../en';

const paymentSheet = {
  paymentSheet: {
    title: "结账",
    processingFor: "支付 {{title}}",
    amountDue: "应付金额",
    howToPay: "您想如何付款？",
    howToPayStaff: "会员如何付款？",
    allMethods: "所有付款方式",

    methods: {
      card: { title: "银行卡", subtitle: "银行卡、Apple Pay、Google Pay" },
      upi: { title: "UPI", subtitle: "任意 UPI 应用" },
      netbanking: { title: "网上银行", subtitle: "通过您的银行付款" },
      cash: { title: "现金", subtitleMember: "在前台付款", subtitleStaff: "当面收款" },
      credit: { title: "稍后付款", subtitle: "先付一部分，其余记账" },
      mixed: { title: "现金 + 在线", subtitle: "分开付款" },
    },

    unavailable: {
      online: "暂不可用",
      inrOnly: "仅限 INR 付款",
      nothingToPay: "无需在线付款",
    },

    online: {
      title: {
        card: "银行卡付款",
        upi: "UPI 付款",
        netbanking: "网上银行付款",
      },
      note: {
        card: "在安全结账页面使用银行卡、Apple Pay 或 Google Pay 支付 <amount/>。",
        upi: "在您的 UPI 应用中确认 <amount/>，然后返回此处。",
        netbanking: "选择您的银行并确认 <amount/>，然后返回此处。",
      },
      secure: "付款由 Stripe 安全处理，银行卡信息不会传给健身房。",
    },

    cash: {
      memberTitle: "在前台付款",
      memberNote: "我们会向前台发送付款请求。请在前台以现金支付 <amount/>，工作人员收款后即确认。",
      sendRequest: "发送请求",
      staffTitle: "收取现金",
      staffNote: "向会员收取 <amount/> 现金后确认。",
      received: "已收到现金",
    },

    credit: {
      memberNote: "如愿意可先付一部分，其余在前台批准后记入您的账户。",
      staffNote: "如会员愿意可先收一部分，其余计入其未结余额。",
      payNow: "现在支付",
      nothingNow: "不支付",
      onAccount: "记账",
      payNowWith: "现在支付方式",
      dueDate: "到期日（选填）",
      selectDueDate: "选择到期日",
      request: "申请赊账",
      addToAccount: "记入账户",
    },

    mixed: {
      memberNote: "现金部分在前台支付；其余部分现在在线扣款。",
      staffNote: "先收取现金部分；其余部分在线扣款。",
      cashPart: "现金部分",
      cash: "现金",
      payOnlineWith: "其余部分支付方式",
    },

    split: {
      exactAmount: "精确金额 (<currency/>)",
      ofTotal: "共 <amount/>",
    },

    cta: {
      pay: "支付 <amount/>",
      payNow: "现在支付 <amount/>",
      payOnline: "在线支付 <amount/>",
    },

    simulated: {
      badge: "测试模式",
      title: "测试付款",
      note: "模拟付款，不会产生实际扣款。确认后将视为已通过{{method}}支付 <amount/>。",
      approve: "确认测试付款",
      decline: "拒绝",
    },

    processing: {
      opening: "正在打开安全结账…",
      finishing: "正在完成…",
      keepOpen: "请保持此页面打开",
    },

    discount: {
      title: '选择折扣（选填）',
      type: '折扣类型',
      none: '无折扣',
      fixed: '固定金额',
      percentage: '百分比 (%)',
      percentLabel: '折扣 (%)',
      amountLabel: '金额 (<currency/>)',
    },

    form: {
      example: '例如 {{value}}',
    },

    errors: {
      failed: "付款未成功",
      refunded: "付款未成功。如已扣款，款项将自动退回。",
      noGym: "此付款未选择健身房",
      needBoth: "请为现金和在线部分分别选择金额",
      amountTooHigh: "不能超过应付金额",
    },
  },
} satisfies LocaleResource;

export default paymentSheet;
