import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const CONTROL =
  'w-full rounded-md border border-line bg-bg p-3 text-fg-strong placeholder:text-subtle ' +
  'transition-colors focus:border-neon/50 focus:outline-none aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  /** Shown under the control; announced to screen readers. */
  hint?: string;
  error?: string;
}

function FieldShell({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error}>
      <input
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${fid}-msg` : undefined}
        className={cn(CONTROL, className)}
        {...rest}
      />
    </FieldShell>
  );
}

export type TextareaProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, hint, error, id, className, ...rest }: TextareaProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error}>
      <textarea
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${fid}-msg` : undefined}
        className={cn(CONTROL, 'resize-y', className)}
        {...rest}
      />
    </FieldShell>
  );
}
