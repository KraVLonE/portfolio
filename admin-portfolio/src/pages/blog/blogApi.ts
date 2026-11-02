/** Typed client for /api/admin/blog (see portfolio-backend/app/api/blog_admin.py). */
import api from '../../api';

export type PostStatus = 'draft' | 'published';
export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface TagRef { slug: string; name: string }
export interface Tag extends TagRef { id: number; post_count: number }

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  tags: TagRef[];
  published_at: string | null;
  updated_at: string;
  created_at: string;
  reading_time_min: number;
  status: PostStatus;
  pending_comments: number;
}

export interface Post extends PostSummary {
  content_md: string;
  comments_enabled: boolean;
  custom_excerpt: string | null;
}

/** Body for create/update (PostIn). */
export interface PostInput {
  title: string;
  slug: string | null;
  excerpt: string | null;
  content_md: string;
  cover_image_url: string | null;
  tags: string[];
  comments_enabled: boolean;
}

export interface AdminComment {
  id: number;
  display_name: string;
  body: string;
  is_author: boolean;
  created_at: string;
  status: CommentStatus;
  post_id: number;
  post_title: string;
  post_slug: string;
}

export interface BlogImage {
  id: number;
  filename: string;
  url: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  used_in: string[];
}

const B = '/admin/blog';

export const blogApi = {
  listPosts: (status?: PostStatus) =>
    api.get<PostSummary[]>(`${B}/posts`, { params: status ? { status } : {} }).then((r) => r.data),
  getPost: (id: number) => api.get<Post>(`${B}/posts/${id}`).then((r) => r.data),
  createPost: (data: PostInput) => api.post<Post>(`${B}/posts`, data).then((r) => r.data),
  updatePost: (id: number, data: PostInput) => api.put<Post>(`${B}/posts/${id}`, data).then((r) => r.data),
  publishPost: (id: number, publishedAt?: string | null) =>
    api.post<Post>(`${B}/posts/${id}/publish`, publishedAt ? { published_at: publishedAt } : {}).then((r) => r.data),
  unpublishPost: (id: number) => api.post<Post>(`${B}/posts/${id}/unpublish`).then((r) => r.data),
  deletePost: (id: number) => api.delete(`${B}/posts/${id}`).then((r) => r.data),

  listTags: () => api.get<Tag[]>(`${B}/tags`).then((r) => r.data),
  createTag: (name: string, slug?: string) =>
    api.post<Tag>(`${B}/tags`, { name, slug: slug || null }).then((r) => r.data),
  updateTag: (id: number, name: string, slug?: string) =>
    api.put<Tag>(`${B}/tags/${id}`, { name, slug: slug || null }).then((r) => r.data),
  deleteTag: (id: number, force = false) =>
    api.delete(`${B}/tags/${id}`, { params: force ? { force: true } : {} }).then((r) => r.data),

  listComments: (status: CommentStatus) =>
    api.get<AdminComment[]>(`${B}/comments`, { params: { status } }).then((r) => r.data),
  pendingCount: () => api.get<{ count: number }>(`${B}/comments/pending-count`).then((r) => r.data.count),
  setCommentStatus: (id: number, status: CommentStatus) =>
    api.patch<AdminComment>(`${B}/comments/${id}`, { status }).then((r) => r.data),
  deleteComment: (id: number) => api.delete(`${B}/comments/${id}`).then((r) => r.data),
  authorReply: (postId: number, body: string) =>
    api.post<AdminComment>(`${B}/posts/${postId}/comments`, { body }).then((r) => r.data),

  listImages: () => api.get<BlogImage[]>(`${B}/images`).then((r) => r.data),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<BlogImage>(`${B}/images`, form).then((r) => r.data);
  },
  deleteImage: (id: number, force = false) =>
    api.delete(`${B}/images/${id}`, { params: force ? { force: true } : {} }).then((r) => r.data),
};

/** Fires when moderation changes the pending count, so the sidebar badge refreshes. */
export const COMMENTS_CHANGED = 'blog:comments-changed';
export const notifyCommentsChanged = () => window.dispatchEvent(new Event(COMMENTS_CHANGED));
