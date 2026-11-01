import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CommentBody } from '../markdown';

afterEach(cleanup);
const html = (md: string) => render(<CommentBody markdown={md} />).container;

describe('BLG-40 CommentBody', () => {
  it('keeps bold, italic, inline code, links', () => {
    const c = html('**b** _i_ `c` [l](https://x.com)');
    expect(c.querySelector('strong')?.textContent).toBe('b');
    expect(c.querySelector('em')?.textContent).toBe('i');
    expect(c.querySelector('code')?.textContent).toBe('c');
    expect(c.querySelector('a')?.getAttribute('rel')).toBe('nofollow ugc noopener noreferrer');
  });

  it('flattens headings, images, lists, code blocks to text', () => {
    const c = html('# Big\n\n![x](https://x/y.png)\n\n- item\n\n```\ncode\n```');
    expect(c.querySelector('h1, img, ul, li, pre')).toBeNull();
    expect(c.textContent).toContain('Big');
    expect(c.textContent).toContain('item');
  });

  it('drops raw HTML and javascript: links', () => {
    const c = html('<script>x</script><b onclick="y">z</b> [a](javascript:alert(1))');
    expect(c.querySelector('script, b, [onclick]')).toBeNull();
    expect(c.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/javascript/i);
  });
});
