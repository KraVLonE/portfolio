import ReactMarkdown from 'react-markdown';
import { cn } from '../ui/cn';

/** BLG-40: comments allow only bold, italic, inline code and links. Everything else is unwrapped to text. */
const ALLOWED = ['p', 'strong', 'em', 'code', 'a', 'br'];

export function CommentBody({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cn('md-prose md-comment', className)}>
      <ReactMarkdown
        skipHtml
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          a: ({ href, children }) => (
            // Visitor-supplied links: never pass ranking, never get window.opener.
            <a href={href} target="_blank" rel="nofollow ugc noopener noreferrer">{children}</a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
