import { ArrowUpRight } from 'lucide-react';
import { Card, SectionHeading, Tag } from '@kravlone/shared/ui';
import { BLOG_URL } from './config';

export interface LatestPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  reading_time_min: number;
  tags: { slug: string; name: string }[];
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

/** BLG-50: 3 newest posts on the homepage. Renders nothing until there is at least one. */
export function LatestPosts({ posts }: { posts: LatestPost[] }) {
  if (!posts.length) return null;
  return (
    <section id="blog" className="mb-24" aria-labelledby="latest-posts-h">
      <SectionHeading label="WRITING">
        <span id="latest-posts-h">Latest Posts</span>
      </SectionHeading>
      <ul className="grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <li key={p.id}>
            <Card interactive className="relative flex h-full flex-col p-5">
              <p className="font-mono text-xs text-subtle">
                <time dateTime={p.published_at}>{fmt(p.published_at)}</time> · {p.reading_time_min} min
              </p>
              <h3 className="mt-2 font-semibold leading-snug text-fg-strong">
                <a href={`${BLOG_URL}/${p.slug}`} className="after:absolute after:inset-0 hover:text-neon">{p.title}</a>
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{p.excerpt}</p>
              {p.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.slice(0, 2).map((t) => <Tag key={t.slug}>#{t.slug}</Tag>)}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <a href={BLOG_URL} className="mt-6 inline-flex items-center gap-1 font-mono text-sm text-neon hover:underline">
        All posts <ArrowUpRight size={14} />
      </a>
    </section>
  );
}
