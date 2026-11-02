import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CommentModeration from '../CommentModeration';
import TagManager from '../TagManager';
import { blogApi, COMMENTS_CHANGED, type AdminComment } from '../blogApi';

vi.mock('../blogApi', async (orig) => {
  const mod = await orig<typeof import('../blogApi')>();
  return { ...mod, blogApi: Object.fromEntries(Object.keys(mod.blogApi).map((k) => [k, vi.fn()])) };
});
const api = vi.mocked(blogApi);
afterEach(cleanup);

const C: AdminComment = {
  id: 1, display_name: 'Ana', body: 'Great **post** <script>x</script>', is_author: false, created_at: '2026-01-01T00:00:00Z',
  status: 'pending', post_id: 3, post_title: 'RAG', post_slug: 'rag',
};

describe('BLG-35 CommentModeration', () => {
  it('approving removes it from the queue and notifies the badge', async () => {
    api.listComments.mockResolvedValue([C]);
    api.setCommentStatus.mockResolvedValue({ ...C, status: 'approved' });
    const onChange = vi.fn();
    window.addEventListener(COMMENTS_CHANGED, onChange);
    const user = userEvent.setup();
    render(<MemoryRouter><CommentModeration /></MemoryRouter>);
    expect((await screen.findByText('post')).tagName).toBe('STRONG');
    expect(document.querySelector('script')).toBeNull();
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(screen.queryByText('Ana')).toBeNull());
    expect(api.setCommentStatus).toHaveBeenCalledWith(1, 'approved');
    expect(onChange).toHaveBeenCalled();
    window.removeEventListener(COMMENTS_CHANGED, onChange);
  });

  it('BLG-46 author reply posts to the comment’s post', async () => {
    api.listComments.mockResolvedValue([C]);
    api.authorReply.mockResolvedValue({ ...C, id: 2, is_author: true, status: 'approved' });
    const user = userEvent.setup();
    render(<MemoryRouter><CommentModeration /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /reply/i }));
    await user.type(screen.getByLabelText(/reply on "RAG"/i), 'Thanks!');
    await user.click(screen.getByRole('button', { name: 'Post reply' }));
    expect(api.authorReply).toHaveBeenCalledWith(3, 'Thanks!');
  });

  it('switching tabs loads that status', async () => {
    api.listComments.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<MemoryRouter><CommentModeration /></MemoryRouter>);
    await screen.findByText(/inbox zero/i);
    await user.click(screen.getByRole('tab', { name: 'rejected' }));
    await waitFor(() => expect(api.listComments).toHaveBeenLastCalledWith('rejected'));
  });
});

describe('BLG-34 TagManager', () => {
  it('deleting a tag in use asks, then force-deletes', async () => {
    api.listTags.mockResolvedValue([{ id: 4, slug: 'genai', name: 'GenAI', post_count: 2 }]);
    api.deleteTag.mockResolvedValue({ status: 'deleted' });
    const user = userEvent.setup();
    render(<MemoryRouter><TagManager /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: 'Delete GenAI' }));
    expect(screen.getByText(/used by 2 post/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'DETACH & DELETE' }));
    expect(api.deleteTag).toHaveBeenCalledWith(4, true);
  });

  it('creates a tag and shows slug preview', async () => {
    api.listTags.mockResolvedValue([]);
    api.createTag.mockResolvedValue({ id: 1, slug: 'gen-ai', name: 'Gen AI', post_count: 0 });
    const user = userEvent.setup();
    render(<MemoryRouter><TagManager /></MemoryRouter>);
    await user.type(await screen.findByLabelText('New tag'), 'Gen AI');
    expect(screen.getByText('slug: gen-ai')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(api.createTag).toHaveBeenCalledWith('Gen AI');
  });
});
