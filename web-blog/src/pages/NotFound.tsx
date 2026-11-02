import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '@kravlone/shared/ui';
import { setPageMeta } from '../utils';

export default function NotFound() {
  useEffect(() => setPageMeta('404 | KraVLonE Blog'), []);
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-accent-soft">ERR 404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-fg-strong">Post not found</h1>
      <p className="mt-3 font-mono text-sm text-subtle">$ cat ~/blog/this-post.md: No such file or directory</p>
      <Link to="/" className={buttonClass('ghost', 'md', 'mt-8')}>Back to all posts</Link>
    </div>
  );
}
