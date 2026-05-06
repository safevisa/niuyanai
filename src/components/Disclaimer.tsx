'use client';

import { AlertTriangle } from 'lucide-react';

interface DisclaimerProps {
  compact?: boolean;
}

export default function Disclaimer({ compact = false }: DisclaimerProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red-300/80 leading-relaxed">
          以上内容为AI参考性分析，<strong>不构成投资建议</strong>，市场有风险，请独立判断，风险自担。
        </p>
      </div>
    );
  }

  return (
    <div className="disclaimer-bar">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-red-400" />
        <div>
          <p className="font-semibold text-red-300 mb-1">重要免责声明</p>
          <p className="leading-relaxed">
            牛眼AI所有分析内容基于历史数据，属于<strong>参考性解读</strong>，
            <strong>不构成任何投资建议或买卖指令</strong>。股市有风险，投资须谨慎。
            历史表现不代表未来收益。所有投资决策及相关风险均由投资者本人承担。
          </p>
        </div>
      </div>
    </div>
  );
}
