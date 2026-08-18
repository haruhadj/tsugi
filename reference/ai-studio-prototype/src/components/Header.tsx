import React, { useState, useRef, useEffect } from 'react';
import { ViewTab, UserProfile } from '../types';
import { Wordmark } from './Wordmark';
import {
  Compass,
  PlusCircle,
  LayoutDashboard,
  Settings,
  DownloadCloud,
  LogOut,
  LogIn,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  user: UserProfile | null;
  onCreateNew: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  user,
  onCreateNew,
  onOpenLogin,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Main public navigation links (non-redundant with user profile dropdown)
  const navItems = [
    { id: 'feed' as ViewTab, label: 'Feed', icon: Compass },
    { id: 'create' as ViewTab, label: 'Builder', icon: PlusCircle },
    { id: 'import' as ViewTab, label: 'Import', icon: DownloadCloud },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-6">
        {/* Left: Brand + Main Navigation Links */}
        <div className="flex items-center gap-8">
          <Wordmark onClick={() => onSelectTab('feed')} />

          {/* Clean Main Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-colors ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Area: Profile Selector & Dropdown (houses Personal Lists & Settings) / Guest Log In */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="header-user-menu-btn"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 py-1 px-2 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors group cursor-pointer"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700/80 group-hover:ring-rose-500/60 transition-all"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-medium text-zinc-300 max-w-[110px] truncate hidden sm:inline group-hover:text-white transition-colors">
                  @{user.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform" />
              </button>

              {/* User Dropdown Menu (Dedicated Hub for User Context) */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl p-1.5 backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                    <p className="text-xs font-bold text-white truncate">@{user.username}</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {user.bio || 'Tsugi Curator'}
                    </p>
                  </div>

                  <button
                    id="dropdown-dashboard-btn"
                    onClick={() => {
                      onSelectTab('dashboard');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      currentTab === 'dashboard'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-orange-400" />
                    <span>My Curated Lists</span>
                  </button>

                  <button
                    id="dropdown-settings-btn"
                    onClick={() => {
                      onSelectTab('settings');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      currentTab === 'settings'
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Settings &amp; Integrations</span>
                  </button>

                  <div className="border-t border-zinc-800/80 my-1" />

                  <button
                    id="header-logout-btn"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Clean, elegant Log In trigger for Guests */
            <button
              id="header-login-btn"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 border-t border-zinc-900 bg-zinc-950/95">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                isActive ? 'text-rose-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        {user ? (
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
              currentTab === 'dashboard' ? 'text-rose-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>My Lists</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </header>
  );
};
