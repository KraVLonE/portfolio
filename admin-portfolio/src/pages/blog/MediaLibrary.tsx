import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Check, Copy, Loader2, Trash2, Upload } from 'lucide-react';
import { Button, Card, cn } from '@kravlone/shared/ui';
import { ConfirmModal } from '../../components/ConfirmModal';
import { blogApi, type BlogImage } from './blogApi';
import { errorMessage, formatDate, imageMarkdown } from './editorUtils';
import { EmptyState, ErrorBanner, PageHeader } from './parts';

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

/** BLG-36 media library: upload, copy Markdown, delete when unused. */
export default function MediaLibrary() {
  const [images, setImages] = useState<BlogImage[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<BlogImage | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => blogApi.listImages().then(setImages).catch((e) => setError(errorMessage(e)));
  useEffect(() => { void load(); }, []);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    const errors: string[] = [];
    for (const f of files) {
      try { await blogApi.uploadImage(f); } catch (e) { errors.push(`${f.name}: ${errorMessage(e)}`); }
    }
    setUploading(false);
    setError(errors.join(' · '));
    await load();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void upload(Array.from(e.dataTransfer.files));
  };

  const copy = async (img: BlogImage) => {
    try {
      await navigator.clipboard.writeText(imageMarkdown(img.url, img.filename));
      setCopied(img.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError('Clipboard blocked by the browser');
    }
  };

  const remove = async () => {
    const img = toDelete;
    setToDelete(null);
    if (!img) return;
    try {
      await blogApi.deleteImage(img.id, img.used_in.length > 0);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="animate-fade-in" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <PageHeader
        title="Media"
        label="IMAGES"
        actions={
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
          </Button>
        }
      />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
        onChange={(e) => { void upload(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <ErrorBanner message={error} />
      <p className="mb-4 font-mono text-xs text-subtle">JPEG, PNG, WebP or GIF · max 5 MB · drop files anywhere on this page</p>

      {images === null ? (
        <p className="font-mono text-sm text-subtle">Loading…</p>
      ) : images.length === 0 ? (
        <EmptyState>No images yet.</EmptyState>
      ) : (
        <ul className={cn('grid grid-cols-2 gap-4 md:grid-cols-3', dragOver && 'opacity-60')}>
          {images.map((img) => (
            <li key={img.id}>
              <Card className="overflow-hidden p-0">
                <img src={img.url} alt={img.filename} loading="lazy" className="aspect-video w-full bg-bg object-cover" />
                <div className="space-y-2 p-3">
                  <p className="font-mono text-[10px] text-subtle">
                    {kb(img.size_bytes)} · {formatDate(img.created_at)}
                    {img.used_in.length > 0 ? <span className="text-neon"> · in {img.used_in.join(', ')}</span> : ' · unused'}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => copy(img)}>
                      {copied === img.id ? <Check size={12} /> : <Copy size={12} />} {copied === img.id ? 'Copied' : 'Markdown'}
                    </Button>
                    <Button size="sm" variant="danger" aria-label={`Delete ${img.filename}`} onClick={() => setToDelete(img)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Delete image?"
        message={
          toDelete?.used_in.length
            ? `Used in: ${toDelete.used_in.join(', ')}. Those posts will show a broken image.`
            : 'The file will be permanently deleted.'
        }
        confirmText={toDelete?.used_in.length ? 'Delete anyway' : 'Delete'}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
