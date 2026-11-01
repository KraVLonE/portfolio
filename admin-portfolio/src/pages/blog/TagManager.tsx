import { useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button, Input } from '@kravlone/shared/ui';
import { ConfirmModal } from '../../components/ConfirmModal';
import { blogApi, type Tag } from './blogApi';
import { errorMessage, slugify } from './editorUtils';
import { EmptyState, ErrorBanner, PageHeader } from './parts';

/** BLG-34: managed tag list so `GenAI` / `gen-ai` duplicates can't happen. */
export default function TagManager() {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string; slug: string } | null>(null);
  const [toDelete, setToDelete] = useState<Tag | null>(null);
  const [error, setError] = useState('');

  const load = () => blogApi.listTags().then(setTags).catch((e) => setError(errorMessage(e)));
  useEffect(() => { void load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await blogApi.createTag(name.trim());
      setName('');
      setError('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await blogApi.updateTag(editing.id, editing.name.trim(), editing.slug.trim());
      setEditing(null);
      setError('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async () => {
    const tag = toDelete;
    setToDelete(null);
    if (!tag) return;
    try {
      await blogApi.deleteTag(tag.id, tag.post_count > 0);
      setError('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tags" label="TOPICS" />
      <ErrorBanner message={error} />

      <form onSubmit={create} className="mb-6 flex items-end gap-2">
        <div className="flex-1">
          <Input label="New tag" value={name} maxLength={40} placeholder="e.g. GenAI"
            onChange={(e) => setName(e.target.value)} hint={name ? `slug: ${slugify(name, 40) || '—'}` : undefined} />
        </div>
        <Button type="submit" size="sm" className={name ? 'mb-[22px] h-[50px]' : 'mb-px h-[50px]'} disabled={!name.trim()}>
          <Plus size={14} /> Add
        </Button>
      </form>

      {tags === null ? (
        <p className="font-mono text-sm text-subtle">Loading…</p>
      ) : tags.length === 0 ? (
        <EmptyState>No tags yet. Add topics like genai, backend, devops.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface/40">
          {tags.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              {editing?.id === t.id ? (
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <Input label="Name" value={editing.name} maxLength={40} autoFocus
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div className="min-w-40 flex-1">
                    <Input label="Slug" value={editing.slug} maxLength={40}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} />
                  </div>
                  <Button size="sm" className="mb-px h-[50px]" onClick={saveEdit} aria-label="Save tag"><Check size={14} /></Button>
                  <Button size="sm" variant="ghost" className="mb-px h-[50px]" onClick={() => setEditing(null)} aria-label="Cancel"><X size={14} /></Button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-semibold text-fg-strong">{t.name}</span>
                    <span className="ml-3 font-mono text-xs text-subtle">{t.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted">{t.post_count} post{t.post_count === 1 ? '' : 's'}</span>
                    <Button size="sm" variant="ghost" aria-label={`Edit ${t.name}`}
                      onClick={() => setEditing({ id: t.id, name: t.name, slug: t.slug })}><Pencil size={14} /></Button>
                    <Button size="sm" variant="danger" aria-label={`Delete ${t.name}`} onClick={() => setToDelete(t)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Delete tag?"
        message={
          toDelete?.post_count
            ? `"${toDelete.name}" is used by ${toDelete.post_count} post(s). It will be removed from them.`
            : `"${toDelete?.name}" will be deleted.`
        }
        confirmText={toDelete?.post_count ? 'Detach & delete' : 'Delete'}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
