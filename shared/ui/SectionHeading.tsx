import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SectionHeadingProps {
  /** Small mono label rendered as `// LABEL`. */
  label?: string;
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function SectionHeading({ label, children, as: Tag = 'h2', className }: SectionHeadingProps) {
  return (
    <div className={cn('mb-8 border-b border-line pb-2', className)}>
      {label && (
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">// {label}</p>
      )}
      <Tag className="flex items-center gap-2 text-2xl font-bold text-fg-strong">{children}</Tag>
    </div>
  );
}
