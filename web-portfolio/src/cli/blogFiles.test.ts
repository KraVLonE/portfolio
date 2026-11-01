import { describe, expect, it } from 'vitest';
import { buildBlogNodes, formatBlogListing, formatBlogPost } from './blogFiles';
import { VirtualFileSystem } from './vfs';

const posts = [
  { slug: 'old-post', title: 'Old Post', published_at: '2025-03-01T10:00:00Z', tags: [] },
  { slug: 'rag-agents', title: 'RAG Agents', published_at: '2026-10-20T10:00:00Z', tags: [{ slug: 'genai' }] },
];

describe('BLG-54 ~/blog', () => {
  it('creates one lazy .md file per post', () => {
    const nodes = buildBlogNodes(posts);
    expect(Object.keys(nodes)).toEqual(['old-post.md', 'rag-agents.md']);
    expect(nodes['rag-agents.md'].content).toBeUndefined();
    expect(nodes['rag-agents.md'].blog?.title).toBe('RAG Agents');
  });

  it('ls lists newest first with date and title, aligned', () => {
    expect(formatBlogListing(Object.values(buildBlogNodes(posts)))).toBe(
      '2026-10-20  rag-agents.md  RAG Agents\n2025-03-01  old-post.md    Old Post',
    );
    expect(formatBlogListing([])).toBe('(no posts yet)');
  });

  it('cat shows front matter + raw markdown', () => {
    const out = formatBlogPost({ ...posts[1], content_md: '## Hi\n\n**x**' }, 'https://blog.test');
    expect(out).toBe('---\ntitle: RAG Agents\ndate: 2026-10-20\ntags: [genai]\nurl: https://blog.test/rag-agents\n---\n\n## Hi\n\n**x**');
  });

  it('is reachable through the VFS', () => {
    const vfs = new VirtualFileSystem(null, [], [], [], [], posts);
    expect(vfs.resolvePath('~', 'blog/rag-agents.md').node?.blog?.slug).toBe('rag-agents');
    expect(vfs.resolvePath('~/blog', '../blog').path).toBe('~/blog');
  });

  it('existing callers without posts get an empty ~/blog', () => {
    const vfs = new VirtualFileSystem(null, [], [], [], []);
    expect(vfs.resolvePath('~', 'blog').node?.children).toEqual({});
  });
});
