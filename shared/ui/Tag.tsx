import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cn } from './cn';

const BASE = 'inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs';
const IDLE = 'border-line bg-bg text-muted';
const ACTIVE = 'border-neon/50 bg-neon/10 text-neon shadow-glow';

/** Static label (tech stack, post tags). */
export function Tag({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(BASE, IDLE, className)} {...rest} />;
}

export interface TagButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Toggleable filter chip. Exposes state via aria-pressed. */
export function TagButton({ active = false, type = 'button', className, role, ...rest }: TagButtonProps) {
  // Toggle buttons expose aria-pressed; when used as a tab the caller sets role + aria-selected instead.
  return (
    <button
      type={type}
      role={role}
      aria-pressed={role && role !== 'button' ? undefined : active}
      className={cn(
        BASE,
        'cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-neon',
        active ? ACTIVE : cn(IDLE, 'hover:border-neon/40 hover:text-fg'),
        className,
      )}
      {...rest}
    />
  );
}
