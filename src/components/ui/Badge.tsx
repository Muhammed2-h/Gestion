import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'profit' | 'loss' | 'info' | 'warning' | 'accent' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span
      className={clsx(
        'badge',
        variant === 'profit' && 'badge-profit',
        variant === 'loss' && 'badge-loss',
        variant === 'info' && 'badge-info',
        variant === 'warning' && 'badge-warning',
        variant === 'accent' && 'badge-accent',
        variant === 'default' && 'bg-bg-card-hover text-text-secondary border border-border',
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
