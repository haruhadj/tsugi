import React, { useState } from 'react';
import { UserProfile, ScoreFormat, TsugiList } from '../types';
import {
  Settings as SettingsIcon,
  User,
  Star,
  Link2,
  Download,
  RotateCcw,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  LogOut,
  LogIn,
} from 'lucide-react';

interface SettingsViewProps {
  user: UserProfile | null;
  lists: TsugiList[];
  onUpdateUser: (updatedUser: UserProfile) => void;
  onResetData: () => void;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  lists,
  onUpdateUser,
  onResetData,
  onLogout,
  onOpenLogin,
}) => {
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [scoreFormat, setScoreFormat] = useState<ScoreFormat>(user?.scoreFormat || 'POINT_10');
  const [anilistConnected, setAnilistConnected] = useState(
    user?.linkedProviders.anilist?.connected || false
  );
  const [anilistUser, setAnilistUser] = useState(
    user?.linkedProviders.anilist?.username || 'kenshiro_99'
  );
  const [malConnected, setMalConnected] = useState(
    user?.linkedProviders.mal?.connected || false
  );
  const [malUser, setMalUser] = useState(
    user?.linkedProviders.mal?.username || ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">You are browsing as a Guest</h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Log in to customize your curator profile, configure default score formats, connect tracker integrations, and publish custom ranked lists.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-orange-950/40 transition-transform active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Tsugi</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      username: username.trim().toLowerCase() || 'curator',
      bio: bio.trim(),
      scoreFormat,
      linkedProviders: {
        anilist: { connected: anilistConnected, username: anilistUser },
        mal: { connected: malConnected, username: malUser },
      },
    };
    onUpdateUser(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportData = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user,
      lists,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tsugi_backup_${user.username}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3 p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Curator Settings &amp; Preferences
          </h1>
          <p className="text-xs text-zinc-400">
            Customize your public handle, scoring defaults, and tracker integrations.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Details */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-rose-400" />
            Profile Identity
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Curator Handle (Username)
              </label>
              <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 focus-within:border-rose-500/60 px-3 py-2">
                <span className="text-xs font-mono text-zinc-500 mr-1">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kenshiro_curates"
                  className="w-full bg-transparent text-sm text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Bio / Bio Note
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short note about your taste in anime & manga..."
                className="w-full text-xs p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/60 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Scoring Scale Preferences */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Default Rating Scale
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'POINT_10', label: '10-Point', desc: '8.5 / 10' },
              { id: 'POINT_100', label: '100-Point', desc: '85%' },
              { id: 'POINT_5', label: '5-Star', desc: '★★★★☆' },
              { id: 'SMILEY', label: 'Mood/Tier', desc: '😍 😊 😐' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setScoreFormat(fmt.id as ScoreFormat)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  scoreFormat === fmt.id
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">{fmt.label}</div>
                <div className="text-[11px] font-mono opacity-70 mt-0.5">{fmt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Linked Accounts */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-indigo-400" />
            Connected Tracker Accounts
          </h3>

          <div className="space-y-3">
            {/* AniList */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/30">
                  AL
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">AniList OAuth2</h4>
                  <p className="text-[11px] text-zinc-400">
                    {anilistConnected ? `Linked as @${anilistUser} (OAuth2 Authorized)` : 'Not connected'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAnilistConnected(!anilistConnected)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  anilistConnected
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    : 'bg-sky-600 hover:bg-sky-500 text-white border-transparent'
                }`}
              >
                {anilistConnected ? 'Disconnect' : 'Connect via OAuth2'}
              </button>
            </div>

            {/* MyAnimeList */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                  MAL
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">MyAnimeList OAuth2</h4>
                  <p className="text-[11px] text-zinc-400">
                    {malConnected ? `Linked as @${malUser} (OAuth2 Authorized)` : 'Not connected'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMalConnected(!malConnected)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  malConnected
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent'
                }`}
              >
                {malConnected ? 'Disconnect' : 'Connect via OAuth2'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Account Session & Logout Section */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Curator Account Session</span>
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Currently authenticated as <strong className="text-zinc-200">@{user.username}</strong> ({user.id}). Logging out will return you to guest browsing mode.
        </p>

        {onLogout && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to log out of @${user.username}?`)) {
                  onLogout();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 text-xs font-bold border border-rose-800/50 transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Tsugi</span>
            </button>
          </div>
        )}
      </div>

      {/* Data Management Section */}
      <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Data Backup &amp; Reset
        </h3>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Local Backup (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm('Reset workspace and restore official demo seed lists?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold border border-rose-900/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Seed Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
