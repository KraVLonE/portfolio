/** BLG-54: `~/blog` in CLI mode. Pure helpers so they're unit-testable. */
import type { VFSNode } from './vfs';

export interface BlogPostMeta {
  slug: string;
  title: string;
  published_at: string;
  tags: { slug: string }[];
}

export interface BlogPostFull extends BlogPostMeta {
  content_md: string;
}

const day = (iso: string) => iso.slice(0, 10);

/** One `<slug>.md` file per published post. Content is fetched lazily on first `cat`. */
export function buildBlogNodes(posts: BlogPostMeta[]): Record<string, VFSNode> {
  const nodes: Record<string, VFSNode> = {};
  for (const p of posts) {
    const name = `${p.slug}.md`;
    nodes[name] = { type: 'file', name, blog: p };
  }
  return nodes;
}

/** Front matter + raw Markdown, like a file on disk. */
export function formatBlogPost(p: BlogPostFull, blogUrl: string): string {
  const tags = p.tags.map((t) => t.slug).join(', ');
  return [
    '---',
    `title: ${p.title}`,
    `date: ${day(p.published_at)}`,
    ...(tags ? [`tags: [${tags}]`] : []),
    `url: ${blogUrl}/${p.slug}`,
    '---',
    '',
    p.content_md,
  ].join('\n');
}

/** `ls blog`: newest first, date + filename + title. */
export function formatBlogListing(nodes: VFSNode[]): string {
  const posts = nodes.filter((n) => n.blog).sort((a, b) => b.blog!.published_at.localeCompare(a.blog!.published_at));
  if (!posts.length) return '(no posts yet)';
  const width = Math.max(...posts.map((n) => n.name.length));
  return posts.map((n) => `${day(n.blog!.published_at)}  ${n.name.padEnd(width)}  ${n.blog!.title}`).join('\n');
}
