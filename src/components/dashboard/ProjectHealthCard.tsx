import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';

interface ProjectHealthCardProps {
  projects: Project[];
  onSelectProject?: (project: Project) => void;
}

// Health status based on health score
const getHealthStatus = (healthScore: number) => {
  if (healthScore >= 85) {
    return {
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: 'Healthy',
    };
  } else if (healthScore >= 70) {
    return {
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: 'Fair',
    };
  } else if (healthScore >= 50) {
    return {
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      label: 'Poor',
    };
  } else {
    return {
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'Critical',
    };
  }
};

export function ProjectHealthCard({ projects, onSelectProject }: ProjectHealthCardProps) {
  // Safe array handling
  const safeProjects = projects ?? [];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Project Health</h3>
        </div>
        <span className="text-xs text-muted-foreground">{safeProjects.length} Projects</span>
      </div>

      <div className="space-y-4">
        {safeProjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No project data available</p>
          </div>
        ) : (
          safeProjects.map((project, index) => {
            if (!project) return null;
            const healthScore = project.healthScore ?? 0;
            const healthStatus = getHealthStatus(healthScore);
            const StatusIcon = healthStatus.icon;

            return (
              <motion.div
                key={project.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                onClick={() => onSelectProject?.(project)}
                className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all cursor-pointer border border-white/5 hover:border-primary/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium truncate">{project.name || 'Unknown Project'}</span>
                    <div className={cn(
                      'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                      healthStatus.color,
                      healthStatus.bgColor
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{healthStatus.label}</span>
                    </div>
                  </div>
                  <span className={cn('text-xl font-bold font-mono', healthStatus.color)}>
                    {healthScore}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1">Open Issues</p>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-warning font-bold">{project.openIssues ?? 0}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Resolved Issues</p>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={project.closedIssues && (project.openIssues + project.closedIssues) > 0 
                          ? (project.closedIssues / (project.openIssues + project.closedIssues)) * 100 
                          : 0
                        } 
                        className="h-1.5 flex-1" 
                      />
                      <span className="font-mono">
                        {project.closedIssues ?? 0}/{(project.openIssues ?? 0) + (project.closedIssues ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground mb-1">Last Deploy</p>
                    <span className="font-mono">{project.lastDeployment || '-'}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
