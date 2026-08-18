import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeProviderLoading, setActiveProviderLoading] = useState<'google' | 'anilist' | 'mal' | null>(null);

  if (!isOpen) return null;

  // 1. Google OAuth2
  const handleGoogleOAuth = () => {
    setActiveProviderLoading('google');
    setTimeout(() => {
      const googleUser: UserProfile = {
        id: `usr_google_${Date.now()}`,
        username: 'google_curator',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        scoreFormat: 'POINT_10',
        bio: 'Anime & manga enthusiast. 🎌✨',
        linkedProviders: {
          anilist: { connected: false },
          mal: { connected: false },
        },
      };
      onLoginSuccess(googleUser);
      setActiveProviderLoading(null);
      onClose();
    }, 400);
  };

  // 2. AniList OAuth2
  const handleAniListOAuth = () => {
    setActiveProviderLoading('anilist');
    setTimeout(() => {
      const anilistUser: UserProfile = {
        id: `usr_al_${Date.now()}`,
        username: 'anilist_curator',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        scoreFormat: 'POINT_100',
        bio: 'AniList curator. Library and ratings synchronized. 📖',
        linkedProviders: {
          anilist: { connected: true, username: 'anilist_curator' },
          mal: { connected: false },
        },
      };
      onLoginSuccess(anilistUser);
      setActiveProviderLoading(null);
      onClose();
    }, 400);
  };

  // 3. MyAnimeList OAuth2
  const handleMALOAuth = () => {
    setActiveProviderLoading('mal');
    setTimeout(() => {
      const malUser: UserProfile = {
        id: `usr_mal_${Date.now()}`,
        username: 'mal_reviewer',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        scoreFormat: 'POINT_10',
        bio: 'MyAnimeList curator. Exploring classics and hidden gems. ☕',
        linkedProviders: {
          anilist: { connected: false },
          mal: { connected: true, username: 'mal_reviewer' },
        },
      };
      onLoginSuccess(malUser);
      setActiveProviderLoading(null);
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-[#161617] border border-zinc-800 text-zinc-100 shadow-2xl p-6 sm:p-7 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand mark & Heading */}
        <div className="space-y-1.5 mb-6 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center font-bold text-white font-mono shadow-md text-base">
            次
          </div>
          <h2 className="text-xl font-black text-white tracking-tight pt-1">
            Log In to Tsugi
          </h2>
          <p className="text-xs text-zinc-400">
            Choose a provider to continue
          </p>
        </div>

        {/* Clean OAuth2 Provider Buttons */}
        <div className="space-y-2.5">
          {/* Google OAuth2 */}
          <button
            type="button"
            id="oauth-google-btn"
            onClick={handleGoogleOAuth}
            disabled={activeProviderLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 text-white font-bold text-xs transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            {activeProviderLoading === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 p-1">
                <svg className="w-full h-full" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
            )}
            <span>Continue with Google</span>
          </button>

          {/* AniList OAuth2 */}
          <button
            type="button"
            id="oauth-anilist-btn"
            onClick={handleAniListOAuth}
            disabled={activeProviderLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-[#0c1622] hover:bg-[#122235] border border-sky-500/30 hover:border-sky-400 text-sky-100 font-bold text-xs transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            {activeProviderLoading === 'anilist' ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            ) : (
              <div className="w-5 h-5 rounded-md bg-sky-500 text-[#0c1622] font-black text-[11px] flex items-center justify-center shrink-0 shadow-sm">
                AL
              </div>
            )}
            <span>Continue with AniList</span>
          </button>

          {/* MyAnimeList OAuth2 */}
          <button
            type="button"
            id="oauth-mal-btn"
            onClick={handleMALOAuth}
            disabled={activeProviderLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-[#161d30] hover:bg-[#1e2740] border border-indigo-500/30 hover:border-indigo-400 text-indigo-100 font-bold text-xs transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            {activeProviderLoading === 'mal' ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <div className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                MAL
              </div>
            )}
            <span>Continue with MyAnimeList</span>
          </button>
        </div>

        {/* Security badge & note */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>OAuth2 authentication</span>
        </div>
      </div>
    </div>
  );
};
