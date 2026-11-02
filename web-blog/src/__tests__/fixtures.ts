import type { Post, PostSummary } from '../api';

export const summary = (id: number, title: string, published_at: string, tags: string[] = []): PostSummary => ({
  id, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), excerpt: `Excerpt of ${title}`, cover_image_url: null,
  tags: tags.map((t) => ({ slug: t, name: t })), published_at, updated_at: published_at, reading_time_min: 3,
});

export const fullPost = (over: Partial<Post> = {}): Post => ({
  ...summary(1, 'RAG Agents', '2026-03-01T10:00:00Z', ['genai']),
  content_md: '## One\n\ntext\n\n## Two\n\n## Three\n\n```py\nx = 1\n```',
  comments_enabled: true,
  related: [],
  ...over,
});
