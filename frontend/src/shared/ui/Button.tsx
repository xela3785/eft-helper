import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { buttonClassNames } from './button-class-names';

import type { ButtonVariant } from './button-class-names';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({ className, variant = 'primary', fullWidth = false, ...props }: ButtonProps) {
  return <button className={clsx(buttonClassNames({ variant, fullWidth }), className)} {...props} />;
}
