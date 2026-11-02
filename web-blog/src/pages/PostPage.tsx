import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TagButton } from '@kravlone/shared/ui';
import { MarkdownRenderer, extractToc, shouldShowToc } from '@kravlone/shared/markdown';
import { ApiError, blog } from '../api';
import { cacheKeys, cacheSet, useApi } from '../cache';
import { Comments } from '../components/Comments';
import { PostCard } from '../components/PostCard';
import { formatDate, setPageMeta, wasUpdated } from '../utils';
import NotFound from './NotFound';

export default function PostPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const q = useApi(cacheKeys.post(slug), () => blog.post(slug));
  // Never show the previous post while the next one loads.
  const post = q.stale ? undefined : q.data;
  const state = post ? 'ok' : q.error ? (q.error instanceof ApiError && q.error.status === 404 ? 'missing' : 'error') : 'loading';

  useEffect(() => {
    if (!post) return;
    // BLG-04: API followed a 301 for a renamed slug -> show the canonical URL.
    if (post.slug !== slug) {
      cacheSet(cacheKeys.post(post.slug), post);
      navigate(`/${post.slug}${window.location.hash}`, { replace: true });
    }
    setPageMeta(`${post.title} | KraVLonE Blog`, post.excerpt);
  }, [post, slug, navigate]);

  // Jump to #heading / #comments after content renders.
  useEffect(() => {
    if (state === 'ok' && window.location.hash) {
      document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
    }
  }, [state]);

  const toc = useMemo(() => (post ? extractToc(post.content_md) : []), [post]);

  if (state === 'missing') return <NotFound />;
  if (state === 'error') return <p role="alert" className="font-mono text-sm text-danger">Couldn't load this post. Try again in a moment.</p>;
  if (!post) {
    return (
      <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading post">
        <div className="h-4 w-40 rounded bg-surface" />
        <div className="h-10 w-3/4 rounded bg-surface" />
        <div className="h-64 rounded bg-surface" />
      </div>
    );
  }

  return (
    <article>
      <Link to="/" className="mb-8 inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-neon">
        <ArrowLeft size={14} /> all posts
      </Link>

      <header className="mb-10">
        <p className="font-mono text-xs text-subtle">
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
          {wasUpdated(post.published_at, post.updated_at) && (
            <> · updated <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time></>
          )}
          {' '}· {post.reading_time_min} min read
        </p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-fg-strong sm:text-4xl">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <TagButton key={t.slug} onClick={() => navigate(`/?tag=${t.slug}`)}>#{t.slug}</TagButton>
            ))}
          </div>
        )}
      </header>

      {post.cover_image_url && (
        <img src={post.cover_image_url} alt="" className="mb-10 w-full rounded-lg border border-line" />
      )}

      {shouldShowToc(toc) && (
        <nav aria-label="Table of contents" className="mb-10 rounded-lg border border-line bg-surface/40 p-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">// contents</p>
          <ol className="space-y-1.5 text-sm">
            {toc.map((t) => (
              <li key={t.id} className={t.depth === 3 ? 'pl-4' : ''}>
                <a href={`#${t.id}`} className="text-muted hover:text-neon">{t.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <MarkdownRenderer markdown={post.content_md} />

      {post.related.length > 0 && (
        <section aria-labelledby="related-h" className="mt-16">
          <h2 id="related-h" className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">// related</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {post.related.map((r) => <li key={r.id}><PostCard post={r} compact /></li>)}
          </ul>
        </section>
      )}

      <Comments slug={post.slug} enabled={post.comments_enabled} />
    </article>
  );
}
