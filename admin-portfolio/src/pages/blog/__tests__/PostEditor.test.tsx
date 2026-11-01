import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PostEditor from '../PostEditor';
import { blogApi, type Post } from '../blogApi';
import { saveDraft, EMPTY_FORM } from '../editorUtils';

vi.mock('../blogApi', async (orig) => {
  const mod = await orig<typeof import('../blogApi')>();
  return { ...mod, blogApi: Object.fromEntries(Object.keys(mod.blogApi).map((k) => [k, vi.fn()])) };
});
const api = vi.mocked(blogApi);

const POST: Post = {
  id: 5, title: 'Existing', slug: 'existing', excerpt: 'ex', cover_image_url: null, tags: [{ slug: 'genai', name: 'GenAI' }],
  published_at: null, updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', reading_time_min: 1,
  status: 'draft', pending_comments: 0, content_md: '## Hello\n\n**bold**', comments_enabled: true, custom_excerpt: null,
};
const TAGS = [{ id: 1, slug: 'genai', name: 'GenAI', post_count: 1 }, { id: 2, slug: 'devops', name: 'DevOps', post_count: 0 }];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog/new" element={<PostEditor />} />
        <Route path="/blog/:id" element={<PostEditor />} />
        <Route path="/blog" element={<p>LIST PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  api.listTags.mockResolvedValue(TAGS);
  api.getPost.mockResolvedValue(POST);
});
afterEach(cleanup);

describe('PostEditor', () => {
  it('creates a draft with normalized payload and selected tags', async () => {
    api.createPost.mockResolvedValue({ ...POST, id: 9, title: 'My Post', slug: 'my-post' });
    const user = userEvent.setup();
    renderAt('/blog/new');
    await user.type(screen.getByLabelText('Title'), 'My Post');
    await user.type(screen.getByLabelText('Content (Markdown)'), '# Hi');
    await user.click(await screen.findByRole('button', { name: 'DevOps' }));
    await user.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(api.createPost).toHaveBeenCalledTimes(1));
    expect(api.createPost.mock.calls[0][0]).toEqual({
      ...EMPTY_FORM, title: 'My Post', content_md: '# Hi', tags: ['devops'],
    });
  });

  it('BLG-25 preview uses the shared renderer', async () => {
    const user = userEvent.setup();
    renderAt('/blog/5');
    await user.click(await screen.findByRole('button', { name: /preview/i }));
    const preview = screen.getByRole('article', { name: 'Preview' });
    expect(within(preview).getByRole('heading', { level: 2, name: 'Hello' }).id).toBe('hello');
    expect(preview.querySelector('.md-prose strong')?.textContent).toBe('bold');
  });

  it('publish saves pending edits first, then publishes', async () => {
    api.updatePost.mockResolvedValue({ ...POST, title: 'Existing!' });
    api.publishPost.mockResolvedValue({ ...POST, title: 'Existing!', status: 'published', published_at: '2026-01-02T00:00:00Z' });
    const user = userEvent.setup();
    renderAt('/blog/5');
    await user.type(await screen.findByLabelText('Title'), '!');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(api.publishPost).toHaveBeenCalledWith(5, null));
    expect(api.updatePost.mock.invocationCallOrder[0]).toBeLessThan(api.publishPost.mock.invocationCallOrder[0]);
    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeTruthy();
  });

  it('shows server validation errors', async () => {
    api.updatePost.mockRejectedValue({ response: { data: { detail: "Slug 'x' is already used by another post" } } });
    const user = userEvent.setup();
    renderAt('/blog/5');
    await user.type(await screen.findByLabelText('Title'), '?');
    await user.click(screen.getByRole('button', { name: /save draft/i }));
    expect((await screen.findByRole('alert')).textContent).toContain('already used');
  });

  it('BLG-33 offers to restore a newer local draft', async () => {
    saveDraft(5, { ...EMPTY_FORM, title: 'Local version', content_md: 'unsaved', tags: ['genai'] });
    const user = userEvent.setup();
    renderAt('/blog/5');
    await user.click(await screen.findByRole('button', { name: 'Restore' }));
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Local version');
  });

  it('BLG-33 no restore prompt when local draft equals server', async () => {
    saveDraft(5, { ...EMPTY_FORM, title: 'Existing', content_md: POST.content_md, tags: ['genai'], slug: 'existing' });
    renderAt('/blog/5');
    await screen.findByDisplayValue('Existing');
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull();
  });

  it('BLG-36 dropped image is uploaded and inserted as Markdown', async () => {
    api.uploadImage.mockResolvedValue({
      id: 1, filename: 'abc.png', url: 'https://blog/media/abc.png', content_type: 'image/png', size_bytes: 3,
      created_at: '', used_in: [],
    });
    renderAt('/blog/5');
    const ta = (await screen.findByLabelText('Content (Markdown)')) as HTMLTextAreaElement;
    const file = new File(['x'], 'diagram.png', { type: 'image/png' });
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.drop(ta, { dataTransfer: { files: [file], types: ['Files'] } });
    await waitFor(() => expect(ta.value).toContain('![diagram](https://blog/media/abc.png)'));
    expect(api.uploadImage).toHaveBeenCalledWith(file);
  });

  it('caps tag selection at 5', async () => {
    api.listTags.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({ id: i, slug: `t${i}`, name: `T${i}`, post_count: 0 })),
    );
    api.getPost.mockResolvedValue({ ...POST, tags: [] });
    const user = userEvent.setup();
    renderAt('/blog/5');
    for (let i = 0; i < 5; i++) await user.click(await screen.findByRole('button', { name: `T${i}` }));
    expect((screen.getByRole('button', { name: 'T5' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
