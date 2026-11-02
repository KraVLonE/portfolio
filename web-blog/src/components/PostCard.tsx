import { Link } from 'react-router-dom';
import { Card, Tag } from '@kravlone/shared/ui';
import { blog, type PostSummary } from '../api';
import { cacheKeys, prefetch } from '../cache';
import { formatDate } from '../utils';

export function PostMeta({ post }: { post: PostSummary }) {
  return (
    <p className="font-mono text-xs text-subtle">
      <time dateTime={post.published_at}>{formatDate(post.published_at)}</time> · {post.reading_time_min} min read
    </p>
  );
}

export function PostCard({ post, compact = false }: { post: PostSummary; compact?: boolean }) {
  const warm = () => prefetch(cacheKeys.post(post.slug), () => blog.post(post.slug));
  return (
    <Card interactive className="relative flex gap-4 p-5 sm:gap-6">
      <div className="min-w-0 flex-1">
      <PostMeta post={post} />
      <h3 className={compact ? 'mt-1.5 text-lg font-semibold text-fg-strong' : 'mt-2 text-xl font-bold text-fg-strong'}>
        {/* Stretched link: whole card clickable, one link in the a11y tree */}
        <Link
          to={`/${post.slug}`}
          onMouseEnter={warm}
          onFocus={warm}
          onTouchStart={warm}
          className="after:absolute after:inset-0 hover:text-neon focus-visible:outline-none"
        >
          {post.title}
        </Link>
      </h3>
      {!compact && post.excerpt && <p className="mt-2 leading-relaxed text-muted">{post.excerpt}</p>}
      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => <Tag key={t.slug}>#{t.slug}</Tag>)}
        </div>
      )}
      </div>
      {!compact && post.cover_image_url && (
        // Fixed box = no layout shift while the image loads. Decorative: title already names the post.
        <img
          src={post.cover_image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-20 w-24 shrink-0 self-center rounded-md border border-line bg-surface object-cover sm:h-28 sm:w-44"
        />
      )}
    </Card>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-line bg-surface/60 p-5" aria-hidden="true">
      <div className="h-3 w-32 rounded bg-surface-raised" />
      <div className="mt-3 h-5 w-3/4 rounded bg-surface-raised" />
      <div className="mt-3 h-3 w-full rounded bg-surface-raised" />
    </div>
  );
}
