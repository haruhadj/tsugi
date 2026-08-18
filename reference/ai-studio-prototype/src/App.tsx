import React, { useState, useEffect, useCallback } from 'react';
import { TsugiList, UserProfile, ViewTab } from './types';
import {
  getStoredLists,
  saveStoredLists,
  getStoredUser,
  saveStoredUser,
  logoutStoredUser,
  getStoredVotes,
  saveStoredVotes,
  createNewEmptyList,
  resetToSeedData,
} from './lib/storage';
import { Header } from './components/Header';
import { FeedView } from './components/FeedView';
import { ListBuilder } from './components/ListBuilder';
import { RecView } from './components/RecView';
import { DashboardView } from './components/DashboardView';
import { ImportModal } from './components/ImportModal';
import { SettingsView } from './components/SettingsView';
import { LoginModal } from './components/LoginModal';

export default function App() {
  const [lists, setLists] = useState<TsugiList[]>([]);
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [votes, setVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [currentTab, setCurrentTab] = useState<ViewTab>('feed');
  const [activeBuilderList, setActiveBuilderList] = useState<TsugiList | null>(null);
  const [activeViewList, setActiveViewList] = useState<TsugiList | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize data and check URL path / slug
  useEffect(() => {
    const loadedLists = getStoredLists();
    const loadedUser = getStoredUser();
    const loadedVotes = getStoredVotes();

    // Map user votes to lists
    const updatedLists = loadedLists.map((l) => ({
      ...l,
      userVote: loadedVotes[l.slug] || null,
    }));

    setLists(updatedLists);
    setUser(loadedUser);
    setVotes(loadedVotes);
    setIsLoaded(true);

    // Parse URL pathname or hash for deep linking (e.g. /r/[slug])
    const path = window.location.pathname;
    const hash = window.location.hash;

    const slugMatch = path.match(/\/r\/([a-zA-Z0-9_-]+)/) || hash.match(/#\/r\/([a-zA-Z0-9_-]+)/);
    if (slugMatch && slugMatch[1]) {
      const targetSlug = slugMatch[1];
      const found = updatedLists.find((l) => l.slug === targetSlug);
      if (found) {
        // Increment view count
        found.views += 1;
        saveStoredLists(updatedLists);
        setActiveViewList(found);
        setCurrentTab('view');
        return;
      }
    }

    if (path.includes('/dashboard') || hash.includes('#/dashboard')) {
      setCurrentTab('dashboard');
    } else if (path.includes('/create') || hash.includes('#/create')) {
      setActiveBuilderList(createNewEmptyList(loadedUser));
      setCurrentTab('create');
    } else if (path.includes('/settings') || hash.includes('#/settings')) {
      setCurrentTab('settings');
    } else {
      setCurrentTab('feed');
    }
  }, []);

  // Update browser URL on tab changes
  const navigateTo = useCallback((tab: ViewTab, slug?: string) => {
    setCurrentTab(tab);
    if (tab === 'view' && slug) {
      window.history.pushState(null, '', `/r/${slug}`);
    } else if (tab === 'dashboard') {
      window.history.pushState(null, '', '/dashboard');
    } else if (tab === 'create') {
      window.history.pushState(null, '', '/create');
    } else if (tab === 'settings') {
      window.history.pushState(null, '', '/settings');
    } else {
      window.history.pushState(null, '', '/');
    }
  }, []);

  // Handle Authentication
  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    saveStoredUser(loggedInUser);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    logoutStoredUser();
    setUser(null);
    navigateTo('feed');
  };

  // Handle Voting
  const handleVote = useCallback(
    (slug: string, direction: 'up' | 'down') => {
      if (!user) {
        setIsLoginModalOpen(true);
        return;
      }

      setLists((prevLists) => {
        const newVotes = { ...votes };
        const updated = prevLists.map((l) => {
          if (l.slug !== slug) return l;

          const currentVote = l.userVote;
          let up = l.upvotes;
          let down = l.downvotes;

          if (currentVote === direction) {
            // Cancel vote
            if (direction === 'up') up = Math.max(0, up - 1);
            if (direction === 'down') down = Math.max(0, down - 1);
            delete newVotes[slug];
            return { ...l, upvotes: up, downvotes: down, userVote: null };
          } else {
            // Apply new vote
            if (currentVote === 'up') up = Math.max(0, up - 1);
            if (currentVote === 'down') down = Math.max(0, down - 1);

            if (direction === 'up') up += 1;
            if (direction === 'down') down += 1;

            newVotes[slug] = direction;
            return { ...l, upvotes: up, downvotes: down, userVote: direction };
          }
        });

        setVotes(newVotes);
        saveStoredVotes(newVotes);
        saveStoredLists(updated);

        if (activeViewList && activeViewList.slug === slug) {
          const matching = updated.find((l) => l.slug === slug);
          if (matching) setActiveViewList(matching);
        }

        return updated;
      });
    },
    [user, votes, activeViewList]
  );

  // Open list for viewing
  const handleOpenList = (list: TsugiList) => {
    // Increment view count
    const updated = lists.map((l) =>
      l.id === list.id ? { ...l, views: l.views + 1 } : l
    );
    setLists(updated);
    saveStoredLists(updated);

    const refreshedList = updated.find((l) => l.id === list.id) || list;
    setActiveViewList(refreshedList);
    navigateTo('view', list.slug);
  };

  // Create new list
  const handleCreateNew = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    const emptyList = createNewEmptyList(user);
    setActiveBuilderList(emptyList);
    navigateTo('create');
  };

  // Save list from builder (draft or published)
  const handleSaveList = (savedList: TsugiList, shouldPublish: boolean) => {
    setLists((prev) => {
      const exists = prev.some((l) => l.id === savedList.id);
      let nextLists: TsugiList[];
      if (exists) {
        nextLists = prev.map((l) => (l.id === savedList.id ? savedList : l));
      } else {
        nextLists = [savedList, ...prev];
      }
      saveStoredLists(nextLists);
      return nextLists;
    });

    setActiveBuilderList(savedList);
  };

  // Toggle publish from dashboard
  const handleTogglePublish = (listId: string) => {
    setLists((prev) => {
      const updated = prev.map((l) =>
        l.id === listId ? { ...l, isPublished: !l.isPublished, updatedAt: new Date().toISOString() } : l
      );
      saveStoredLists(updated);
      return updated;
    });
  };

  // Delete list
  const handleDeleteList = (listId: string) => {
    setLists((prev) => {
      const updated = prev.filter((l) => l.id !== listId);
      saveStoredLists(updated);
      return updated;
    });
  };

  // Duplicate / Clone list
  const handleDuplicateList = (original: TsugiList) => {
    const clone = createNewEmptyList(user);
    clone.title = `${original.title} (Copy)`;
    clone.category = original.category;
    clone.caption = original.caption;
    clone.scoreFormat = original.scoreFormat;
    clone.items = original.items.map((it, idx) => ({
      ...it,
      id: `itm_clone_${Date.now()}_${idx}`,
      position: idx + 1,
    }));

    setLists((prev) => {
      const updated = [clone, ...prev];
      saveStoredLists(updated);
      return updated;
    });

    setActiveBuilderList(clone);
    navigateTo('create');
  };

  // Update user profile
  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    saveStoredUser(updatedUser);
  };

  // Reset demo data
  const handleResetData = () => {
    const { lists: freshLists, user: freshUser } = resetToSeedData();
    setLists(freshLists);
    setUser(freshUser);
    setVotes({});
    navigateTo('feed');
  };

  // Handle import completion
  const handleImportComplete = (newList: TsugiList) => {
    setLists((prev) => {
      const updated = [newList, ...prev];
      saveStoredLists(updated);
      return updated;
    });
    setActiveBuilderList(newList);
    navigateTo('create');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-600 font-mono font-bold text-white flex items-center justify-center text-sm animate-pulse">
            次
          </div>
          <span className="font-semibold text-sm">Loading Tsugi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top sticky Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => navigateTo(tab)}
        user={user}
        onCreateNew={handleCreateNew}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'feed' && (
          <FeedView
            lists={lists}
            user={user}
            onOpenList={handleOpenList}
            onVote={handleVote}
            onCreateNew={handleCreateNew}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'create' && (
          <ListBuilder
            key={activeBuilderList?.id || 'new'}
            initialList={activeBuilderList || createNewEmptyList(user)}
            user={user}
            onSaveList={handleSaveList}
            onViewPublished={(saved) => {
              setActiveViewList(saved);
              navigateTo('view', saved.slug);
            }}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'view' && activeViewList && (
          <RecView
            list={activeViewList}
            user={user}
            onBack={() => navigateTo('feed')}
            onVote={handleVote}
            onCloneList={handleDuplicateList}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            lists={lists}
            user={user}
            onEditList={(listToEdit) => {
              setActiveBuilderList(listToEdit);
              navigateTo('create');
            }}
            onViewList={handleOpenList}
            onTogglePublish={handleTogglePublish}
            onDeleteList={handleDeleteList}
            onDuplicateList={handleDuplicateList}
            onCreateNew={handleCreateNew}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'import' && (
          <ImportModal
            user={user}
            onImportComplete={handleImportComplete}
            onUpdateUser={handleUpdateUser}
            onNavigateToSettings={() => navigateTo('settings')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            lists={lists}
            onUpdateUser={handleUpdateUser}
            onResetData={handleResetData}
            onLogout={handleLogout}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}
      </main>

      {/* Reddit-style Login / Auth Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400 font-mono">Tsugi (次)</span>
            <span>•</span>
            <span>Fast Anime &amp; Manga Curation Platform</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>AniList GraphQL Live</span>
            <span>•</span>
            <span>OpenGraph 1200×630</span>
            <span>•</span>
            <span>Zero-Friction Sharing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
