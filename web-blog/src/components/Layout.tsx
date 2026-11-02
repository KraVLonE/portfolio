import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Rss } from 'lucide-react';
import { SITE_URL } from '../api';

const YEAR = new Date().getFullYear();

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg font-sans text-fg selection:bg-neon/30">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-neon">
        Skip to content
      </a>
      <header className="fixed top-0 z-40 w-full border-b border-neon/20 bg-bg/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6" aria-label="Main">
          <Link to="/" className="font-mono text-lg font-bold tracking-tight text-fg-strong">
            <span className="text-neon">~/</span>blog
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <a href="/rss.xml" className="flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-neon" aria-label="RSS feed">
              <Rss size={14} /> <span className="hidden sm:inline">rss</span>
            </a>
            <a href={SITE_URL} className="flex items-center gap-1 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-fg-strong transition-colors hover:border-neon/50">
              Portfolio <ArrowUpRight size={14} className="text-neon" />
            </a>
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">{children}</main>
      <footer className="border-t border-line py-8 text-center font-mono text-xs text-subtle">
        © {YEAR} <a href={SITE_URL} className="hover:text-neon">KraVLonE</a> · <a href="/rss.xml" className="hover:text-neon">RSS</a>
      </footer>
    </div>
  );
}
