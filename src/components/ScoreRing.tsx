'use client';

import { useMemo } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animated?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '强势';
  if (score >= 60) return '偏多';
  if (score >= 40) return '中性';
  if (score >= 20) return '偏空';
  return '弱势';
}

export default function ScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
  animated = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = useMemo(
    () => circumference - (score / 100) * circumference,
    [score, circumference]
  );
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div
      className="score-ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`牛眼评分 ${score} 分`}
    >
      <svg width={size} height={size}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          filter="url(#glow)"
          style={{
            transition: animated ? 'stroke-dashoffset 1.5s ease-out' : 'none',
          }}
        />
      </svg>

      {/* Center text */}
      <div className="score-text">
        <div
          className="font-black leading-none"
          style={{ fontSize: size * 0.22, color }}
        >
          {score}
        </div>
        {showLabel && (
          <div
            className="font-medium mt-0.5"
            style={{ fontSize: size * 0.12, color: 'rgba(148,163,184,0.9)' }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
