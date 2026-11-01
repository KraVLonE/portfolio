import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button, Input, Textarea } from '@kravlone/shared/ui';
import { CommentBody } from '@kravlone/shared/markdown';
import { ApiError, blog, type Comment } from '../api';
import { relativeTime } from '../utils';

const MAX = 2000;

/** BLG-40–46: approved comments (oldest first) + pre-moderated submission form. */
export function Comments({ slug, enabled }: { slug: string; enabled: boolean }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'sent' | 'error'; msg?: string }>({ kind: 'idle' });
  const shownAt = useRef(0);

  useEffect(() => {
    shownAt.current = Date.now();
    blog.comments(slug).then(setComments).catch(() => setComments([]));
  }, [slug]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 2) return;
    setState({ kind: 'sending' });
    try {
      const r = await blog.addComment(slug, {
        body: body.trim(),
        display_name: name.trim() || undefined,
        website: website || undefined,
        form_ms: Date.now() - shownAt.current,
      });
      setBody('');
      setState({ kind: 'sent', msg: r.message });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 429
          ? 'Too many comments from your network. Please try again later.'
          : err instanceof ApiError ? err.message : 'Could not send your comment. Check your connection.';
      setState({ kind: 'error', msg });
    }
  };

  return (
    <section id="comments" aria-labelledby="comments-h" className="mt-16 scroll-mt-24 border-t border-line pt-10">
      <h2 id="comments-h" className="mb-6 flex items-center gap-2 text-xl font-bold text-fg-strong">
        <MessageSquare size={18} className="text-neon" /> Comments
        {comments && comments.length > 0 && <span className="font-mono text-sm font-normal text-subtle">({comments.length})</span>}
      </h2>

      {comments === null ? (
        <p className="font-mono text-sm text-subtle">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mb-8 font-mono text-sm text-subtle">{enabled ? 'No comments yet. Start the conversation.' : 'No comments.'}</p>
      ) : (
        <ol className="mb-10 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className={c.is_author ? 'rounded-lg border border-neon/30 bg-neon/5 p-4' : 'rounded-lg border border-line bg-surface/40 p-4'}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-fg-strong">{c.display_name}</span>
                {c.is_author && (
                  <span className="rounded border border-neon/40 px-1.5 font-mono text-[10px] uppercase tracking-widest text-neon">author</span>
                )}
                <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()} className="font-mono text-xs text-subtle">
                  {relativeTime(c.created_at)}
                </time>
              </div>
              <CommentBody markdown={c.body} />
            </li>
          ))}
        </ol>
      )}

      {enabled ? (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-surface/40 p-5" aria-label="Leave a comment">
          <Input label="Name (optional)" value={name} maxLength={40} placeholder="anonymous" autoComplete="nickname"
            onChange={(e) => setName(e.target.value)} />
          <Textarea label="Comment" rows={4} required minLength={2} maxLength={MAX} value={body}
            onChange={(e) => setBody(e.target.value)}
            hint={`${body.length}/${MAX} · **bold**, _italic_, \`code\` and links work · shown after review`} />
          {/* Honeypot: off-screen, not focusable, hidden from assistive tech. Bots fill it, humans can't. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="cm-website">Website</label>
            <input id="cm-website" name="website" tabIndex={-1} autoComplete="off" value={website}
              onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={state.kind === 'sending' || body.trim().length < 2}>
              {state.kind === 'sending' && <Loader2 size={14} className="animate-spin" />} Post comment
            </Button>
            {state.kind === 'sent' && <p role="status" className="font-mono text-sm text-success">{state.msg}</p>}
            {state.kind === 'error' && <p role="alert" className="font-mono text-sm text-danger">{state.msg}</p>}
          </div>
        </form>
      ) : (
        <p className="font-mono text-sm text-subtle">Comments are closed for this post.</p>
      )}
    </section>
  );
}
