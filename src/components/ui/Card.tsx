import type { ReactNode, CSSProperties } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'stat';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: CSSProperties;
}

export function Card({ children, className, variant = 'default', size = 'md', onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        variant === 'default' && 'card',
        variant === 'glass' && 'card-glass',
        variant === 'stat' && 'stat-card',
        size === 'sm' && 'card-sm',
        size === 'lg' && 'card-lg',
        className
      )}
      style={{ ...(onClick ? { cursor: 'pointer' } : undefined), ...style }}
    >
      {children}
    </div>
  );
}
