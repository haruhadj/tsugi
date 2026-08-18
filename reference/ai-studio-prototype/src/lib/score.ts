import { ScoreFormat } from '../types';

/**
 * Score formats:
 * - POINT_100: 0-100 (e.g. 94)
 * - POINT_10: 1.0 - 10.0 (e.g. 9.4)
 * - POINT_5: 1 - 5 stars (e.g. 4.5 / 5)
 * - SMILEY: 1-3 or 1-5 smiley rating
 */

export function formatScore(rawScore: number | undefined, format: ScoreFormat): string {
  if (rawScore === undefined || rawScore === 0) {
    return 'Unrated';
  }

  switch (format) {
    case 'POINT_100':
      return `${Math.round(rawScore)}`;
    case 'POINT_10':
      return (rawScore / 10).toFixed(1);
    case 'POINT_5':
      return `${(rawScore / 20).toFixed(1)} ★`;
    case 'SMILEY':
      if (rawScore >= 80) return '😍 Masterpiece';
      if (rawScore >= 60) return '😊 Recommended';
      if (rawScore >= 40) return '😐 Average';
      return '🙁 Skip';
    default:
      return `${rawScore}`;
  }
}

export function getScoreBadgeColor(rawScore: number | undefined): {
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
} {
  if (rawScore === undefined || rawScore === 0) {
    return {
      bg: 'bg-zinc-800/60',
      text: 'text-zinc-400',
      border: 'border-zinc-700/60',
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };
  }

  if (rawScore >= 88) {
    return {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    };
  }
  if (rawScore >= 75) {
    return {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    };
  }
  if (rawScore >= 60) {
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    };
  }
  return {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  };
}

export function rawFromFormattedInput(value: number, format: ScoreFormat): number {
  switch (format) {
    case 'POINT_100':
      return Math.min(100, Math.max(0, Math.round(value)));
    case 'POINT_10':
      return Math.min(100, Math.max(0, Math.round(value * 10)));
    case 'POINT_5':
      return Math.min(100, Math.max(0, Math.round(value * 20)));
    case 'SMILEY':
      return value;
    default:
      return value;
  }
}
