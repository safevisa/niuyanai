'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';
import RadarShareCard from '@/components/RadarShareCard';
import { createShareReferral, fetchMarketRadar, fetchShareReferrals, type RadarItem, type ShareReferralItem } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAppStore } from '@/store';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function MarketRadarPage() {
  const { token } = useAppStore();
  const [sentimentScore, setSentimentScore] = useState(50);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [vipLevel, setVipLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RadarItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [inviteePhone, setInviteePhone] = useState('');
  const [referrals, setReferrals] = useState<ShareReferralItem[]>([]);
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await fetchMarketRadar(token ?? undefined);
        setSentimentScore(data.sentiment_score);
        setItems(data.items);
        setVipLevel(data.vip_level);
        setSelected(data.items[0] ?? null);
        if (token) {
          try {
            const rows = await fetchShareReferrals(token);
            setReferrals(rows);
          } catch {
            setReferrals([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  const option: EChartsOption = useMemo(() => {
    const bubbles = items.map((it) => ({
      value: [it.amount, it.pct_change, it.bull_eye_score],
      name: it.is_locked ? t('market.radarLocked') : it.stock_name,
      itemStyle: {
        color: it.radar_category === 'B1' ? '#22c55e' : it.radar_category === 'B3' ? '#f97316' : '#f59e0b',
      },
    }));
    return {
      backgroundColor: 'transparent',
      grid: { top: 20, right: 12, bottom: 30, left: 36 },
      xAxis: { type: 'value', name: t('market.radarXAxis'), axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', name: t('market.radarYAxis'), axisLabel: { color: '#94a3b8' } },
      tooltip: {
        trigger: 'item',
        formatter: (p: unknown) => {
          const row = p as { data?: { name?: string; value?: number[] | number } };
          const rawValue = row.data?.value;
          const v = Array.isArray(rawValue) ? rawValue : [0, 0, 0];
          return `${row.data?.name ?? '-'}<br/>${t('market.radarXAxis')}: ${v[0] ?? 0}<br/>${t('market.radarYAxis')}: ${v[1] ?? 0}%<br/>${t('market.radarScore')}: ${v[2] ?? 0}`;
        },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (v: number[]) => Math.max(12, (v?.[2] ?? 40) * 0.45),
          data: bubbles,
        },
      ],
    };
  }, [items]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-dark-100">{t('market.radarTitle')}</h1>
        <p className="text-xs text-dark-400 mt-0.5">{t('market.radarSubtitle')}</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-dark-100">{t('market.sentimentMeter')}</span>
          <span className="text-xl font-black text-yellow-300">{sentimentScore}</span>
        </div>
        <div className="h-2 rounded-full bg-dark-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" style={{ width: `${Math.max(0, Math.min(100, sentimentScore))}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-semibold text-dark-100 mb-2">{t('market.radarBubbleChart')}</div>
        <div className="h-72">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

      <div className="space-y-2">
        {loading && <div className="card text-xs text-dark-500">{t('stock.loading')}</div>}
        {!loading && items.map((item, idx) => {
          const locked = vipLevel === 0 && idx >= 2;
          return (
            <div
              key={`${item.stock_code}-${idx}`}
              className="card cursor-pointer"
              onClick={() => {
                if (locked) {
                  setShowPaywall(true);
                  return;
                }
                setSelected(item);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={locked ? 'blur-sm select-none text-dark-200 font-semibold' : 'text-dark-100 font-semibold'}>
                    {item.stock_name} ({item.stock_code})
                  </div>
                  <div className="text-xs text-dark-500 mt-0.5">{item.radar_category} · {item.radar_reason}</div>
                </div>
                <div className="text-2xl font-black text-yellow-300">{item.bull_eye_score}</div>
              </div>
              <div className="mt-2 text-xs text-dark-300">{item.analysis_for_beginner}</div>
            </div>
          );
        })}
      </div>

      <RadarShareCard item={selected} />

      {showPaywall && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card max-w-sm w-full space-y-3">
            <div className="text-base font-semibold text-dark-100">{t('market.radarPaywallTitle')}</div>
            <div className="text-sm text-dark-300">{t('market.radarPaywallDesc')}</div>
            <input
              className="input-dark text-sm"
              placeholder={t('market.radarInvitePhonePlaceholder')}
              value={inviteePhone}
              onChange={(e) => setInviteePhone(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-primary flex-1">{t('market.radarUpgradeVip')}</button>
              <button
                className="btn-ghost flex-1"
                onClick={async () => {
                  if (!token) {
                    setActionNotice(t('market.radarInviteNeedLogin'));
                    return;
                  }
                  try {
                    await createShareReferral(inviteePhone, token);
                    const rows = await fetchShareReferrals(token);
                    setReferrals(rows);
                    setActionNotice(t('market.radarInviteCreateSuccess'));
                  } catch {
                    setActionNotice(t('market.radarInviteCreateFailed'));
                  }
                }}
              >
                {t('market.radarInviteFriend')}
              </button>
            </div>
            {actionNotice && <div className="text-xs text-dark-300">{actionNotice}</div>}
            {referrals.length > 0 && (
              <div className="max-h-32 overflow-auto space-y-1">
                {referrals.slice(0, 8).map((r) => (
                  <div key={r.id} className="text-xs text-dark-400 flex items-center justify-between">
                    <span>{r.invitee_phone}</span>
                    <span className={r.status === 'completed' ? 'text-bull' : 'text-orange-300'}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-ghost w-full text-sm" onClick={() => setShowPaywall(false)}>{t('market.collapse')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
