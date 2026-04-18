import { motion } from 'framer-motion';
import { Clock, Rocket, AlertTriangle, Wrench, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DoraMetrics } from '@/lib/mockData';

interface DoraMetricsPanelProps {
  metrics: DoraMetrics;
}

const metricConfig = [
  {
    key: 'leadTime',
    title: 'Lead Time for Changes',
    description: 'Time from code commit to production',
    icon: Clock,
    goodTrend: 'down',
  },
  {
    key: 'deploymentFrequency',
    title: 'Deployment Frequency',
    description: 'How often deployments occur',
    icon: Rocket,
    goodTrend: 'up',
  },
  {
    key: 'changeFailureRate',
    title: 'Change Failure Rate',
    description: 'Percentage of failed deployments',
    icon: AlertTriangle,
    goodTrend: 'down',
  },
  {
    key: 'mttr',
    title: 'Mean Time to Recovery',
    description: 'Average time to restore service',
    icon: Wrench,
    goodTrend: 'down',
  },
] as const;

export function DoraMetricsPanel({ metrics }: DoraMetricsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">DORA Metrics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">DevOps Research and Assessment</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
          Elite Performer
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metricConfig.map((config, index) => {
          const metric = metrics[config.key];
          const isGoodTrend = config.goodTrend === 'down' 
            ? metric.trend < 0 
            : metric.trend > 0;
          const TrendIcon = metric.trend > 0 ? TrendingUp : TrendingDown;

          return (
            <motion.div
              key={config.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <config.icon className="h-4 w-4 text-primary" />
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  isGoodTrend ? 'text-success' : 'text-destructive'
                )}>
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(metric.trend)}%
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono">{metric.value}</span>
                  <span className="text-sm text-muted-foreground">{metric.unit}</span>
                </div>
                <p className="text-xs font-medium mt-1">{config.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
