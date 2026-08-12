import type { ReactNode } from 'react';
import { Card } from './Card';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | ReactNode;
  subValue?: string | ReactNode;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, subValue, icon, trend = 'neutral', className }: StatCardProps) {
  return (
    <Card variant="stat" className={clsx('animate-fade-in', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="stat-label">{label}</span>
        {icon && (
          <div
            className={clsx(
              'flex items-center justify-center rounded-md',
              'w-8 h-8',
              trend === 'up' && 'bg-profit-bg text-profit',
              trend === 'down' && 'bg-loss-bg text-loss',
              trend === 'neutral' && 'bg-accent-dim text-accent'
            )}
            style={{
              background: trend === 'up' ? 'var(--color-profit-bg)' : trend === 'down' ? 'var(--color-loss-bg)' : 'var(--color-accent-dim)',
              color: trend === 'up' ? 'var(--color-profit)' : trend === 'down' ? 'var(--color-loss)' : 'var(--color-accent)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="stat-value mono">{value}</div>
      {subValue && (
        <div className={clsx('stat-change', trend === 'up' && 'positive', trend === 'down' && 'negative')}>
          {subValue}
        </div>
      )}
    </Card>
  );
}
