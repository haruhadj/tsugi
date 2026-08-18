import React from 'react';
import { ScoreFormat } from '../types';
import { formatScore, getScoreBadgeColor } from '../lib/score';

interface ScoreBadgeProps {
  score?: number;
  format: ScoreFormat;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  format,
  size = 'md',
  showLabel = true,
}) => {
  const formatted = formatScore(score, format);
  const color = getScoreBadgeColor(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm transition-colors ${color.badgeClass} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      <span>{formatted}</span>
      {showLabel && score !== undefined && score > 0 && format === 'POINT_10' && (
        <span className="text-[10px] opacity-70 font-normal">/ 10</span>
      )}
      {showLabel && score !== undefined && score > 0 && format === 'POINT_100' && (
        <span className="text-[10px] opacity-70 font-normal">%</span>
      )}
    </span>
  );
};
