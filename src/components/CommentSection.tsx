import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  db,
} from '../firebase';
import { ObservationComment } from '../types';
import { MessageSquare, Send, User as UserIcon, Clock } from 'lucide-react';

interface CommentSectionProps {
  observationId: string;
  user: User | null;
  onOpenAuth: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ observationId, user, onOpenAuth }) => {
  const [comments, setComments] = useState<ObservationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!observationId) return;

    const commentsRef = collection(db, 'observations', observationId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ObservationComment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            by: data.by,
            authorEmail: data.authorEmail || 'team@hospital.edu',
            authorName: data.authorName || data.authorEmail?.split('@')[0] || 'Intern',
            text: data.text,
            createdAt: data.createdAt,
          });
        });
        setComments(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching comments subcollection:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [observationId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const commentsRef = collection(db, 'observations', observationId, 'comments');
      await addDoc(commentsRef, {
        by: user.uid,
        authorEmail: user.email || 'intern',
        authorName: user.displayName || user.email?.split('@')[0] || 'Intern',
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError('Could not post comment. Please check your authorization.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    if (ts.toDate) {
      return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    }
    return '';
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
          <span>Team Discussion Thread ({comments.length})</span>
        </div>
        <span className="text-[10px] text-slate-400 font-normal">Real-time subcollection</span>
      </div>

      {/* Comment List */}
      {loading ? (
        <div className="text-xs text-slate-400 py-2 text-center">Loading discussion...</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
          No comments yet. Start the team debrief or question this friction point below.
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {comments.map((c) => {
            const isMe = user?.uid === c.by;
            return (
              <div
                key={c.id}
                className={`p-2.5 rounded-xl text-xs ${
                  isMe
                    ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 ml-3'
                    : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mr-3'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <UserIcon className="w-3 h-3 text-slate-400" />
                    <span>{c.authorName}</span>
                    {isMe && <span className="text-[10px] text-sky-600 font-medium">(You)</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimestamp(c.createdAt)}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {c.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Input */}
      {error && <div className="text-[11px] text-rose-600">{error}</div>}

      <form onSubmit={handleAddComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Add team comment or debrief question..." : "Sign in to join discussion"}
          disabled={!user || submitting}
          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden"
        />
        <button
          type="submit"
          disabled={!user || submitting || !newComment.trim()}
          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3 h-3" />
          <span className="hidden sm:inline">Post</span>
        </button>
      </form>
    </div>
  );
};
