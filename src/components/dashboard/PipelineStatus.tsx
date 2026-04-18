import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Clock, Ban, GitBranch, User, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pipeline } from '@/lib/mockData';

interface PipelineStatusProps {
  pipelines: Pipeline[];
}

const statusConfig: Record<Pipeline['status'], {
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  label: string;
  animate?: boolean;
}> = {
  success: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    label: 'Success',
  },
  failed: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    label: 'Failed',
  },
  running: {
    icon: Loader2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: 'Running',
    animate: true,
  },
  pending: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Pending',
  },
  canceled: {
    icon: Ban,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Canceled',
  },
};

export function PipelineStatus({ pipelines }: PipelineStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Pipeline Activity</h3>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      <div className="space-y-3">
        {pipelines.length > 0 ? (
          pipelines.map((pipeline, index) => {
            const config = statusConfig[pipeline.status];
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={pipeline.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg transition-colors',
                  'hover:bg-secondary/50 cursor-pointer'
                )}
              >
                <div className={cn('p-2 rounded-lg', config.bg)}>
                  <StatusIcon
                    className={cn(
                      'h-4 w-4',
                      config.color,
                      config.animate && 'animate-spin'
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {pipeline.project}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      config.bg,
                      config.color
                    )}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {pipeline.commit}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{pipeline.branch}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{pipeline.author}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-mono">{pipeline.duration}</p>
                  <p className="text-xs text-muted-foreground">{pipeline.timestamp}</p>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm font-medium">No activity found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              We couldn't find any recent pipeline activity for your selected projects.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
