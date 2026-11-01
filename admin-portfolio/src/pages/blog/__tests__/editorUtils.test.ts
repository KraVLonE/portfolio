import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMPTY_FORM, clearDraft, effectiveStatus, errorMessage, imageMarkdown, insertAtCursor, isDirty, loadDraft,
  normalizeForm, saveDraft, slugify,
} from '../editorUtils';

describe('errorMessage', () => {
  it('formats FastAPI 422 arrays with field names', () => {
    const err = { response: { data: { detail: [{ loc: ['body', 'title'], msg: 'too long' }, { msg: 'bad' }] } } };
    expect(errorMessage(err)).toBe('title: too long; bad');
  });
  it('passes string details through', () => {
    expect(errorMessage({ response: { data: { detail: 'Slug taken' } } })).toBe('Slug taken');
  });
  it('falls back to message / generic', () => {
    expect(errorMessage({ message: 'Network Error' })).toBe('Network Error');
    expect(errorMessage({ response: { status: 413 } })).toBe('File too large');
    expect(errorMessage(undefined)).toBe('Something went wrong');
  });
});

describe('slugify mirrors backend', () => {
  it.each([
    ['Hello World', 'hello-world'],
    ['  RAG -- with LangGraph!! ', 'rag-with-langgraph'],
    ['Café déjà vu', 'cafe-deja-vu'],
    ['C++ & Rust: 2026', 'c-rust-2026'],
  ])('%s', (t, s) => expect(slugify(t)).toBe(s));
});

describe('dirty tracking', () => {
  it('treats blank strings and null as equal, trims title', () => {
    expect(isDirty({ ...EMPTY_FORM, slug: '', excerpt: '  ', title: ' ' }, EMPTY_FORM)).toBe(false);
    expect(isDirty({ ...EMPTY_FORM, content_md: 'x' }, EMPTY_FORM)).toBe(true);
    expect(normalizeForm({ ...EMPTY_FORM, cover_image_url: ' https://x ' }).cover_image_url).toBe('https://x');
  });
});

describe('insertAtCursor', () => {
  it('puts images on their own line and returns caret after insert', () => {
    const r = insertAtCursor('abcdef', 3, 3, '![i](u)');
    expect(r.value).toBe('abc\n![i](u)\ndef');
    expect(r.caret).toBe('abc\n![i](u)\n'.length);
  });
  it('replaces the selection, no extra newlines at edges', () => {
    expect(insertAtCursor('', 0, 0, 'X').value).toBe('X');
    expect(insertAtCursor('a\nSEL\nb', 2, 5, 'X').value).toBe('a\nX\nb');
  });
  it('builds alt text from filename without brackets', () => {
    expect(imageMarkdown('https://m/1.png', 'my [diagram].png')).toBe('![my diagram](https://m/1.png)');
  });
});

describe('BLG-33 local drafts', () => {
  beforeEach(() => localStorage.clear());
  it('round-trips and clears', () => {
    saveDraft(7, { ...EMPTY_FORM, title: 'T' }, 123);
    expect(loadDraft(7)).toEqual({ form: { ...EMPTY_FORM, title: 'T' }, savedAt: 123 });
    clearDraft(7);
    expect(loadDraft(7)).toBeNull();
  });
  it('ignores corrupt storage', () => {
    localStorage.setItem('blog-draft:new', '{not json');
    expect(loadDraft('new')).toBeNull();
    localStorage.setItem('blog-draft:new', JSON.stringify({ savedAt: 'x' }));
    expect(loadDraft('new')).toBeNull();
  });
});

describe('effectiveStatus', () => {
  it('future published = scheduled', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(effectiveStatus('published', '2026-02-01T00:00:00Z', now)).toBe('scheduled');
    expect(effectiveStatus('published', '2025-12-01T00:00:00Z', now)).toBe('published');
    expect(effectiveStatus('draft', '2026-02-01T00:00:00Z', now)).toBe('draft');
  });
});
