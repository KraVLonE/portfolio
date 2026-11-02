import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Reply, Trash2, X } from 'lucide-react';
import { Button, Card, TagButton, Textarea } from '@kravlone/shared/ui';
import { CommentBody } from '@kravlone/shared/markdown';
import { ConfirmModal } from '../../components/ConfirmModal';
import { blogApi, notifyCommentsChanged, type AdminComment, type CommentStatus } from './blogApi';
import { BLOG_URL, errorMessage, formatDateTime } from './editorUtils';
import { EmptyState, ErrorBanner, PageHeader, StatusBadge } from './parts';

const TABS: CommentStatus[] = ['pending', 'approved', 'rejected'];

/** BLG-35 moderation queue + BLG-46 author replies. */
export default function CommentModeration() {
  const [tab, setTab] = useState<CommentStatus>('pending');
  const [comments, setComments] = useState<AdminComment[] | null>(null);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<AdminComment | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState('');

  const load = (status = tab) =>
    blogApi.listComments(status).then(setComments).catch((e) => setError(errorMessage(e)));
  useEffect(() => { void load(tab); }, [tab]);

  const act = async (fn: () => Promise<unknown>, removeId?: number) => {
    try {
      await fn();
      setError('');
      if (removeId !== undefined) setComments((cs) => cs?.filter((c) => c.id !== removeId) ?? null);
      notifyCommentsChanged();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const sendReply = async (c: AdminComment) => {
    if (reply.trim().length < 2) return;
    await act(() => blogApi.authorReply(c.post_id, reply.trim()));
    setReply('');
    setReplyTo(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Comments" label="MODERATION" />
      <ErrorBanner message={error} />

      <div className="mb-6 flex gap-2" role="tablist" aria-label="Comment status">
        {TABS.map((t) => (
          <TagButton key={t} role="tab" aria-selected={tab === t} active={tab === t} onClick={() => { if (t !== tab) { setComments(null); setTab(t); } }}>
            {t}
          </TagButton>
        ))}
      </div>

      {comments === null ? (
        <p className="font-mono text-sm text-subtle">Loading…</p>
      ) : comments.length === 0 ? (
        <EmptyState>{tab === 'pending' ? 'Inbox zero. No comments waiting.' : `No ${tab} comments.`}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id}>
              <Card className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-fg-strong">{c.display_name}</span>
                    {c.is_author && <span className="rounded border border-neon/40 px-1.5 font-mono text-[10px] uppercase text-neon">author</span>}
                    <span className="font-mono text-xs text-subtle">{formatDateTime(c.created_at)}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <Link to={`/blog/${c.post_id}`} className="text-muted hover:text-neon">{c.post_title}</Link>
                    <a href={`${BLOG_URL}/${c.post_slug}#comments`} target="_blank" rel="noopener noreferrer"
                      className="text-subtle hover:text-neon" aria-label="Open post"><ExternalLink size={12} /></a>
                  </div>
                </div>

                <CommentBody markdown={c.body} className="mb-4" />

                <div className="flex flex-wrap gap-2">
                  {c.status !== 'approved' && (
                    <Button size="sm" onClick={() => act(() => blogApi.setCommentStatus(c.id, 'approved'), c.id)}>
                      <Check size={14} /> Approve
                    </Button>
                  )}
                  {c.status !== 'rejected' && (
                    <Button size="sm" variant="ghost" onClick={() => act(() => blogApi.setCommentStatus(c.id, 'rejected'), c.id)}>
                      <X size={14} /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReply(''); }}>
                    <Reply size={14} /> Reply
                  </Button>
                  <Button size="sm" variant="danger" aria-label="Delete comment" onClick={() => setToDelete(c)}>
                    <Trash2 size={14} />
                  </Button>
                </div>

                {replyTo === c.id && (
                  <div className="mt-4 space-y-2">
                    <Textarea label={`Reply on "${c.post_title}" as author`} rows={3} maxLength={2000} value={reply}
                      onChange={(e) => setReply(e.target.value)} autoFocus />
                    <Button size="sm" onClick={() => sendReply(c)} disabled={reply.trim().length < 2}>Post reply</Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Delete comment?"
        message="This permanently removes the comment."
        onConfirm={() => { const c = toDelete; setToDelete(null); if (c) void act(() => blogApi.deleteComment(c.id), c.id); }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
