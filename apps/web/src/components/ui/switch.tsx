'use client';

import { cn } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'h-6 w-11 rounded-full bg-zinc-200 transition-colors',
            'peer-checked:bg-amber-500',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'dark:bg-zinc-700 dark:peer-checked:bg-amber-600',
            'after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5',
            'after:rounded-full after:bg-white after:transition-transform',
            'after:content-[""] peer-checked:after:translate-x-5'
          )}
        />
      </label>
    );
  }
);

Switch.displayName = 'Switch';
