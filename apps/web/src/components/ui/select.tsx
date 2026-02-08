'use client';

import { cn } from '@/lib/utils';
import { forwardRef, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none',
          'focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = 'Select';
