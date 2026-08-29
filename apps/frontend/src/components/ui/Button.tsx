import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center space-x-2 font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          {
            // Variants
            'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-[0_4px_20px_-4px_rgba(0,113,228,0.3)]': variant === 'primary',
            'bg-brand-light/40 text-brand-primary hover:bg-brand-light/60': variant === 'secondary',
            'bg-white border border-slate-200 text-slate-500 hover:text-brand-primary hover:bg-slate-50 shadow-sm': variant === 'outline',
            'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_20px_-4px_rgba(225,29,72,0.3)]': variant === 'danger',
            'bg-transparent text-slate-500 hover:text-brand-primary hover:bg-brand-light/20': variant === 'ghost',
            
            // Sizes
            'h-9 px-3 text-xs rounded-[12px]': size === 'sm',
            'h-11 px-5 text-sm rounded-[16px]': size === 'md',
            'h-14 px-8 text-base rounded-brand': size === 'lg',
            'h-10 w-10 rounded-[12px] p-2': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
