import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MarkdownRenderer, extractToc, shouldShowToc } from '../markdown';

afterEach(cleanup);

const html = (md: string) => render(<MarkdownRenderer markdown={md} />).container;

describe('BLG-20 GFM', () => {
  it('renders tables, task lists, strikethrough, lists, quotes', () => {
    const c = html('| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~\n\n> quote\n\n1. one');
    expect(c.querySelector('.md-table table td')?.textContent).toBe('1');
    expect(c.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
    expect(c.querySelector('del')?.textContent).toBe('old');
    expect(c.querySelector('blockquote')).not.toBeNull();
    expect(c.querySelector('ol li')?.textContent).toBe('one');
  });
});

describe('BLG-22 raw HTML and unsafe URLs never render', () => {
  it.each([
    '<script>window.__pwned = 1</script>',
    '<img src=x onerror="window.__pwned=1">',
    '<iframe src="https://evil.example"></iframe>',
    '<a href="https://x" onclick="alert(1)">x</a>',
  ])('drops %s', (payload) => {
    const c = html(`before\n\n${payload}\n\nafter`);
    expect(c.querySelector('script, iframe, [onerror], [onclick]')).toBeNull();
    expect(c.innerHTML).not.toMatch(/onerror|onclick|<script/i);
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'vbscript:x', 'data:text/html;base64,PHNjcmlwdD4='])(
    'strips %s from links and images',
    (url) => {
      const c = html(`[link](${url}) ![img](${url})`);
      for (const el of Array.from(c.querySelectorAll('a, img'))) {
        const v = el.getAttribute('href') ?? el.getAttribute('src') ?? '';
        expect(v.toLowerCase()).not.toMatch(/^(javascript|vbscript|data):/);
      }
    },
  );
});

describe('BLG-24 links', () => {
  it('external links open in new tab with noopener noreferrer', () => {
    const a = html('[gh](https://github.com)').querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('internal and anchor links stay in the tab', () => {
    const [rel, anchor] = Array.from(html('[a](/other-post) [b](#intro)').querySelectorAll('a'));
    expect(rel.hasAttribute('target')).toBe(false);
    expect(anchor.hasAttribute('target')).toBe(false);
  });
});

describe('BLG-21 code blocks', () => {
  it('highlights known languages and tolerates unknown ones', () => {
    const c = html('```python\ndef f(): return 1\n```\n\n```notalang\nraw\n```');
    expect(c.querySelector('pre code.hljs .hljs-keyword')?.textContent).toBe('def');
    expect(c.querySelectorAll('pre')).toHaveLength(2);
  });

  it('copy button copies the code text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MarkdownRenderer markdown={'```js\nconst x = 1;\n```'} />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy code' })));
    expect(writeText).toHaveBeenCalledWith('const x = 1;\n');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('image with stripped (unsafe) URL renders no <img src="">', () => {
    const c = html('![diagram](javascript:alert(1))');
    expect(c.querySelector('img')).toBeNull();
    expect(c.textContent).toContain('[image: diagram]');
  });

  it('images are lazy and always have alt', () => {
    const img = html('![](https://x/y.png)').querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.hasAttribute('alt')).toBe(true);
  });
});

describe('BLG-23 table of contents', () => {
  const md = [
    '# Title',
    '## Getting **Started**',
    '```md\n## not a heading\n```',
    '### Install `pip`',
    '## Usage',
    '## Usage',
    '#### deep',
    '## [Links](https://x) & more',
  ].join('\n\n');

  it('extracts ## and ### with plain text, skips code blocks', () => {
    expect(extractToc(md)).toEqual([
      { id: 'getting-started', text: 'Getting Started', depth: 2 },
      { id: 'install-pip', text: 'Install pip', depth: 3 },
      { id: 'usage', text: 'Usage', depth: 2 },
      { id: 'usage-1', text: 'Usage', depth: 2 },
      { id: 'links--more', text: 'Links & more', depth: 2 },
    ]);
  });

  it('TOC ids match the ids rendered on headings', () => {
    const rendered = Array.from(html(md).querySelectorAll('h2, h3')).map((h) => h.id);
    expect(rendered).toEqual(extractToc(md).map((t) => t.id));
  });

  it('only shows for ≥3 h2 sections', () => {
    expect(shouldShowToc(extractToc('## a\n\n## b'))).toBe(false);
    expect(shouldShowToc(extractToc('## a\n\n## b\n\n### c\n\n## d'))).toBe(true);
  });
});
