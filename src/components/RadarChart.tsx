'use client';

import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface RadarChartProps {
  scores: {
    trend: number;
    capital: number;
    chip: number;
    sentiment: number;
    fundamental: number;
  };
  size?: number;
}

export default function RadarChart({ scores, size = 280 }: RadarChartProps) {
  const option = {
    backgroundColor: 'transparent',
    radar: {
      center: ['50%', '50%'],
      radius: '65%',
      nameGap: 8,
      indicator: [
        { name: '趋势', max: 100 },
        { name: '资金', max: 100 },
        { name: '筹码', max: 100 },
        { name: '情绪', max: 100 },
        { name: '基本面', max: 100 },
      ],
      name: {
        textStyle: {
          color: '#94a3b8',
          fontSize: 12,
          fontFamily: 'Inter',
        },
      },
      splitNumber: 4,
      splitLine: {
        lineStyle: { color: 'rgba(255,255,255,0.06)', width: 1 },
      },
      splitArea: {
        areaStyle: {
          color: [
            'rgba(249,115,22,0.02)',
            'rgba(249,115,22,0.04)',
            'rgba(249,115,22,0.06)',
            'rgba(249,115,22,0.08)',
          ],
        },
      },
      axisLine: {
        lineStyle: { color: 'rgba(255,255,255,0.1)' },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              scores.trend,
              scores.capital,
              scores.chip,
              scores.sentiment,
              scores.fundamental,
            ],
            name: '五维评分',
            areaStyle: {
              color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(249,115,22,0.6)' },
                  { offset: 1, color: 'rgba(249,115,22,0.1)' },
                ],
              },
            },
            lineStyle: {
              color: '#f97316',
              width: 2,
            },
            itemStyle: {
              color: '#f97316',
              borderColor: '#fb923c',
              borderWidth: 2,
            },
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
        animation: true,
        animationDuration: 1000,
        animationEasing: 'elasticOut',
      },
    ],
  };

  return (
    <div style={{ width: size, height: size }}>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
