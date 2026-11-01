import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeading, TagButton, buttonClass, cn } from '@kravlone/shared/ui';
import { blog, type TagCount } from '../api';
import { cacheKeys, useApi } from '../cache';
import { PostCard, PostCardSkeleton } from '../components/PostCard';
import { groupByYear, setPageMeta } from '../utils';

const NO_TAGS: TagCount[] = [];

/** BLG-11/12: newest first, tag chips (?tag=), year dividers, pagination. */
export default function BlogIndex() {
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const tags = useApi(cacheKeys.tags, blog.tags).data ?? NO_TAGS;
  const postsQ = useApi(cacheKeys.posts(page, tag), () => blog.posts(page, tag));
  const data = postsQ.data;

  useEffect(() => {
    const t = tags.find((x) => x.slug === tag);
    setPageMeta(t ? `#${t.slug} posts | KraVLonE Blog` : 'Blog | KraVLonE');
  }, [tag, tags]);

  const selectTag = (slug: string | null) => {
    const next = new URLSearchParams();
    if (slug && slug !== tag) next.set('tag', slug);
    setParams(next);
  };
  const pageHref = (n: number) => {
    const q = new URLSearchParams(params);
    if (n > 1) q.set('page', String(n)); else q.delete('page');
    const s = q.toString();
    return s ? `/?${s}` : '/';
  };
  const activeTag = tags.find((t) => t.slug === tag);

  return (
    <>
      <SectionHeading label="writing" as="h1">
        Blog
      </SectionHeading>
      <p className="-mt-4 mb-8 text-muted">Notes on GenAI, backend engineering and the things I break along the way.</p>

      {/* min-h reserves the chip row so nothing jumps if tags arrive after posts */}
      <div className="mb-10 min-h-[30px]">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          <TagButton active={!tag} onClick={() => selectTag(null)}>all</TagButton>
          {tags.map((t) => (
            <TagButton key={t.slug} active={t.slug === tag} onClick={() => selectTag(t.slug)}>
              #{t.slug} <span className="ml-1.5 text-subtle">{t.post_count}</span>
            </TagButton>
          ))}
        </div>
      )}
      </div>

      {postsQ.error ? (
        <p role="alert" className="font-mono text-sm text-danger">Couldn't load posts. Try again in a moment.</p>
      ) : postsQ.loading || !data ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
          {[0, 1, 2].map((i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-10 text-center font-mono text-sm text-subtle">
          {tag ? <>No posts tagged <span className="text-neon">#{activeTag?.slug ?? tag}</span> yet. <Link to="/" className="text-neon underline">See all posts</Link></> : 'No posts yet. Check back soon.'}
        </div>
      ) : (
        <div aria-busy={postsQ.stale} className={cn('transition-opacity duration-150', postsQ.stale && 'opacity-60')}>
          {groupByYear(data.items).map((g) => (
            <section key={g.year} aria-labelledby={`y-${g.year}`} className="mb-10">
              <h2 id={`y-${g.year}`} className="mb-4 flex items-center gap-3 font-mono text-sm text-subtle">
                {g.year}<span className="h-px flex-1 bg-line" />
              </h2>
              <ul className="space-y-4">
                {g.posts.map((p) => <li key={p.id}><PostCard post={p} /></li>)}
              </ul>
            </section>
          ))}

          {data.pages > 1 && (
            <nav className="flex items-center justify-between" aria-label="Pagination">
              {page > 1 ? (
                <Link to={pageHref(page - 1)} className={buttonClass('ghost', 'sm')}><ChevronLeft size={14} /> Newer</Link>
              ) : <span />}
              <span className="font-mono text-xs text-subtle">page {page} / {data.pages}</span>
              {page < data.pages ? (
                <Link to={pageHref(page + 1)} className={buttonClass('ghost', 'sm')}>Older <ChevronRight size={14} /></Link>
              ) : <span />}
            </nav>
          )}
        </div>
      )}
    </>
  );
}
