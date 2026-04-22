import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonClassNameOptions {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-violet-400 bg-violet-500 text-slate-950 hover:bg-violet-400 hover:border-violet-300',
  secondary:
    'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-slate-500 hover:bg-slate-900',
  ghost:
    'border-transparent bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white',
};

export function buttonClassNames({
  variant = 'secondary',
  fullWidth = false,
}: ButtonClassNameOptions = {}) {
  return clsx(
    'inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    fullWidth && 'w-full',
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonClassNameOptions;

export function Button({ className, variant = 'primary', fullWidth = false, ...props }: ButtonProps) {
  return <button className={clsx(buttonClassNames({ variant, fullWidth }), className)} {...props} />;
}
