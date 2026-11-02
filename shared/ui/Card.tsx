import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Neon border + glow on hover (for clickable cards). */
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface/60 p-6',
        interactive && 'transition-all hover:border-neon/40 hover:shadow-glow',
        className,
      )}
      {...rest}
    />
  );
}
