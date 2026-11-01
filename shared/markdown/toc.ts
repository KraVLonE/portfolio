import GithubSlugger from 'github-slugger';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toString } from 'mdast-util-to-string';
import type { Heading, Nodes } from 'mdast';

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

/**
 * Headings for the table of contents (BLG-23).
 * Slugs ALL headings in document order with the same slugger rehype-slug uses,
 * so ids (incl. "-1" duplicates) match the rendered anchors exactly.
 */
export function extractToc(md: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  const walk = (node: Nodes) => {
    if (node.type === 'heading') {
      const h = node as Heading;
      const text = toString(h);
      const id = slugger.slug(text);
      if (h.depth === 2 || h.depth === 3) items.push({ id, text, depth: h.depth });
      return;
    }
    if ('children' in node) node.children.forEach((c) => walk(c as Nodes));
  };
  walk(fromMarkdown(md ?? ''));
  return items;
}

/** BLG-23: show a TOC only for posts with at least 3 `##` sections. */
export const shouldShowToc = (toc: TocItem[]) => toc.filter((t) => t.depth === 2).length >= 3;
