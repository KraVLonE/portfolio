import type { Post, PostInput, PostStatus } from './blogApi';

export const BLOG_URL = (import.meta.env.VITE_BLOG_URL || 'https://blog.kravlone.xyz').replace(/\/$/, '');

/** Human-readable message from an axios/FastAPI error. */
export function errorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string };
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => {
        const field = d.loc?.filter((p) => p !== 'body').join('.');
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  if (e?.response?.status === 413) return 'File too large';
  return e?.message || 'Something went wrong';
}

/** Mirror of backend slugify, for showing the auto slug before saving. */
export function slugify(text: string, maxLen = 80): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '');
}

export const EMPTY_FORM: PostInput = {
  title: '',
  slug: null,
  excerpt: null,
  content_md: '',
  cover_image_url: null,
  tags: [],
  comments_enabled: true,
};

export function postToForm(p: Post): PostInput {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.custom_excerpt,
    content_md: p.content_md,
    cover_image_url: p.cover_image_url,
    tags: p.tags.map((t) => t.slug),
    comments_enabled: p.comments_enabled,
  };
}

/** Empty strings and null mean the same thing to the API. */
export function normalizeForm(f: PostInput): PostInput {
  const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    ...f,
    title: f.title.trim(),
    slug: blank(f.slug),
    excerpt: blank(f.excerpt),
    cover_image_url: blank(f.cover_image_url),
  };
}

export function isDirty(form: PostInput, saved: PostInput): boolean {
  return JSON.stringify(normalizeForm(form)) !== JSON.stringify(normalizeForm(saved));
}

/** Insert text at the textarea selection. Returns new value and caret position. */
export function insertAtCursor(value: string, start: number, end: number, text: string) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  // Images go on their own line.
  const pre = before && !before.endsWith('\n') ? '\n' : '';
  const post = after && !after.startsWith('\n') ? '\n' : '';
  const insert = `${pre}${text}${post}`;
  return { value: before + insert + after, caret: before.length + insert.length };
}

export const imageMarkdown = (url: string, filename: string) =>
  `![${filename.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '')}](${url})`;

// ---------- BLG-33 local autosave ----------
export interface LocalDraft {
  form: PostInput;
  savedAt: number;
}

export const draftKey = (postId: number | 'new') => `blog-draft:${postId}`;

export function loadDraft(postId: number | 'new'): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(postId));
    if (!raw) return null;
    const d = JSON.parse(raw) as LocalDraft;
    return d && typeof d.savedAt === 'number' && d.form && typeof d.form.title === 'string' ? d : null;
  } catch {
    return null;
  }
}

export function saveDraft(postId: number | 'new', form: PostInput, now = Date.now()) {
  try {
    localStorage.setItem(draftKey(postId), JSON.stringify({ form, savedAt: now } satisfies LocalDraft));
  } catch {
    /* storage full / blocked: autosave is best-effort */
  }
}

export function clearDraft(postId: number | 'new') {
  try {
    localStorage.removeItem(draftKey(postId));
  } catch {
    /* ignore */
  }
}

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** ISO (UTC) -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

/** published + future date = scheduled (BLG-03). */
export const effectiveStatus = (status: PostStatus, publishedAt: string | null, now = Date.now()) =>
  status === 'published' && publishedAt && new Date(publishedAt).getTime() > now ? ('scheduled' as const) : status;

/** datetime-local value in the future? */
export const isFutureLocal = (v: string, now = Date.now()) => !!v && new Date(v).getTime() > now;
