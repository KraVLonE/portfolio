import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BlogPosts from '../BlogPosts';
import PostEditor from '../PostEditor';
import { blogApi, type Post } from '../blogApi';

vi.mock('../blogApi', async (orig) => {
  const mod = await orig<typeof import('../blogApi')>();
  return { ...mod, blogApi: Object.fromEntries(Object.keys(mod.blogApi).map((k) => [k, vi.fn()])) };
});
const api = vi.mocked(blogApi);

const base: Post = {
  id: 1, title: 'Live one', slug: 'live-one', excerpt: '', cover_image_url: null, tags: [{ slug: 'genai', name: 'GenAI' }],
  published_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
  reading_time_min: 1, status: 'published', pending_comments: 3, content_md: 'x', comments_enabled: true, custom_excerpt: null,
};

function Where() { return <output data-testid="where">{useLocation().pathname}</output>; }

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); api.listTags.mockResolvedValue([]); });
afterEach(cleanup);

describe('BLG-30 post list', () => {
  it('shows status (incl. scheduled), tags, pending comments; filters by status', async () => {
    api.listPosts.mockResolvedValue([
      base,
      { ...base, id: 2, title: 'Later', status: 'published', published_at: '2999-01-01T00:00:00Z', pending_comments: 0 },
      { ...base, id: 3, title: 'Draft one', status: 'draft', published_at: null, pending_comments: 0 },
    ]);
    const user = userEvent.setup();
    render(<MemoryRouter><BlogPosts /></MemoryRouter>);
    const live = (await screen.findByText('Live one')).closest('a')!;
    expect(live.getAttribute('href')).toBe('/blog/1');
    expect(live.textContent).toContain('published');
    expect(live.textContent).toContain('GenAI');
    expect(screen.getByTitle('Pending comments').textContent).toContain('3');
    expect(screen.getByText('Later').closest('a')!.textContent).toContain('scheduled');
    expect(screen.getByText('Draft one').closest('a')!.textContent).toContain('unpublished');
    expect(api.listPosts).toHaveBeenLastCalledWith(undefined);
    await user.click(screen.getByRole('button', { name: 'drafts' }));
    await waitFor(() => expect(api.listPosts).toHaveBeenLastCalledWith('draft'));
  });

  it('empty state links to a new post; New post is a link, not a nested button', async () => {
    api.listPosts.mockResolvedValue([]);
    render(<MemoryRouter><BlogPosts /></MemoryRouter>);
    expect((await screen.findByRole('link', { name: 'Write the first one' })).getAttribute('href')).toBe('/blog/new');
    const newPost = screen.getByRole('link', { name: /new post/i });
    expect(newPost.querySelector('button')).toBeNull();
  });
});

describe('BLG-31/32 editor views and actions', () => {
  const editor = () => render(
    <MemoryRouter initialEntries={['/blog/1']}>
      <Routes><Route path="/blog/:id" element={<PostEditor />} /><Route path="/blog" element={<p>LIST</p>} /></Routes>
      <Where />
    </MemoryRouter>,
  );

  it('BLG-31 write / preview toggle shows one pane at a time', async () => {
    api.getPost.mockResolvedValue(base);
    const user = userEvent.setup();
    editor();
    await user.click(await screen.findByRole('button', { name: /write/i }));
    expect(screen.getByLabelText('Content (Markdown)')).toBeTruthy();
    expect(screen.queryByRole('article', { name: 'Preview' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.queryByLabelText('Content (Markdown)')).toBeNull();
    expect(screen.getByRole('article', { name: 'Preview' })).toBeTruthy();
  });

  it('BLG-32 unpublish, then delete with confirmation', async () => {
    api.getPost.mockResolvedValue(base);
    api.unpublishPost.mockResolvedValue({ ...base, status: 'draft' });
    api.deletePost.mockResolvedValue({ status: 'deleted' });
    const user = userEvent.setup();
    editor();
    await user.click(await screen.findByRole('button', { name: 'Unpublish' }));
    expect(api.unpublishPost).toHaveBeenCalledWith(1);
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete post' }));
    expect(screen.getByText(/permanently deleted/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'DELETE' }));
    expect(api.deletePost).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/blog'));
  });

  it('BLG-32 cancel on the confirm dialog keeps the post', async () => {
    api.getPost.mockResolvedValue(base);
    const user = userEvent.setup();
    editor();
    await user.click(await screen.findByRole('button', { name: 'Delete post' }));
    await user.click(screen.getByRole('button', { name: 'CANCEL' }));
    expect(api.deletePost).not.toHaveBeenCalled();
  });
});
