/** Public blog API (portfolio-backend/app/api/blog.py). */
export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://kravlone.xyz').replace(/\/$/, '');

export interface TagRef { slug: string; name: string }
export interface TagCount extends TagRef { post_count: number }

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  tags: TagRef[];
  published_at: string;
  updated_at: string;
  reading_time_min: number;
}

export interface Post extends PostSummary {
  content_md: string;
  comments_enabled: boolean;
  related: PostSummary[];
}

export interface PostPage {
  items: PostSummary[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface Comment {
  id: number;
  display_name: string;
  body: string;
  is_author: boolean;
  created_at: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') detail = body.detail;
      else if (Array.isArray(body?.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join('; ');
    } catch { /* non-JSON error */ }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const blog = {
  posts: (page = 1, tag?: string | null, perPage = 10) => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (tag) q.set('tag', tag);
    return request<PostPage>(`/blog/posts?${q}`);
  },
  /** Follows 301s for renamed slugs: compare `post.slug` with the URL to canonicalise. */
  post: (slug: string) => request<Post>(`/blog/posts/${encodeURIComponent(slug)}`),
  tags: () => request<TagCount[]>('/blog/tags'),
  comments: (slug: string) => request<Comment[]>(`/blog/posts/${encodeURIComponent(slug)}/comments`),
  addComment: (slug: string, data: { body: string; display_name?: string; website?: string; form_ms: number }) =>
    request<{ status: string; message: string }>(`/blog/posts/${encodeURIComponent(slug)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};
