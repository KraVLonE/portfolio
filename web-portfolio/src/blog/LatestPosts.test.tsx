// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LatestPosts } from './LatestPosts';

afterEach(cleanup);

describe('BLG-50 homepage Latest Posts', () => {
  it('renders nothing without posts', () => {
    const { container } = render(<LatestPosts posts={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('links each post and "All posts" to the blog subdomain', () => {
    render(<LatestPosts posts={[{ id: 1, title: 'RAG', slug: 'rag', excerpt: 'e', published_at: '2026-01-01T00:00:00Z', reading_time_min: 2, tags: [{ slug: 'genai', name: 'GenAI' }] }]} />);
    expect(screen.getByRole('heading', { name: /latest posts/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'RAG' }).getAttribute('href')).toBe('https://blog.kravlone.xyz/rag');
    expect(screen.getByRole('link', { name: /all posts/i }).getAttribute('href')).toBe('https://blog.kravlone.xyz');
  });
});
