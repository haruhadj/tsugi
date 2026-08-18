import React, { useState, useEffect, useMemo } from 'react';
import { TsugiList, UserProfile, TsugiComment } from '../types';
import {
  getStoredComments,
  saveStoredComment,
  deleteStoredComment,
  voteStoredComment,
} from '../lib/storage';
import {
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Reply,
  Trash2,
  Send,
  Sparkles,
  Flame,
  Clock,
  ArrowDownUp,
  Check,
  Copy,
  CornerDownRight,
  Smile,
  X,
  Award,
  LogIn,
} from 'lucide-react';

interface CommentSectionProps {
  list: TsugiList;
  user: UserProfile | null;
  onOpenLogin?: () => void;
}

type CommentSortOption = 'top' | 'newest' | 'oldest';

const QUICK_EMOJIS = ['🔥', '💯', '😭', '🎌', '👏', '🤯', '✨', '☕'];

export const CommentSection: React.FC<CommentSectionProps> = ({ list, user, onOpenLogin }) => {
  const [comments, setComments] = useState<TsugiComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedFavoriteTitle, setSelectedFavoriteTitle] = useState<string>('');
  const [sortBy, setSortBy] = useState<CommentSortOption>('top');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments
  useEffect(() => {
    const listComments = getStoredComments(list.slug);
    setComments(listComments);
  }, [list.slug]);

  // Handle vote on comment
  const handleVoteComment = (commentId: string, direction: 'up' | 'down') => {
    if (!user) {
      onOpenLogin?.();
      return;
    }
    const updated = voteStoredComment(commentId, direction, list.slug);
    setComments(updated);
  };

  // Handle delete comment
  const handleDeleteComment = (commentId: string) => {
    const updated = deleteStoredComment(commentId, list.slug);
    setComments(updated);
  };

  // Handle post top-level comment
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenLogin?.();
      return;
    }
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    const newComment: TsugiComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      listSlug: list.slug,
      authorId: user.id,
      authorUsername: user.username,
      authorAvatar: user.avatarUrl,
      isCurator: user.id === list.authorId || user.username === list.authorUsername,
      content: newCommentText.trim(),
      favoriteTitle: selectedFavoriteTitle || undefined,
      upvotes: 1,
      downvotes: 0,
      userVote: 'up',
      createdAt: new Date().toISOString(),
    };

    const updated = saveStoredComment(newComment);
    setComments(updated);
    setNewCommentText('');
    setSelectedFavoriteTitle('');
    setIsSubmitting(false);
  };

  // Handle post reply
  const handleSubmitReply = (parentId: string) => {
    if (!user) {
      onOpenLogin?.();
      return;
    }
    if (!replyText.trim()) return;

    const newReply: TsugiComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      listSlug: list.slug,
      parentId,
      authorId: user.id,
      authorUsername: user.username,
      authorAvatar: user.avatarUrl,
      isCurator: user.id === list.authorId || user.username === list.authorUsername,
      content: replyText.trim(),
      upvotes: 1,
      downvotes: 0,
      userVote: 'up',
      createdAt: new Date().toISOString(),
    };

    const updated = saveStoredComment(newReply);
    setComments(updated);
    setReplyingToId(null);
    setReplyText('');
  };

  // Copy comment text
  const handleCopyComment = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  // Organize top-level comments and child replies
  const { topLevelComments, repliesByParent } = useMemo(() => {
    const topLevel: TsugiComment[] = [];
    const replies: Record<string, TsugiComment[]> = {};

    comments.forEach((c) => {
      if (!c.parentId) {
        topLevel.push(c);
      } else {
        if (!replies[c.parentId]) replies[c.parentId] = [];
        replies[c.parentId].push(c);
      }
    });

    // Sort top-level comments
    topLevel.sort((a, b) => {
      if (sortBy === 'top') {
        const scoreA = a.upvotes - a.downvotes;
        const scoreB = b.upvotes - b.downvotes;
        return scoreB - scoreA;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    // Sort replies chronologically (oldest first)
    Object.keys(replies).forEach((pId) => {
      replies[pId].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    return { topLevelComments: topLevel, repliesByParent: replies };
  }, [comments, sortBy]);

  const totalCount = comments.length;

  const formatCommentDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div id="comments-section" className="space-y-6 pt-6 border-t border-zinc-800/90">
      {/* Discussion Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Community Discussion</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono font-bold">
                {totalCount}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Share your thoughts, recommendations, or debate rankings for this curation.
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          {[
            { id: 'top', label: 'Top', icon: Flame },
            { id: 'newest', label: 'Newest', icon: Clock },
            { id: 'oldest', label: 'Oldest', icon: ArrowDownUp },
          ].map((s) => {
            const Icon = s.icon;
            const isSelected = sortBy === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id as CommentSortOption)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Comment Input Box */}
      <form
        onSubmit={handleSubmitComment}
        className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 sm:p-5 space-y-3.5 shadow-lg focus-within:border-zinc-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-8 h-8 rounded-full object-cover border border-rose-500/40"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-200">@{user.username}</span>
            <span className="text-[11px] text-zinc-500">• Leave a review or feedback</span>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            rows={3}
            placeholder="What do you think of this list? Add your favorite picks, critiques, or suggestions..."
            className="w-full p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all resize-y min-h-[84px]"
          />
        </div>

        {/* Bottom toolbar inside input: Quick Emoji Bar + Favorite Pick Selector + Post Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Emoji insert */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
              <Smile className="w-3.5 h-3.5 text-zinc-500 ml-1 mr-0.5" />
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewCommentText((prev) => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + emoji + ' ')}
                  className="hover:scale-125 transition-transform text-xs p-1 rounded hover:bg-zinc-800"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Favorite pick from list selector */}
            {list.items.length > 0 && (
              <select
                value={selectedFavoriteTitle}
                onChange={(e) => setSelectedFavoriteTitle(e.target.value)}
                className="bg-zinc-950 text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-rose-500/50 max-w-[200px] truncate"
              >
                <option value="">✨ Highlight Top Pick (Optional)</option>
                {list.items.map((it) => {
                  const title = it.media.title.english || it.media.title.romaji;
                  return (
                    <option key={it.id} value={title}>
                      #{it.position} {title}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-zinc-500 font-mono">
              {newCommentText.length} chars
            </span>
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 border border-rose-400/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Comment</span>
            </button>
          </div>
        </div>
      </form>

      {/* Comments Feed */}
      {topLevelComments.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-2 p-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-200">No comments yet</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Be the first to share your thoughts, praise the curator, or debate the ranking!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map((comment) => {
            const replies = repliesByParent[comment.id] || [];
            const score = comment.upvotes - comment.downvotes;
            const isAuthor = comment.authorId === user.id;

            return (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 space-y-3 shadow-md hover:border-zinc-700/70 transition-colors"
              >
                {/* Comment Top Header: Avatar, Username, Badge, Time */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {comment.authorAvatar ? (
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorUsername}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center">
                        {comment.authorUsername.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        @{comment.authorUsername}
                      </span>

                      {/* Curator / OP Badge */}
                      {comment.isCurator && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <Award className="w-3 h-3" />
                          <span>Curator OP</span>
                        </span>
                      )}

                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Favorite pick tag if selected */}
                  {comment.favoriteTitle && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Fav: {comment.favoriteTitle}</span>
                    </span>
                  )}
                </div>

                {/* Mobile view Favorite Pick */}
                {comment.favoriteTitle && (
                  <div className="sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>Fav: {comment.favoriteTitle}</span>
                  </div>
                )}

                {/* Comment Content */}
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap pl-1">
                  {comment.content}
                </div>

                {/* Comment Action Footer: Upvote / Downvote, Reply, Copy, Delete */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/60 text-xs">
                  {/* Left Reddit-Style Voting Pill */}
                  <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => handleVoteComment(comment.id, 'up')}
                      className={`p-0.5 rounded transition-colors ${
                        comment.userVote === 'up'
                          ? 'text-rose-400 font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Upvote"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span
                      className={`text-xs font-mono font-bold px-1 ${
                        comment.userVote === 'up'
                          ? 'text-rose-400'
                          : comment.userVote === 'down'
                          ? 'text-indigo-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      {score}
                    </span>
                    <button
                      onClick={() => handleVoteComment(comment.id, 'down')}
                      className={`p-0.5 rounded transition-colors ${
                        comment.userVote === 'down'
                          ? 'text-indigo-400 font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="Downvote"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right Actions: Reply, Copy, Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        replyingToId === comment.id
                          ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => handleCopyComment(comment.id, comment.content)}
                      className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 transition-colors"
                      title="Copy comment text"
                    >
                      {copiedId === comment.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isAuthor && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 border border-zinc-800 transition-colors"
                        title="Delete your comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reply Form (when replying to this comment) */}
                {replyingToId === comment.id && (
                  <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-rose-500/30 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1 font-semibold text-rose-400">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        Replying to @{comment.authorUsername}
                      </span>
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      placeholder={`Write a reply to @${comment.authorUsername}...`}
                      className="w-full p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyText.trim()}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Reply</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested Thread Replies */}
                {replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-3 pl-3 sm:pl-6 border-l-2 border-l-rose-500/30">
                    {replies.map((reply) => {
                      const replyScore = reply.upvotes - reply.downvotes;
                      const isReplyAuthor = reply.authorId === user.id;

                      return (
                        <div
                          key={reply.id}
                          id={`comment-${reply.id}`}
                          className="rounded-xl bg-zinc-950/70 border border-zinc-800/70 p-3 sm:p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {reply.authorAvatar ? (
                                <img
                                  src={reply.authorAvatar}
                                  alt={reply.authorUsername}
                                  className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-200 font-bold text-[10px] flex items-center justify-center">
                                  {reply.authorUsername.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs font-bold text-white">
                                @{reply.authorUsername}
                              </span>
                              {reply.isCurator && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Curator OP
                                </span>
                              )}
                              <span className="text-zinc-600 text-xs">•</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {formatCommentDate(reply.createdAt)}
                              </span>
                            </div>

                            {isReplyAuthor && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400"
                                title="Delete reply"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {reply.content}
                          </div>

                          {/* Reply vote & actions */}
                          <div className="flex items-center justify-between gap-2 pt-1.5 text-xs">
                            <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-800">
                              <button
                                onClick={() => handleVoteComment(reply.id, 'up')}
                                className={`hover:text-rose-400 ${
                                  reply.userVote === 'up' ? 'text-rose-400' : 'text-zinc-500'
                                }`}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[11px] font-mono font-bold px-1 text-zinc-300">
                                {replyScore}
                              </span>
                              <button
                                onClick={() => handleVoteComment(reply.id, 'down')}
                                className={`hover:text-indigo-400 ${
                                  reply.userVote === 'down' ? 'text-indigo-400' : 'text-zinc-500'
                                }`}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleCopyComment(reply.id, reply.content)}
                              className="text-[11px] text-zinc-500 hover:text-zinc-300"
                            >
                              {copiedId === reply.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
