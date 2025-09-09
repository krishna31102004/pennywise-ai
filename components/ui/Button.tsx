'use client';
import { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'subtle'|'danger' };
export default function Button({ variant='primary', className, ...rest }: Props) {
  return (
    <button
      className={clsx(
        'btn focus:outline-none focus:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'btn-ghost',
        variant === 'subtle' && 'btn-subtle',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        className
      )}
      {...rest}
    />
  );
}
