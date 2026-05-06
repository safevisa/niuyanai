const messages = {
  'zh-CN': {
    stock: {
      searchPlaceholder: '搜索股票分析...',
      emptyTitle: '搜索一支股票开始分析',
      emptyDescription: 'AI将从五个维度为您深度解读',
      recentAnalyses: '最近分析',
      scoreSuffix: '分',
      fallbackNotice: '后端暂不可用，当前显示模拟分析结果',
      historyLoadFailed: '历史记录加载失败',
      dataAsOfPrefix: '数据时间',
      historyTitle: '分析历史',
      loadMore: '加载更多',
      quotaExceeded: '今日分析次数已达上限（3次），请明日再试或升级会员',
      quotaRemaining: '今日剩余分析次数',
      shareCard: '分享卡片',
      exportShareCard: '导出分享图',
      shareCardGenerating: '生成中...',
      shareCardFailed: '分享图生成失败，请稍后重试',
      shareCardDisclaimer: '仅供学习参考，不构成投资建议。',
      dailyReport: '每日AI报告',
      generateDailyReport: '生成今日报告',
      reportGenerating: '生成中...',
      reportFailed: '日报生成失败，请稍后重试',
      reportLoginRequired: '请先登录后生成日报',
      reportFocusStocksPrefix: '关注标的：',
      reportFocusStocksEmpty: '暂无',
      reportHint: '点击生成后可查看今日市场摘要与关注标的。',
      historyEmpty: '暂无历史记录',
      loading: '加载中...',
      aiReport: 'AI分析报告',
      shareScorePrefix: '牛眼评分',
      priceLabel: '价格',
      supportLabel: '支撑',
      resistanceLabel: '阻力',
      kline90d: 'K线图 (90日)',
      stopTakeTitle: '止损 / 止盈建议',
      stopLossLabel: '建议止损价',
      takeProfitLabel: '建议止盈价',
      stopLossHint: '跌破后优先控制风险',
      takeProfitHint: '临近阻力位可分批止盈',
      stopTakeNote: '参考当前价格 ¥{price}、关键支撑 ¥{support}、关键阻力 ¥{resistance} 自动估算。',
      positionSuggestionTitle: '三档仓位建议',
      cautiousType: '谨慎型',
      balancedType: '平衡型',
      aggressiveType: '积极型',
      positionSuggestionRiskHigh: '当前风险较高，建议以防守为主，优先等待更明确信号。',
      positionSuggestionRiskMedium: '当前为中性偏观察区，建议轻仓试错并严格执行止损。',
      positionSuggestionRiskLow: '当前评分偏高，可考虑分批建仓，不建议一次性满仓。',
      positionSuggestionDisclaimer: '仓位建议基于当前评分、买卖信号与风险状态自动生成，不构成投资建议。',
      guestHint: '你当前是游客模式。登录后可解锁：个性化日报、分析历史、会员权益与支付开通。',
      hotWatch: '热门关注',
      viewMore: '查看更多',
      scoreLabel: '评分',
    },
    tools: {
      title: '工具箱',
      subtitle: '专业投资辅助工具集合',
      loginRequired: '请先登录',
      paymentSuccess: '支付联调成功：{plan} 已开通（订单 {order}）',
      paymentFailed: '支付联调失败，请稍后重试',
      inviteCopySuccess: '邀请码已复制',
      inviteCopyFailed: '复制失败，请手动复制',
      inviteBindSuccess: '绑定成功',
      inviteBindFailed: '绑定失败，请检查邀请码',
      alertCreateSuccess: '预警创建成功',
      alertCreateFailed: '创建失败，请检查参数',
      alertCheckNone: '暂无触发预警',
      alertCheckHit: '本次触发 {count} 条预警',
      alertCheckFailed: '预警检查失败',
    },
    market: {
      title: '市场总览',
      dateHint: '数据仅供参考',
      dataSource: '数据源：',
      sentimentMeter: '情绪温度计',
      sectorCapitalFlow: '板块资金流向',
      anomalyRadar: '今日异动雷达',
      industryRotation: '行业轮动',
      collapse: '收起',
      viewAll: '查看全部',
      week: '近一周',
      month: '近一月',
      industry: '行业',
    },
    profile: {
      title: '个人中心',
      subtitle: '账号、会员与常用入口',
      authTitle: '注册 / 登录',
      phonePlaceholder: '手机号',
      nicknamePlaceholder: '昵称（注册可选）',
      loginRegister: '登录 / 注册',
      loginSuccess: '登录成功',
      loginFailed: '登录失败，请稍后重试',
      phoneRequired: '请输入手机号',
      loginRequired: '请先登录',
      logout: '退出登录',
      logoutSuccess: '已退出登录',
      vipLevelPrefix: '当前等级：',
      free: '免费版',
      quotaTotal: '今日配额',
      quotaUsed: '已使用',
      quotaLeft: '剩余',
      vipExpireAt: '会员到期时间：',
      memberBenefits: '会员权益',
      inviteCenter: '邀请中心',
      myInviteCode: '我的邀请码：',
      invitedCount: '累计邀请：{count} 人',
      inviteBindSuccess: '邀请码绑定成功',
      inviteBindFailed: '邀请码绑定失败',
      inviteBound: '已绑定',
      inviteBind: '绑定',
      inputInviteCode: '输入邀请码',
      orderHistoryTitle: '订单与开通记录',
      orderCount: '{count} 条',
      refreshing: '刷新中...',
      noOrders: '暂无订单记录',
      orderNoPrefix: '订单号:',
      orderCreatedPrefix: '创建:',
      learningTitle: '投资教程',
      analysisOverviewTitle: '分析记录总览',
      totalAnalyses: '累计分析',
      avgScore: '平均评分',
      active7d: '近7天活跃',
      trend7d: '近7天分析趋势',
      renewVip: '续费VIP ¥39/月',
      renewPro: '续费PRO ¥99/月',
      renewSuccess: '{plan} 续费成功',
      renewFailed: '续费失败，请稍后重试',
      memberNormal: '会员状态正常，距离到期还有 {days} 天。',
      memberExpiring: '会员将在 {days} 天后到期，建议提前续费。',
      memberExpired: '会员已到期，请尽快续费以避免功能中断。',
    },
  },
} as const;

export type Locale = keyof typeof messages;

export function t(key: string, locale: Locale = 'zh-CN', fallback = ''): string {
  const segments = key.split('.');
  let current: unknown = messages[locale];
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return fallback || key;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : fallback || key;
}

export function tf(
  key: string,
  vars: Record<string, string | number>,
  locale: Locale = 'zh-CN',
  fallback = ''
): string {
  let template = t(key, locale, fallback);
  for (const [name, value] of Object.entries(vars)) {
    template = template.replaceAll(`{${name}}`, String(value));
  }
  return template;
}

export function formatDate(value: string | null, locale: Locale = 'zh-CN'): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}
