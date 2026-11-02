# Design System — Cyberpunk

Read this before any UI change. Source of truth: `shared/theme.css` (tokens) and `shared/ui/` (components).

## Rules

1. **Use tokens, never raw colours.** `text-neon`, not `text-cyan-400` / `#22d3ee` / `rgba(...)`. Opacity modifiers are fine: `border-neon/40`, `bg-accent/10`.
2. **Use a primitive if one exists** (`Button`, `Card`, `Tag`, `TagButton`, `SectionHeading`, `Input`, `Textarea`). Extend it with a variant rather than restyling it inline.
3. **New colour or effect?** Add a token to `shared/theme.css` first, then use it. Don't invent one-offs.
4. Enforced by `shared/tests/no-raw-colors.test.ts` for: `shared/ui`, `web-blog/src`, `admin-portfolio/src/pages/blog`. Add new UI folders to its `GUARDED` list.
5. Pre-blog components (homepage, CLI, existing admin editors) still use raw Tailwind palette classes. They're not migrated yet, so don't copy their class strings into new code.

## Tokens

| Token | Utility examples | Value | Use for |
|---|---|---|---|
| `bg` | `bg-bg` | slate-950 | Page background, input fill |
| `surface` | `bg-surface`, `bg-surface/60` | slate-900 | Cards, panels, nav |
| `surface-raised` | `bg-surface-raised` | slate-800 | Hover state on surfaces |
| `line` | `border-line` | slate-800 | Default borders, dividers |
| `fg` | `text-fg` | slate-300 | Body text |
| `fg-strong` | `text-fg-strong` | white | Headings, emphasis, button text |
| `muted` | `text-muted` | slate-400 | Secondary text, metadata |
| `subtle` | `text-subtle` | slate-500/400 mix | Labels, placeholders, captions (≥ 4.5:1 on `bg`/`surface`) |
| `neon` | `text-neon`, `border-neon/50` | cyan-400 | Links, focus, active state, brand |
| `neon-strong` / `neon-deep` | `bg-neon-deep hover:bg-neon-strong` | cyan-600 / 700 | Primary button (white text ≥ 4.5:1) |
| `accent` / `accent-soft` | `text-accent-soft`, `from-neon to-accent` | pink-500 / 400 | Secondary highlight, destructive-ish actions |
| `success` / `warning` / `danger` | `text-danger` | emerald-400 / amber-400 / rose-500 | Status, form errors |
| `shadow-glow` / `-strong` / `-accent` | `hover:shadow-glow` | cyan/pink glow | Interactive hover, active chips |

## Type & motifs

- Body: Tailwind default sans. Labels, tags, code, metadata: `font-mono`.
- Section label motif: `Title // LABEL`, label inline in neon mono (built into `SectionHeading`). Small `// label` captions above blocks (e.g. `// contents`) use `text-[10px] uppercase tracking-[0.2em] text-subtle`.
- Brand gradient for one hero word per page max: `text-transparent bg-clip-text bg-gradient-to-r from-neon to-accent`.
- Radii: `rounded-md` for controls/tags, `rounded-lg` for cards.
- Focus: always visible, `outline-neon` (primitives handle it).

## Components

```tsx
import { Button, Card, SectionHeading, Tag, TagButton, Input, Textarea } from '@kravlone/shared/ui';

<SectionHeading label="writing">Blog</SectionHeading>
<Card interactive>…</Card>
<Button>Publish</Button> <Button variant="ghost">Preview</Button> <Button variant="danger" size="sm">Delete</Button>
<TagButton active={tag === 'genai'} onClick={…}>genai</TagButton>   {/* aria-pressed */}
<Input label="Title" error={errors.title} />                       {/* label + aria wired */}
```

Links that should look like buttons: `<Link className={buttonClass('primary', 'sm')}>` — never nest `<button>` inside `<a>`.

## Markdown

```tsx
import { MarkdownRenderer, CommentBody, extractToc, shouldShowToc } from '@kravlone/shared/markdown';
// app CSS:  @import "@kravlone/shared/markdown.css";
<MarkdownRenderer markdown={post.content_md} />   // posts + admin preview (same component = preview is exact)
<CommentBody markdown={comment.body} />           // comments: bold/italic/code/links only
```
Prose and syntax-highlight colours live in `shared/markdown/markdown.css` and use tokens via `@apply`.

## Checklist for a UI change

- [ ] Only tokens/primitives (guard test passes)
- [ ] Looks right at 360 px and desktop
- [ ] Keyboard: tab order sensible, focus visible
- [ ] Contrast: new colour pairs ≥ 4.5:1 for text (check with axe or browser devtools)
- [ ] `make test` green
