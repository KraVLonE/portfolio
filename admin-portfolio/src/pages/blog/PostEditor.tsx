import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Columns2, Eye, ExternalLink, ImagePlus, Loader2, PenLine, Trash2, Upload } from 'lucide-react';
import { Button, Input, TagButton, Textarea, cn } from '@kravlone/shared/ui';
import { MarkdownRenderer } from '@kravlone/shared/markdown';
import { ConfirmModal } from '../../components/ConfirmModal';
import { blogApi, type Post, type PostInput, type Tag } from './blogApi';
import {
  BLOG_URL, EMPTY_FORM, clearDraft, effectiveStatus, isFutureLocal, errorMessage, formatDateTime, fromLocalInput, imageMarkdown, insertAtCursor, isDirty,
  loadDraft, normalizeForm, postToForm, saveDraft, slugify, toLocalInput, type LocalDraft,
} from './editorUtils';
import { ErrorBanner, StatusBadge } from './parts';

const AUTOSAVE_MS = 10_000;
const MAX_TAGS = 5;
type View = 'split' | 'write' | 'preview';

const wideScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches;

export default function PostEditor() {
  const params = useParams();
  const postId: number | 'new' = params.id ? Number(params.id) : 'new';
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [saved, setSaved] = useState<PostInput>(EMPTY_FORM);
  const [form, setForm] = useState<PostInput>(EMPTY_FORM);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(postId !== 'new');
  const [busy, setBusy] = useState<'' | 'save' | 'publish' | 'unpublish' | 'upload'>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [restore, setRestore] = useState<LocalDraft | null>(null);
  const [schedule, setSchedule] = useState('');
  const [view, setView] = useState<View>(wideScreen() ? 'split' : 'write');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef(form);
  useLayoutEffect(() => { formRef.current = form; }, [form]);

  const dirty = isDirty(form, saved);
  const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  // ---------- load ----------
  useEffect(() => {
    let cancelled = false;
    blogApi.listTags().then((t) => !cancelled && setAllTags(t)).catch(() => {});
    const offerRestore = (server: PostInput) => {
      const local = loadDraft(postId);
      if (local && isDirty(local.form, server)) setRestore(local);
      else clearDraft(postId);
    };
    if (postId === 'new') {
      offerRestore(EMPTY_FORM);
      return () => { cancelled = true; };
    }
    blogApi
      .getPost(postId)
      .then((p) => {
        if (cancelled) return;
        const f = postToForm(p);
        setPost(p);
        setSaved(f);
        setForm(f);
        setSchedule(toLocalInput(p.published_at));
        offerRestore(f);
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [postId]);

  // ---------- BLG-33: autosave + leave guards ----------
  useEffect(() => {
    if (!dirty || restore) return;
    const t = setInterval(() => saveDraft(postId, formRef.current), AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [dirty, restore, postId]);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      saveDraft(postId, formRef.current);
      e.preventDefault();
    };
    // In-app links (sidebar etc.): capture phase runs before React Router's handler.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a || a.getAttribute('target') === '_blank') return;
      if (!window.confirm('You have unsaved changes (kept as a local draft). Leave this page?')) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        saveDraft(postId, formRef.current);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, postId]);

  // ---------- actions ----------
  const applyServer = (p: Post) => {
    const f = postToForm(p);
    setPost(p);
    setSaved(f);
    setForm(f);
    setSchedule(toLocalInput(p.published_at));
  };

  /** Saves and returns the stored post (creating it if new). */
  const save = useCallback(async (): Promise<Post | null> => {
    const data = normalizeForm(formRef.current);
    if (!data.title) {
      setError('Title is required');
      return null;
    }
    setError('');
    try {
      const p = postId === 'new' ? await blogApi.createPost(data) : await blogApi.updatePost(postId, data);
      clearDraft(postId);
      applyServer(p);
      if (postId === 'new') navigate(`/blog/${p.id}`, { replace: true });
      return p;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    }
  }, [postId, navigate]);

  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind);
    setNotice('');
    try { await fn(); } finally { setBusy(''); }
  };

  const onSave = () => run('save', async () => {
    if (await save()) setNotice('Saved');
  });

  const onPublish = () => run('publish', async () => {
    const p = dirty || postId === 'new' ? await save() : post;
    if (!p) return;
    try {
      applyServer(await blogApi.publishPost(p.id, fromLocalInput(schedule)));
      setNotice(isFutureLocal(schedule) ? 'Scheduled' : 'Published');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const onUnpublish = () => run('unpublish', async () => {
    if (!post) return;
    try {
      applyServer(await blogApi.unpublishPost(post.id));
      setNotice('Moved back to drafts');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const onDelete = async () => {
    setConfirmDelete(false);
    if (!post) return;
    try {
      await blogApi.deletePost(post.id);
      clearDraft(post.id);
      setSaved(form); // nothing left to guard
      navigate('/blog');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- BLG-36: images ----------
  const uploadFiles = async (files: File[], target: 'content' | 'cover') => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    await run('upload', async () => {
      for (const file of images) {
        try {
          const img = await blogApi.uploadImage(file);
          if (target === 'cover') {
            set('cover_image_url', img.url);
            continue;
          }
          // Functional update: several uploads in a row must not overwrite each other.
          const ta = textareaRef.current;
          const md = imageMarkdown(img.url, file.name);
          let caret = 0;
          setForm((f) => {
            const start = ta?.selectionStart ?? f.content_md.length;
            const end = ta?.selectionEnd ?? f.content_md.length;
            const r = insertAtCursor(f.content_md, start, end, md);
            caret = r.caret;
            return { ...f, content_md: r.value };
          });
          requestAnimationFrame(() => ta?.setSelectionRange(caret, caret));
        } catch (e) {
          setError(`${file.name}: ${errorMessage(e)}`);
        }
      }
    });
  };

  const onDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    setDragOver(false);
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    void uploadFiles(Array.from(e.dataTransfer.files), 'content');
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (!files.some((f) => f.type.startsWith('image/'))) return; // normal text paste
    e.preventDefault();
    void uploadFiles(files, 'content');
  };

  // ---------- derived ----------
  const toggleTag = (slug: string) =>
    set('tags', form.tags.includes(slug) ? form.tags.filter((t) => t !== slug) : [...form.tags, slug]);
  const status = post ? effectiveStatus(post.status, post.published_at) : 'draft';
  const autoSlug = slugify(form.title) || 'post';
  const words = useMemo(() => (form.content_md.match(/\w+/g) ?? []).length, [form.content_md]);
  const isLive = status === 'published';

  if (loading) return <p className="font-mono text-sm text-subtle">Loading…</p>;
  if (postId !== 'new' && !post) return <ErrorBanner message={error || 'Post not found'} />;

  return (
    <div className="animate-fade-in">
      {/* top bar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/blog" className="rounded p-2 text-subtle transition-colors hover:bg-surface hover:text-neon" aria-label="Back to posts">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold text-fg-strong">{postId === 'new' ? 'New post' : 'Edit post'}</h1>
          <StatusBadge status={status} />
          {dirty && <span className="font-mono text-xs text-warning">● unsaved</span>}
          {!dirty && notice && <span role="status" className="font-mono text-xs text-success">{notice}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLive && post && (
            <a href={`${BLOG_URL}/${post.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 font-mono text-xs text-muted hover:text-neon">
              view live <ExternalLink size={12} />
            </a>
          )}
          {post && (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Delete post">
              <Trash2 size={14} />
            </Button>
          )}
          {post?.status === 'published' && (
            <Button variant="ghost" size="sm" onClick={onUnpublish} disabled={!!busy}>Unpublish</Button>
          )}
          <Button variant="ghost" size="sm" onClick={onSave} disabled={!!busy || !form.title.trim()} title="Ctrl+S">
            {busy === 'save' && <Loader2 size={14} className="animate-spin" />}
            {post?.status === 'published' ? 'Update' : 'Save draft'}
          </Button>
          {post?.status !== 'published' && (
            <Button size="sm" onClick={onPublish} disabled={!!busy || !form.title.trim()}>
              {busy === 'publish' && <Loader2 size={14} className="animate-spin" />}
              {isFutureLocal(schedule) ? 'Schedule' : 'Publish'}
            </Button>
          )}
        </div>
      </header>

      <ErrorBanner message={error} />

      {restore && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <span className="font-mono text-warning">Unsaved local draft from {formatDateTime(new Date(restore.savedAt).toISOString())}.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setForm(restore.form); setRestore(null); }}>Restore</Button>
            <Button size="sm" variant="danger" onClick={() => { clearDraft(postId); setRestore(null); }}>Discard</Button>
          </div>
        </div>
      )}

      {/* metadata (BLG-01) */}
      <section className="mb-6 grid gap-4 rounded-lg border border-line bg-surface/40 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input label="Title" value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <Input
          label="Slug"
          value={form.slug ?? ''}
          placeholder={autoSlug}
          maxLength={80}
          onChange={(e) => set('slug', e.target.value.toLowerCase())}
          hint={`${BLOG_URL}/${form.slug || autoSlug}${post?.published_at ? ' · old URL keeps redirecting if changed' : ''}`}
        />
        <div className="space-y-1.5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Cover image URL" value={form.cover_image_url ?? ''} placeholder="https://…"
                onChange={(e) => set('cover_image_url', e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" className="mb-px h-[50px]" onClick={() => coverFileRef.current?.click()}
              disabled={!!busy} aria-label="Upload cover image">
              <Upload size={14} />
            </Button>
            <input ref={coverFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
              onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? []), 'cover'); e.target.value = ''; }} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Textarea label="Excerpt" rows={2} maxLength={300} value={form.excerpt ?? ''}
            onChange={(e) => set('excerpt', e.target.value)} hint="Optional. Blank = first ~160 characters of the post." />
        </div>
        <div className="md:col-span-2">
          <p className="mb-1.5 font-mono text-xs uppercase tracking-wider text-muted">
            Tags <span className="text-subtle">({form.tags.length}/{MAX_TAGS})</span>
            <Link to="/blog/tags" className="ml-3 normal-case tracking-normal text-neon underline underline-offset-2">manage</Link>
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tags">
            {allTags.length === 0 && <span className="font-mono text-xs text-subtle">No tags yet.</span>}
            {allTags.map((t) => {
              const on = form.tags.includes(t.slug);
              return (
                <TagButton key={t.id} active={on} onClick={() => toggleTag(t.slug)}
                  disabled={!on && form.tags.length >= MAX_TAGS}>
                  {t.name}
                </TagButton>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" className="accent-neon" checked={form.comments_enabled}
            onChange={(e) => set('comments_enabled', e.target.checked)} />
          Allow comments
        </label>
        {post?.status !== 'published' && (
          <Input label="Schedule (optional)" type="datetime-local" value={schedule}
            onChange={(e) => setSchedule(e.target.value)} hint="Blank = publish immediately" />
        )}
        {post?.published_at && (
          <p className="font-mono text-xs text-subtle md:col-span-2">
            Published {formatDateTime(post.published_at)} · updated {formatDateTime(post.updated_at)}
            {post.pending_comments > 0 && (
              <Link to="/blog/comments" className="ml-2 text-warning hover:underline">{post.pending_comments} pending comment(s)</Link>
            )}
          </p>
        )}
      </section>

      {/* editor (BLG-31) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="Editor view">
          {([
            ['split', Columns2, 'Split', 'hidden lg:inline-flex'],
            ['write', PenLine, 'Write', ''],
            ['preview', Eye, 'Preview', ''],
          ] as const).map(([v, Icon, label, cls]) => (
            <TagButton key={v} active={view === v} onClick={() => setView(v)} className={cls}>
              <Icon size={12} className="mr-1.5" /> {label}
            </TagButton>
          ))}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-subtle">
          <span>{words} words · {Math.max(1, Math.ceil(words / 200))} min read</span>
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'upload' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Image
          </Button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? []), 'content'); e.target.value = ''; }} />
        </div>
      </div>

      <div className={cn('grid gap-4', view === 'split' && 'lg:grid-cols-2')}>
        {view !== 'preview' && (
          <div>
            <label htmlFor="post-content" className="sr-only">Content (Markdown)</label>
            <textarea
              id="post-content"
              ref={textareaRef}
              value={form.content_md}
              onChange={(e) => set('content_md', e.target.value)}
              onDrop={onDrop}
              onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
              onDragLeave={() => setDragOver(false)}
              onPaste={onPaste}
              placeholder={'The title is shown automatically: start with an intro or a ## section.\n\nDrop or paste images here.'}
              spellCheck
              className={cn(
                'h-[70vh] w-full resize-none rounded-lg border bg-bg p-4 font-mono text-sm leading-6 text-fg-strong',
                'placeholder:text-subtle focus:border-neon/50 focus:outline-none',
                dragOver ? 'border-neon shadow-glow' : 'border-line',
              )}
            />
          </div>
        )}
        {view !== 'write' && (
          <article
            aria-label="Preview"
            className={cn('h-[70vh] overflow-y-auto rounded-lg border border-line bg-surface/40 p-6', view === 'split' && 'hidden lg:block')}
          >
            {form.cover_image_url && <img src={form.cover_image_url} alt="" className="mb-6 w-full rounded-lg border border-line" />}
            <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-fg-strong">{form.title || 'Untitled'}</h1>
            <MarkdownRenderer markdown={form.content_md} />
          </article>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete post?"
        message={`"${form.title}" and all its comments will be permanently deleted.`}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
