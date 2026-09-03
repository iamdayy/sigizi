import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'inline-flex items-center justify-center space-x-2 font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          {
            // Variants
            'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-[0_4px_14px_0_rgba(2,132,199,0.39)] hover:shadow-[0_6px_20px_rgba(2,132,199,0.23)]': variant === 'primary',
            'bg-brand-light/40 text-brand-primary hover:bg-brand-light/60': variant === 'secondary',
            'bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-600 hover:text-brand-primary hover:bg-slate-50 shadow-sm': variant === 'outline',
            'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.23)]': variant === 'danger',
            'bg-transparent text-slate-500 hover:text-brand-primary hover:bg-brand-light/20': variant === 'ghost',
            
            // Sizes
            'h-9 px-4 text-xs rounded-[12px]': size === 'sm',
            'h-11 px-6 text-sm rounded-[16px]': size === 'md',
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
