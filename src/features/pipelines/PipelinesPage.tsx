import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PipelineStatus } from '@/components/dashboard/PipelineStatus';
import { DoraMetricsPanel } from '@/components/dashboard/DoraMetricsPanel';
import { pipelines, doraMetrics } from '@/lib/mockData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { GitBranch, CheckCircle2, XCircle, Clock } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { gitlabService } from '@/services/gitlab';
import { calculateDoraMetrics } from '@/lib/transformers';
import {
  Skeleton,
  MetricCardSkeleton,
  TableRowSkeleton
} from '@/components/ui/skeletons';
import { Loader2 } from 'lucide-react';

const PipelinesPage = () => {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => gitlabService.getProjects(),
  });

  const { data: pipelinesData, isLoading: isLoadingPipelines } = useQuery({
    queryKey: ['pipelines-all'],
    queryFn: async () => {
      if (!projectsData?.length) return [];
      const promises = projectsData.slice(0, 5).map(p => gitlabService.getRecentPipelines(p.id));
      const results = await Promise.all(promises);
      return results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!projectsData?.length
  });

  // 3. Fetch Incidents
  const { data: incidentsData, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['incidents', projectsData?.map(p => p.id)],
    queryFn: () => gitlabService.getIncidents(projectsData?.map(p => p.id)),
    enabled: !!projectsData?.length,
    retry: 1
  });

  // 4. Fetch Merged MRs
  const { data: mrData, isLoading: isLoadingMRs } = useQuery({
    queryKey: ['merged-mrs', projectsData?.map(p => p.id)],
    queryFn: () => gitlabService.getAllMergeRequests(projectsData?.map(p => p.id)),
    enabled: !!projectsData?.length,
    retry: 1
  });

  const isLoading = isLoadingPipelines || isLoadingIncidents || isLoadingMRs;

  const displayPipelines = (pipelinesData || []).map(p => {
    const project = projectsData?.find(proj => proj.id === p.project_id);
    return {
      id: String(p.id),
      project: project?.name || 'Unknown',
      status: p.status as any,
      branch: p.ref,
      commit: p.sha.substring(0, 8),
      author: 'GitLab',
      duration: '2m',
      timestamp: new Date(p.created_at).toLocaleTimeString()
    };
  });

  const successPipelines = displayPipelines.filter(p => p.status === 'success').length;
  const failedPipelines = displayPipelines.filter(p => p.status === 'failed').length;
  const runningPipelines = displayPipelines.filter(p => p.status === 'running').length;
  const successRate = displayPipelines.length > 0 ? Math.round((successPipelines / displayPipelines.length) * 100) : 0;

  const displayDora = (pipelinesData && mrData && incidentsData)
    ? calculateDoraMetrics(pipelinesData, mrData, incidentsData)
    : doraMetrics;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
            <div className="glass-card rounded-xl p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold">CI/CD Monitoring</h2>
          <p className="text-muted-foreground mt-1">
            Pipeline status, build metrics, and deployment tracking
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Pipelines"
            value={displayPipelines.length}
            icon={GitBranch}
            variant="primary"
            delay={0}
          />
          <MetricCard
            title="Success Rate"
            value={`${successRate}%`}
            icon={CheckCircle2}
            variant="success"
            delay={0.05}
          />
          <MetricCard
            title="Failed Builds"
            value={failedPipelines}
            icon={XCircle}
            variant="danger"
            delay={0.1}
          />
          <MetricCard
            title="In Progress"
            value={runningPipelines}
            icon={Clock}
            variant="warning"
            delay={0.15}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PipelineStatus pipelines={displayPipelines} />
          <DoraMetricsPanel metrics={displayDora} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PipelinesPage;
