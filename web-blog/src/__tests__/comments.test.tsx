import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Comments } from '../components/Comments';
import { ApiError, blog } from '../api';

vi.mock('../api', async (orig) => {
  const mod = await orig<typeof import('../api')>();
  return { ...mod, blog: Object.fromEntries(Object.keys(mod.blog).map((k) => [k, vi.fn()])) };
});
const api = vi.mocked(blog);
afterEach(cleanup);

describe('Comments', () => {
  it('BLG-44 shows approved comments with author badge and safe markdown', async () => {
    api.comments.mockResolvedValue([
      { id: 1, display_name: 'Ana', body: 'Nice **one** <img src=x onerror=alert(1)>', is_author: false, created_at: '2026-01-01T00:00:00Z' },
      { id: 2, display_name: 'kravlone', body: 'Thanks!', is_author: true, created_at: '2026-01-02T00:00:00Z' },
    ]);
    render(<Comments slug="p" enabled />);
    expect((await screen.findByText('one')).tagName).toBe('STRONG');
    expect(document.querySelector('[onerror], img')).toBeNull();
    expect(screen.getByText('author')).toBeTruthy();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Ana'), expect.stringContaining('kravlone'),
    ]);
  });

  it('BLG-41/42 submits with timing + empty honeypot, shows moderation notice', async () => {
    api.comments.mockResolvedValue([]);
    api.addComment.mockResolvedValue({ status: 'pending', message: 'Comment submitted — visible after review.' });
    const user = userEvent.setup();
    render(<Comments slug="my-post" enabled />);
    await user.type(await screen.findByLabelText('Name (optional)'), ' Ana ');
    await user.type(screen.getByLabelText('Comment'), 'Great post');
    await user.click(screen.getByRole('button', { name: /post comment/i }));
    expect((await screen.findByRole('status')).textContent).toContain('visible after review');
    const [slug, data] = api.addComment.mock.calls[0];
    expect(slug).toBe('my-post');
    expect(data).toMatchObject({ body: 'Great post', display_name: 'Ana', website: undefined });
    expect(typeof data.form_ms).toBe('number');
    expect((screen.getByLabelText('Comment') as HTMLTextAreaElement).value).toBe('');
  });

  it('honeypot is hidden from assistive tech and keyboard', async () => {
    api.comments.mockResolvedValue([]);
    render(<Comments slug="p" enabled />);
    await screen.findByLabelText('Comment');
    expect(screen.queryByRole('textbox', { name: 'Website' })).toBeNull(); // aria-hidden subtree
    expect(document.getElementById('cm-website')).not.toBeNull();
    expect(document.getElementById('cm-website')?.getAttribute('tabindex')).toBe('-1');
  });

  it('BLG-42 rate limit gives a friendly message', async () => {
    api.comments.mockResolvedValue([]);
    api.addComment.mockRejectedValue(new ApiError(429, 'Rate limit exceeded'));
    const user = userEvent.setup();
    render(<Comments slug="p" enabled />);
    await user.type(await screen.findByLabelText('Comment'), 'hello');
    await user.click(screen.getByRole('button', { name: /post comment/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/too many comments/i);
  });

  it('BLG-45 closed comments: no form', async () => {
    api.comments.mockResolvedValue([]);
    render(<Comments slug="p" enabled={false} />);
    await waitFor(() => expect(screen.getByText(/comments are closed/i)).toBeTruthy());
    expect(screen.queryByRole('form')).toBeNull();
  });
});
