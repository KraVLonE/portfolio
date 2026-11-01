import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button, Card, Input, SectionHeading, Tag, TagButton, Textarea, cn } from '../ui';

afterEach(cleanup);

describe('cn', () => {
  it('lets later classes override conflicting earlier ones', () => {
    expect(cn('p-2 text-neon', false && 'hidden', 'p-4')).toBe('text-neon p-4');
  });
});

describe('Button', () => {
  it('defaults to type=button so it never submits forms by accident', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveProperty('type', 'button');
  });

  it.each([
    ['primary', 'bg-neon-deep'],
    ['ghost', 'border-line'],
    ['danger', 'text-accent-soft'],
  ] as const)('%s variant uses theme tokens', (variant, token) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole('button').className).toContain(token);
  });

  it('merges caller className over defaults', () => {
    render(<Button size="sm" className="px-8">x</Button>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('px-8');
    expect(cls).not.toContain('px-3');
  });
});

describe('TagButton', () => {
  it('exposes active state via aria-pressed', () => {
    render(<><TagButton active>genai</TagButton><TagButton>devops</TagButton></>);
    expect(screen.getByRole('button', { name: 'genai' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'devops' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('as a tab it drops aria-pressed (invalid on role=tab)', () => {
    render(<TagButton role="tab" aria-selected active>pending</TagButton>);
    const tab = screen.getByRole('tab', { name: 'pending' });
    expect(tab.hasAttribute('aria-pressed')).toBe(false);
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });

  it('static Tag is not interactive', () => {
    render(<Tag>py</Tag>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SectionHeading', () => {
  it('renders the // label and the requested heading level', () => {
    render(<SectionHeading label="writing" as="h1">Blog</SectionHeading>);
    expect(screen.getByText('// writing')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Blog // writing' })).toBeTruthy();
  });
});

describe('Input / Textarea', () => {
  it('associates label with control', () => {
    render(<><Input label="Title" /><Textarea label="Body" /></>);
    expect(screen.getByLabelText('Title').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Body').tagName).toBe('TEXTAREA');
  });

  it('marks invalid and describes the control with the error', () => {
    render(<Input label="Slug" error="Already taken" hint="ignored" />);
    const input = screen.getByLabelText('Slug');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const msg = document.getElementById(input.getAttribute('aria-describedby')!);
    expect(msg?.textContent).toBe('Already taken');
  });

  it('has no aria-describedby without hint or error', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText('Name').hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('Card', () => {
  it('only glows when interactive', () => {
    const { container } = render(<><Card>a</Card><Card interactive>b</Card></>);
    const [plain, live] = Array.from(container.children);
    expect(plain.className).not.toContain('hover:shadow-glow');
    expect(live.className).toContain('hover:shadow-glow');
  });
});

describe('buttonClass', () => {
  it('gives links the same look as Button', async () => {
    const { buttonClass } = await import('../ui');
    render(<><a href="/x" className={buttonClass('ghost', 'sm')}>link</a><Button variant="ghost" size="sm">btn</Button></>);
    expect(screen.getByText('link').className).toBe(screen.getByRole('button').className);
  });
});
