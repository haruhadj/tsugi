import React from 'react';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Wordmark: React.FC<WordmarkProps> = ({ size = 'md', onClick }) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div
        className={`flex items-center justify-center font-bold font-mono tracking-tighter rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950/40 border border-rose-400/30 ${
          isLg ? 'w-11 h-11 text-xl' : isSm ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-base'
        }`}
      >
        次
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-black tracking-tight text-white ${
              isLg ? 'text-2xl' : isSm ? 'text-base' : 'text-xl'
            }`}
          >
            Tsugi
          </span>
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            次
          </span>
        </div>
        {!isSm && (
          <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">
            Curated Anime & Manga
          </span>
        )}
      </div>
    </div>
  );
};
