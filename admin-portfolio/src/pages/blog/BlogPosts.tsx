import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus } from 'lucide-react';
import { Tag, TagButton, buttonClass } from '@kravlone/shared/ui';
import { blogApi, type PostStatus, type PostSummary } from './blogApi';
import { effectiveStatus, errorMessage, formatDate } from './editorUtils';
import { EmptyState, ErrorBanner, PageHeader, StatusBadge } from './parts';

const FILTERS: { label: string; value?: PostStatus }[] = [
  { label: 'all' },
  { label: 'drafts', value: 'draft' },
  { label: 'published', value: 'published' },
];

/** BLG-30: all posts with status filter. */
export default function BlogPosts() {
  const [filter, setFilter] = useState<PostStatus | undefined>();
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    blogApi
      .listPosts(filter)
      .then((p) => !cancelled && (setPosts(p), setError('')))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Blog Posts"
        label="WRITING"
        actions={
          <Link to="/blog/new" className={buttonClass('primary', 'sm')}>
            <Plus size={14} /> New post
          </Link>
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-6 flex gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <TagButton key={f.label} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </TagButton>
        ))}
      </div>

      {posts === null ? (
        <p className="font-mono text-sm text-subtle">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyState>No posts yet. <Link to="/blog/new" className="text-neon underline">Write the first one</Link>.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface/40">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                to={`/blog/${p.id}`}
                className="flex flex-col gap-2 p-4 transition-colors hover:bg-surface-raised/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={effectiveStatus(p.status, p.published_at)} />
                    <span className="truncate font-semibold text-fg-strong">{p.title}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => <Tag key={t.slug}>{t.name}</Tag>)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 font-mono text-xs text-subtle">
                  {p.pending_comments > 0 && (
                    <span className="flex items-center gap-1 text-warning" title="Pending comments">
                      <MessageSquare size={12} /> {p.pending_comments}
                    </span>
                  )}
                  <span title="Published">{p.published_at ? formatDate(p.published_at) : 'unpublished'}</span>
                  <span title="Last updated">upd {formatDate(p.updated_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
