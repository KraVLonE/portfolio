import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BlogIndex from '../pages/BlogIndex';
import PostPage from '../pages/PostPage';
import { ApiError, blog } from '../api';
import { fullPost, summary } from './fixtures';

vi.mock('../api', async (orig) => {
  const mod = await orig<typeof import('../api')>();
  return { ...mod, blog: Object.fromEntries(Object.keys(mod.blog).map((k) => [k, vi.fn()])) };
});
const api = vi.mocked(blog);

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
}
const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<BlogIndex />} />
        <Route path="/:slug" element={<PostPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

beforeEach(() => {
  api.tags.mockResolvedValue([{ slug: 'genai', name: 'GenAI', post_count: 2 }, { slug: 'devops', name: 'DevOps', post_count: 1 }]);
  api.comments.mockResolvedValue([]);
});
afterEach(cleanup);

describe('BlogIndex', () => {
  it('BLG-11/12 lists posts with year dividers', async () => {
    api.posts.mockResolvedValue({
      items: [summary(1, 'New', '2026-02-01T00:00:00Z'), summary(2, 'Old', '2025-06-01T00:00:00Z')],
      page: 1, per_page: 10, total: 2, pages: 1,
    });
    at('/');
    expect(await screen.findByRole('heading', { level: 2, name: '2026' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: '2025' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New' }).getAttribute('href')).toBe('/new');
    expect(api.posts).toHaveBeenCalledWith(1, null);
  });

  it('BLG-11 tag chip filters via shareable ?tag= URL and toggles off', async () => {
    api.posts.mockResolvedValue({ items: [], page: 1, per_page: 10, total: 0, pages: 1 });
    const user = userEvent.setup();
    at('/');
    await user.click(await screen.findByRole('button', { name: /#genai/ }));
    expect(screen.getByTestId('where').textContent).toBe('/?tag=genai');
    await waitFor(() => expect(api.posts).toHaveBeenLastCalledWith(1, 'genai'));
    expect(screen.getByRole('button', { name: /#genai/ }).getAttribute('aria-pressed')).toBe('true');
    expect(await screen.findByText(/No posts tagged/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /#genai/ }));
    expect(screen.getByTestId('where').textContent).toBe('/');
  });

  it('BLG-52 empty and error states', async () => {
    api.posts.mockResolvedValueOnce({ items: [], page: 1, per_page: 10, total: 0, pages: 1 });
    at('/');
    expect(await screen.findByText('No posts yet. Check back soon.')).toBeTruthy();
    cleanup();
    api.posts.mockRejectedValueOnce(new Error('down'));
    at('/');
    expect((await screen.findByRole('alert')).textContent).toMatch(/couldn't load/i);
  });

  it('pagination links keep the tag', async () => {
    api.posts.mockResolvedValue({ items: [summary(1, 'A', '2026-01-01T00:00:00Z')], page: 2, per_page: 10, total: 25, pages: 3 });
    at('/?tag=genai&page=2');
    expect((await screen.findByRole('link', { name: /older/i })).getAttribute('href')).toBe('/?tag=genai&page=3');
    expect(screen.getByRole('link', { name: /newer/i }).getAttribute('href')).toBe('/?tag=genai');
  });
});

describe('PostPage', () => {
  it('BLG-51 renders title, meta, content, TOC for ≥3 sections', async () => {
    api.post.mockResolvedValue(fullPost());
    at('/rag-agents');
    expect(await screen.findByRole('heading', { level: 1, name: 'RAG Agents' })).toBeTruthy();
    const toc = screen.getByRole('navigation', { name: 'Table of contents' });
    expect(within(toc).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#one', '#two', '#three']);
    expect(document.getElementById('two')?.tagName).toBe('H2');
    expect(screen.getByText('3 min read', { exact: false })).toBeTruthy();
    expect(screen.queryByText(/updated/)).toBeNull();
  });

  it('BLG-05 shows updated date when edited later', async () => {
    api.post.mockResolvedValue(fullPost({ updated_at: '2026-04-01T00:00:00Z' }));
    at('/rag-agents');
    expect(await screen.findByText(/updated/)).toBeTruthy();
  });

  it('BLG-23 no TOC for short posts', async () => {
    api.post.mockResolvedValue(fullPost({ content_md: '## Only one' }));
    at('/rag-agents');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('navigation', { name: 'Table of contents' })).toBeNull();
  });

  it('BLG-04 renamed slug -> URL replaced with canonical', async () => {
    api.post.mockResolvedValue(fullPost({ slug: 'rag-agents-v2' }));
    at('/old-slug');
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/rag-agents-v2'));
    expect(await screen.findByRole('heading', { level: 1, name: 'RAG Agents' })).toBeTruthy();
  });

  it('BLG-52 unknown slug -> themed 404', async () => {
    api.post.mockRejectedValue(new ApiError(404, 'Post not found'));
    at('/nope');
    expect(await screen.findByRole('heading', { name: 'Post not found' })).toBeTruthy();
  });

  it('BLG-13 related posts', async () => {
    api.post.mockResolvedValue(fullPost({ related: [summary(7, 'Vector DBs', '2026-01-01T00:00:00Z')] }));
    at('/rag-agents');
    expect(await screen.findByRole('link', { name: 'Vector DBs' })).toBeTruthy();
  });

  it('tag chip on a post goes to the filtered list', async () => {
    api.post.mockResolvedValue(fullPost());
    api.posts.mockResolvedValue({ items: [], page: 1, per_page: 10, total: 0, pages: 1 });
    const user = userEvent.setup();
    at('/rag-agents');
    await user.click(await screen.findByRole('button', { name: '#genai' }));
    expect(screen.getByTestId('where').textContent).toBe('/?tag=genai');
  });
});
