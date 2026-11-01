import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@kravlone/shared/ui';
import type { CommentStatus, PostStatus } from './blogApi';

export function PageHeader({ title, label, actions }: { title: ReactNode; label: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-fg-strong">
        {title}
        <span className="font-mono text-sm font-normal tracking-widest text-neon">// {label}</span>
      </h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-6 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 font-mono text-sm text-danger">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

const STATUS_STYLE: Record<PostStatus | CommentStatus | 'scheduled', string> = {
  draft: 'border-line text-muted',
  published: 'border-success/40 text-success',
  scheduled: 'border-warning/40 text-warning',
  pending: 'border-warning/40 text-warning',
  approved: 'border-success/40 text-success',
  rejected: 'border-danger/40 text-danger',
};

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
  return (
    <span className={cn('inline-flex rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest', STATUS_STYLE[status])}>
      {status}
    </span>
  );
}


export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-10 text-center font-mono text-sm text-subtle">
      {children}
    </div>
  );
}
