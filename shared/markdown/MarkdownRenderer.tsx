import { useRef, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '../ui/cn';

export interface MarkdownRendererProps {
  markdown: string;
  className?: string;
}

const isExternal = (href?: string) => !!href && /^https?:\/\//i.test(href);

function Link({ href, children, node: _node, ...rest }: ComponentPropsWithoutRef<'a'> & { node?: unknown }) {
  // BLG-24: external links open in a new tab without leaking window.opener / referrer.
  const ext = isExternal(href);
  return (
    <a href={href} {...rest} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}

function CodeBlock({ children, node: _node, ...rest }: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) {
  // BLG-21: copy button on every fenced block.
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.textContent ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (http / permissions): nothing useful to do */
    }
  };
  return (
    <div className="md-code group">
      <button type="button" onClick={copy} className="md-copy" aria-label={copied ? 'Copied' : 'Copy code'}>
        {copied ? 'copied' : 'copy'}
      </button>
      <pre ref={ref} {...rest}>{children}</pre>
    </div>
  );
}

function Table({ node: _node, ...rest }: ComponentPropsWithoutRef<'table'> & { node?: unknown }) {
  // BLG-53: wide tables scroll inside their box, never the page.
  return (
    <div className="md-table">
      <table {...rest} />
    </div>
  );
}

function Img({ node: _node, alt, src, ...rest }: ComponentPropsWithoutRef<'img'> & { node?: unknown }) {
  // Unsafe URLs are blanked by react-markdown; src="" would make browsers re-request the page.
  if (!src) return alt ? <span className="md-img-missing">[image: {alt}]</span> : null;
  return <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" {...rest} />;
}

const COMPONENTS: Components = { a: Link, pre: CodeBlock, table: Table, img: Img };

/**
 * The one Markdown renderer for admin preview and the public blog (BLG-25).
 * GFM (BLG-20), highlighting (BLG-21), raw HTML dropped (BLG-22, skipHtml),
 * unsafe URLs stripped (react-markdown defaultUrlTransform), heading ids (BLG-23).
 */
export function MarkdownRenderer({ markdown, className }: MarkdownRendererProps) {
  return (
    <div className={cn('md-prose', className)}>
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: false }]]}
        components={COMPONENTS}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
