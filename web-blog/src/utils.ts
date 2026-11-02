import type { PostSummary } from './api';

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const relativeTime = (iso: string, now = Date.now()) => {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month']];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let v = s;
  for (const [step, unit] of units) {
    if (Math.abs(v) < step) return rtf.format(-v, unit);
    v = Math.round(v / step);
  }
  return rtf.format(-v, 'year');
};

/** BLG-05: show "Updated" only if edited more than a day after publishing. */
export const wasUpdated = (publishedAt: string, updatedAt: string) =>
  new Date(updatedAt).getTime() - new Date(publishedAt).getTime() > 24 * 60 * 60 * 1000;

/** BLG-12: split a newest-first list into year groups. */
export function groupByYear(posts: PostSummary[]): { year: number; posts: PostSummary[] }[] {
  const groups: { year: number; posts: PostSummary[] }[] = [];
  for (const p of posts) {
    const year = new Date(p.published_at).getFullYear();
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.posts.push(p);
    else groups.push({ year, posts: [p] });
  }
  return groups;
}

export function setPageMeta(title: string, description?: string) {
  document.title = title;
  if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}
