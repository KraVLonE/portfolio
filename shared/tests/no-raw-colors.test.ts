/**
 * NFR-01 guard: blog-era UI must use theme tokens (bg-surface, text-neon, ...)
 * instead of raw colours. Existing pre-blog components are not scanned (not migrated yet).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
// Add new UI directories here as they are created.
const GUARDED = ['shared/ui', 'shared/markdown', 'web-blog/src', 'admin-portfolio/src/pages/blog', 'web-portfolio/src/blog'];

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RULES: [string, RegExp][] = [
  ['hex colour', /#[0-9a-fA-F]{3,8}\b/],
  ['rgb()/hsl() colour', /\b(?:rgba?|hsla?)\(/],
  ['raw Tailwind palette class', new RegExp(`\\b[a-z-]+-(?:${PALETTE})-\\d{2,3}\\b`)],
  ['white/black class', /\b(?:text|bg|border|from|to|via|ring|fill|stroke)-(?:white|black)\b/],
];

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}

export function findViolations(source: string): string[] {
  return source.split('\n').flatMap((line, i) =>
    RULES.filter(([, re]) => re.test(line)).map(([what]) => `line ${i + 1}: ${what}: ${line.trim()}`),
  );
}

describe('no raw colours in guarded UI', () => {
  const scanned = GUARDED.flatMap((d) => files(join(ROOT, d)));

  it('scans at least the shared primitives', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(5);
  });

  it.each(scanned.map((f) => [relative(ROOT, f), f]))('%s', (_, file) => {
    expect(findViolations(readFileSync(file, 'utf8'))).toEqual([]);
  });

  it('detector catches each kind of raw colour', () => {
    for (const bad of ['color: #0ff;', 'rgba(1,2,3,.4)', 'text-cyan-400', 'hover:bg-slate-900/50', 'text-white']) {
      expect(findViolations(bad), bad).not.toEqual([]);
    }
    expect(findViolations('text-neon bg-surface border-neon/40 shadow-glow')).toEqual([]);
  });
});
