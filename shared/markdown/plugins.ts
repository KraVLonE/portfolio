import type { Processor } from 'unified';

/**
 * Turn off "setext" headings (text underlined with --- or ===). In standard Markdown a `---`
 * line directly under text makes that text an <h2>, which surprises authors who mean a rule.
 * With this, headings come only from `#`, and `---` is always a horizontal rule.
 */
export const NO_SETEXT = { disable: { null: ['setextUnderline'] } };

export function remarkNoSetext(this: Processor) {
  const data = this.data() as { micromarkExtensions?: unknown[] };
  (data.micromarkExtensions ??= []).push(NO_SETEXT);
}

/** Box-drawing characters (U+2500–U+257F) used by `tree` output and ASCII diagrams. */
export const BOX_DRAWING = /[\u2500-\u257F]/;

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Wrap text trees / box-drawing diagrams that were pasted without a code fence in one, so every
 * row keeps its own line and indentation (Markdown strips leading spaces inside paragraphs).
 * A "tree" = a blank-line-separated paragraph, outside any fence, with ≥2 box-drawing lines.
 * Mirrored by fence_text_trees() in portfolio-backend/app/blog/text.py for SEO/RSS parity.
 */
export function fenceTextTrees(md: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  let para: string[] = [];
  const flush = () => {
    if (para.filter((l) => BOX_DRAWING.test(l)).length >= 2) out.push('```text', ...para, '```');
    else out.push(...para);
    para = [];
  };
  for (const line of (md ?? '').split('\n')) {
    const m = line.match(FENCE);
    if (fence) {
      out.push(line);
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
    } else if (m) {
      flush();
      fence = m[1];
      out.push(line);
    } else if (line.trim() === '') {
      flush();
      out.push(line);
    } else {
      para.push(line);
    }
  }
  flush();
  return out.join('\n');
}
