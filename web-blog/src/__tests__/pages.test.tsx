import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BlogIndex from '../pages/BlogIndex';
import PostPage from '../pages/PostPage';
import { ApiError, blog } from '../api';
import { cacheClear, primeFromDocument } from '../cache';
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
  cacheClear();
  vi.clearAllMocks();
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
    cacheClear(); // a first-ever load that fails (cached data would otherwise be shown)
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

describe('no loading flash (reported bug)', () => {
  const page = (titles: string[]) => ({
    items: titles.map((t, i) => summary(i + 1, t, '2026-02-01T00:00:00Z')), page: 1, per_page: 10, total: titles.length, pages: 1,
  });

  it('refresh: server-embedded data renders on first paint, no skeleton', () => {
    api.posts.mockReturnValue(new Promise(() => {})); // network never answers
    const el = document.createElement('script');
    el.id = 'blog-data';
    el.type = 'application/json';
    el.textContent = JSON.stringify({ 'posts|1|': page(['Embedded']), tags: [{ slug: 'genai', name: 'GenAI', post_count: 1 }] });
    document.body.appendChild(el);
    primeFromDocument();
    expect(document.getElementById('blog-data')).toBeNull();
    at('/');
    expect(screen.getByRole('link', { name: 'Embedded' })).toBeTruthy(); // synchronous: first render
    expect(screen.getByRole('button', { name: /#genai/ })).toBeTruthy();
    expect(screen.queryByLabelText('Loading posts')).toBeNull();
  });

  it('back navigation: cached list renders instantly, then revalidates', async () => {
    api.posts.mockResolvedValueOnce(page(['First load']));
    at('/');
    await screen.findByRole('link', { name: 'First load' });
    cleanup();
    let resolve!: (v: unknown) => void;
    api.posts.mockReturnValueOnce(new Promise((r) => { resolve = r; }) as never);
    at('/');
    expect(screen.getByRole('link', { name: 'First load' })).toBeTruthy(); // from cache, no skeleton
    expect(screen.queryByLabelText('Loading posts')).toBeNull();
    resolve(page(['Fresh']));
    expect(await screen.findByRole('link', { name: 'Fresh' })).toBeTruthy();
  });

  it('filter switch keeps the current list (dimmed) instead of a skeleton', async () => {
    api.posts.mockResolvedValueOnce(page(['All posts list']));
    const user = userEvent.setup();
    at('/');
    await screen.findByRole('link', { name: 'All posts list' });
    let resolve!: (v: unknown) => void;
    api.posts.mockReturnValueOnce(new Promise((r) => { resolve = r; }) as never);
    await user.click(screen.getByRole('button', { name: /#genai/ }));
    expect(screen.getByRole('link', { name: 'All posts list' })).toBeTruthy();
    expect(screen.queryByLabelText('Loading posts')).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    resolve(page(['Genai only']));
    expect(await screen.findByRole('link', { name: 'Genai only' })).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('post page never shows the previous post while the next loads', async () => {
    const a = fullPost({ title: 'Post A', slug: 'a', related: [summary(2, 'B', '2026-01-01T00:00:00Z')] });
    api.post.mockImplementation((slug: string) => (slug === 'a' ? Promise.resolve(a) : new Promise(() => {})) as never);
    const user = userEvent.setup();
    at('/a');
    await screen.findByRole('heading', { level: 1, name: 'Post A' });
    await user.click(screen.getByRole('link', { name: 'B' }));
    expect(screen.getByTestId('where').textContent).toBe('/b');
    expect(screen.queryByRole('heading', { level: 1, name: 'Post A' })).toBeNull();
    expect(screen.getByLabelText('Loading post')).toBeTruthy();
  });
});

describe('PostCard thumbnail (requested)', () => {
  it('shows the cover on the right of index cards only when present', async () => {
    api.posts.mockResolvedValue({
      items: [{ ...summary(1, 'With cover', '2026-02-01T00:00:00Z'), cover_image_url: 'https://blog.test/media/c.png' },
              summary(2, 'No cover', '2026-01-01T00:00:00Z')],
      page: 1, per_page: 10, total: 2, pages: 1,
    });
    at('/');
    const withCover = (await screen.findByRole('link', { name: 'With cover' })).closest('div.relative')!;
    const img = withCover.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://blog.test/media/c.png');
    expect(img.getAttribute('alt')).toBe('');
    expect(withCover.lastElementChild).toBe(img); // right-hand side
    expect(screen.getByRole('link', { name: 'No cover' }).closest('div.relative')!.querySelector('img')).toBeNull();
  });

  it('compact related cards stay text-only', async () => {
    api.post.mockResolvedValue(fullPost({
      related: [{ ...summary(7, 'Related one', '2026-01-01T00:00:00Z'), cover_image_url: 'https://x/c.png' }],
    }));
    at('/rag-agents');
    const card = (await screen.findByRole('link', { name: 'Related one' })).closest('div.relative')!;
    expect(card.querySelector('img')).toBeNull();
  });
});

describe('prefetch on intent', () => {
  it('hovering a card fetches the post once; opening it renders without a skeleton', async () => {
    api.posts.mockResolvedValue({ items: [summary(1, 'Hover me', '2026-02-01T00:00:00Z')], page: 1, per_page: 10, total: 1, pages: 1 });
    api.post.mockResolvedValue(fullPost({ title: 'Hover me', slug: 'hover-me' }));
    const user = userEvent.setup();
    at('/');
    const link = await screen.findByRole('link', { name: 'Hover me' });
    await user.hover(link);
    await user.hover(link);
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    await user.click(link);
    expect(screen.getByRole('heading', { level: 1, name: 'Hover me' })).toBeTruthy();
    expect(screen.queryByLabelText('Loading post')).toBeNull();
  });
});
