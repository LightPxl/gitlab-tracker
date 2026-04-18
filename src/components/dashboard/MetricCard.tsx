import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number | null;
  trendLabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  delay?: number;
}

const variantStyles = {
  default: 'from-white/[0.05] to-transparent',
  primary: 'from-primary/18 to-accent/8',
  success: 'from-success/14 to-transparent',
  warning: 'from-warning/16 to-transparent',
  danger: 'from-destructive/16 to-transparent',
};

const iconVariantStyles = {
  default: 'border border-white/8 bg-white/[0.04] text-secondary-foreground',
  primary: 'border border-primary/20 bg-primary/14 text-primary',
  success: 'border border-success/20 bg-success/14 text-success',
  warning: 'border border-warning/20 bg-warning/14 text-warning',
  danger: 'border border-destructive/20 bg-destructive/14 text-destructive',
};

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  variant = 'default',
  delay = 0,
}: MetricCardProps) {
  // Only show trend if it's a valid number (not null/undefined)
  const hasTrend = trend !== undefined && trend !== null;
  const TrendIcon = hasTrend && trend > 0 ? TrendingUp : hasTrend && trend < 0 ? TrendingDown : Minus;
  const trendColor = hasTrend && trend > 0 ? 'text-success' : hasTrend && trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'glass-card rounded-2xl p-3 sm:p-5 hover-lift cursor-default',
        'bg-gradient-to-br',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm font-medium text-muted-foreground/90 truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-semibold tracking-tight text-white">{value}</p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className={cn('p-2.5 sm:p-3 rounded-2xl shrink-0 ml-2', iconVariantStyles[variant])}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      {hasTrend && (
        <div className="mt-4 flex items-center gap-2">
          <div className={cn('flex items-center gap-1', trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          </div>
          {trendLabel && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
