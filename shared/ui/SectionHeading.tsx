import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SectionHeadingProps {
  /** Mono label rendered inline after the title as `// LABEL`. */
  label?: string;
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

export function SectionHeading({ label, children, as: Tag = 'h2', className }: SectionHeadingProps) {
  return (
    // Matches the site's existing pattern: "Experience // LOG" with the label inline after the title.
    <Tag className={cn('mb-8 flex flex-wrap items-baseline gap-x-2 border-b border-line pb-2 text-2xl font-bold text-fg-strong', className)}>
      {children}
      {label && <span className="font-mono text-sm font-normal uppercase tracking-widest text-neon">// {label}</span>}
    </Tag>
  );
}
