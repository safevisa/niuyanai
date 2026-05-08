'use client';

import { useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { RadarItem } from '@/lib/api';
import { t } from '@/lib/i18n';

type Props = {
  item: RadarItem | null;
};

export default function RadarShareCard({ item }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const tags = useMemo(() => {
    if (!item) return [];
    const out = [item.radar_category];
    if (item.amount >= 10) out.push('主力控盘');
    if (item.turnover_rate >= 8) out.push('高活跃');
    return out;
  }, [item]);

  const handleExport = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#0f172a',
      scale: 2,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `radar-share-${item?.stock_code ?? 'locked'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-dark-100">{t('market.radarShareTitle')}</div>
        <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => void handleExport()}>
          {t('market.radarExportCard')}
        </button>
      </div>
      <div
        ref={cardRef}
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(15,23,42,0.95))',
          border: '1px solid rgba(255,215,0,0.3)',
        }}
      >
        <div className="text-xs text-yellow-300">{t('market.radarShareSubtitle')}</div>
        <div className="mt-1 text-lg font-bold text-dark-100">
          {item?.is_locked ? t('market.radarLocked') : `${item?.stock_name ?? '-'} (${item?.stock_code ?? '-'})`}
        </div>
        <div className="mt-2 text-sm text-dark-200">
          {t('market.radarScore')} <span className="font-bold text-yellow-300">{item?.bull_eye_score ?? '-'}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="tag text-[10px]">{tag}</span>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-dark-300">{item?.disclaimer ?? t('market.radarDisclaimer')}</div>
        <div className="mt-2 text-[10px] text-dark-500">QR: niuyanai.com</div>
      </div>
    </div>
  );
}
