export function getPositionActionByUrgency(urgency: number): string {
  if (urgency >= 60) return '建议优先降仓或止损，避免组合继续放大回撤。';
  if (urgency >= 35) return '建议设置防守位并观察量能，必要时做结构调整。';
  return '可继续跟踪，暂以持有观察为主。';
}

export function getUrgencyLevelColorClass(urgency: number): string {
  if (urgency >= 60) return 'text-bear';
  if (urgency >= 35) return 'text-orange-300';
  return 'text-bull';
}

export function calcUrgencyByScores(score: number): number {
  // 评分越低紧急度越高：85->15, 60->40, 35->65
  const urgency = Math.round(100 - score);
  return Math.max(10, Math.min(90, urgency));
}
