import React from 'react';
import { ScoreFormat } from '../types';
import { formatScore } from '../lib/score';
import { Star, Smile, Meh, Frown, Sparkles } from 'lucide-react';

interface ScoreInputProps {
  value?: number; // 0 - 100 internal score
  format: ScoreFormat;
  onChange: (newScore: number) => void;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({ value = 0, format, onChange }) => {
  if (format === 'POINT_100') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-rose-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
        />
        <div className="min-w-[60px] text-right font-mono font-bold text-sm text-rose-300 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
          {value === 0 ? 'None' : `${value}%`}
        </div>
      </div>
    );
  }

  if (format === 'POINT_10') {
    const point10Val = (value / 10).toFixed(1);
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-rose-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
        />
        <div className="min-w-[64px] text-right font-mono font-bold text-sm text-amber-300 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
          {value === 0 ? 'None' : `${point10Val} / 10`}
        </div>
      </div>
    );
  }

  if (format === 'POINT_5') {
    const starsCount = Math.round(value / 20);
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === starsCount ? 0 : star * 20)}
            className={`p-1.5 rounded-md transition-all ${
              star <= starsCount
                ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
            }`}
          >
            <Star
              className={`w-5 h-5 ${star <= starsCount ? 'fill-amber-400' : 'fill-transparent'}`}
            />
          </button>
        ))}
        <span className="text-xs text-zinc-400 ml-2 font-mono">
          {value === 0 ? 'Unrated' : `${(value / 20).toFixed(1)} ★`}
        </span>
      </div>
    );
  }

  // SMILEY format
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[
        { label: 'Masterpiece', icon: Sparkles, score: 95, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40' },
        { label: 'Great', icon: Smile, score: 80, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/40' },
        { label: 'Average', icon: Meh, score: 50, color: 'text-amber-400 bg-amber-500/15 border-amber-500/40' },
        { label: 'Skip', icon: Frown, score: 20, color: 'text-rose-400 bg-rose-500/15 border-rose-500/40' },
      ].map((item) => {
        const Icon = item.icon;
        const isSelected = Math.abs(value - item.score) < 15 && value > 0;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(isSelected ? 0 : item.score)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSelected
                ? `${item.color} shadow-sm scale-105`
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        );
      })}
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 ml-1"
        >
          Clear
        </button>
      )}
    </div>
  );
};
