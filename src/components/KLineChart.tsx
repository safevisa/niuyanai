'use client';

import dynamic from 'next/dynamic';
import type { BuySignal, SellSignal } from '@/types';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface KLineChartProps {
  data: [string, number, number, number, number, number][];
  buySignals?: BuySignal[];
  sellSignals?: SellSignal[];
  stockName?: string;
}

export default function KLineChart({ data, stockName }: KLineChartProps) {
  const dates   = data.map((d) => d[0]);
  const candles = data.map((d) => [d[1], d[2], d[3], d[4]]);
  const volumes = data.map((d) => ({
    value: d[5],
    itemStyle: { color: d[2] >= d[1] ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)' },
  }));

  // Calculate MA lines
  function calcMA(period: number) {
    return data.map((_, i) => {
      if (i < period - 1) return null;
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d[2], 0);
      return +(sum / period).toFixed(2);
    });
  }

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: (params: any[]) => {
        const c = params[0];
        if (!c) return '';
        const [o, cl, l, h] = c.data;
        const change = cl - o;
        const changePct = ((change / o) * 100).toFixed(2);
        const color = change >= 0 ? '#22c55e' : '#ef4444';
        return `
          <div style="padding:4px 8px">
            <div style="font-weight:600;margin-bottom:4px">${c.name}</div>
            <div>开 <span style="color:${color}">${o}</span></div>
            <div>收 <span style="color:${color}">${cl}</span></div>
            <div>高 <span style="color:#f8fafc">${h}</span></div>
            <div>低 <span style="color:#f8fafc">${l}</span></div>
            <div>涨跌 <span style="color:${color}">${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct}%)</span></div>
          </div>
        `;
      },
    },
    legend: {
      data: ['K线', 'MA5', 'MA10', 'MA20'],
      textStyle: { color: '#64748b', fontSize: 11 },
      top: 4,
    },
    grid: [
      { left: 60, right: 20, top: 40, height: '65%' },
      { left: 60, right: 20, bottom: 30, height: '20%' },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        gridIndex: 0,
        axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#475569', fontSize: 10 },
        axisTick:  { show: false },
        splitLine: { show: false },
      },
      {
        type: 'category',
        data: dates,
        gridIndex: 1,
        axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { show: false },
        axisTick:  { show: false },
        splitLine: { show: false },
      },
    ],
    yAxis: [
      {
        scale: true,
        gridIndex: 0,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#475569', fontSize: 10 },
        axisLine:  { show: false },
        axisTick:  { show: false },
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: {
          color: '#475569',
          fontSize: 10,
          formatter: (v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v.toString(),
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 40, end: 100 },
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        start: 40,
        end: 100,
        height: 20,
        bottom: 4,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255,255,255,0.04)',
        fillerColor: 'rgba(249,115,22,0.1)',
        handleStyle: { color: '#f97316' },
        textStyle: { color: '#475569' },
      },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: candles,
        itemStyle: {
          color:        '#22c55e',
          color0:       '#ef4444',
          borderColor:  '#22c55e',
          borderColor0: '#ef4444',
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: [],
        },
      },
      {
        name: 'MA5',
        type: 'line',
        data: calcMA(5),
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        lineStyle: { color: '#f59e0b', width: 1 },
      },
      {
        name: 'MA10',
        type: 'line',
        data: calcMA(10),
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        lineStyle: { color: '#a78bfa', width: 1 },
      },
      {
        name: 'MA20',
        type: 'line',
        data: calcMA(20),
        smooth: true,
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        lineStyle: { color: '#38bdf8', width: 1 },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        barMaxWidth: 8,
      },
    ],
  };

  return (
    <div className="w-full" style={{ height: 420 }}>
      {stockName && (
        <div className="text-xs text-dark-400 mb-2 px-1">
          {stockName} · K线图（含MA5/MA10/MA20）
        </div>
      )}
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
