import { pipelinesApi } from '@/api';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';
import { useApiQuery } from './useApiQuery';
import { GitLabPipeline } from '@/types/gitlab';

/**
 * Hook to get pipelines for a specific project
 */
export function useProjectPipelines(
  projectId: number,
  options?: {
    status?: 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped';
    ref?: string;
  },
  enabled: boolean = true
) {
  return useApiQuery(
    QUERY_KEYS.projectPipelines(projectId),
    () => pipelinesApi.getProjectPipelines(projectId, options),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get recent pipelines for a project
 */
export function useRecentPipelines(projectId?: number, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.recentPipelines(projectId),
    () => projectId 
      ? pipelinesApi.getRecentPipelines(projectId)
      : pipelinesApi.getGlobalRecentPipelines(),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled,
    }
  );
}

/**
 * Hook to get production pipelines for multiple projects
 */
export function useProductionPipelines(projectIds: number[], enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.productionPipelines(projectIds),
    () => pipelinesApi.batchFetchProductionPipelines(projectIds),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to batch fetch recent pipelines for multiple projects
 */
export function useBatchRecentPipelines(projectIds: number[], enabled: boolean = true) {
  return useApiQuery(
    ['pipelines', 'batch-recent', projectIds.sort()],
    () => pipelinesApi.batchFetchRecentPipelines(projectIds),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to get latest pipeline for each project (useful for coverage data)
 */
export function useLatestPipelinesMap(projectIds: number[], enabled: boolean = true) {
  return useApiQuery(
    ['pipelines', 'latest-map', projectIds.sort()],
    () => pipelinesApi.getLatestPipelinesMap(projectIds),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to get single pipeline
 */
export function usePipeline(
  projectId: number,
  pipelineId: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['pipelines', 'single', projectId, pipelineId],
    () => pipelinesApi.getPipeline(projectId, pipelineId),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectId > 0 && pipelineId > 0,
    }
  );
}

/**
 * Hook to get pipeline jobs
 */
export function usePipelineJobs(
  projectId: number,
  pipelineId: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['pipelines', 'jobs', projectId, pipelineId],
    () => pipelinesApi.getPipelineJobs(projectId, pipelineId),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectId > 0 && pipelineId > 0,
    }
  );
}

/**
 * Hook to get pipeline test report
 */
export function usePipelineTestReport(
  projectId: number,
  pipelineId: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['pipelines', 'test-report', projectId, pipelineId],
    () => pipelinesApi.getPipelineTestReport(projectId, pipelineId),
    {
      ...QUERY_CONFIGS.PIPELINES,
      enabled: enabled && projectId > 0 && pipelineId > 0,
    }
  );
}

/**
 * Hook for comprehensive pipeline analytics
 */
export function usePipelineAnalytics(projectIds: number[], enabled: boolean = true) {
  return useApiQuery(
    ['pipelines', 'analytics', projectIds.sort()],
    async () => {
      const pipelines = await pipelinesApi.batchFetchRecentPipelines(projectIds);

      // Calculate success rate
      const totalPipelines = pipelines.length;
      const successfulPipelines = pipelines.filter(p => p.status === 'success').length;
      const failedPipelines = pipelines.filter(p => p.status === 'failed').length;
      const runningPipelines = pipelines.filter(p => p.status === 'running').length;
      const pendingPipelines = pipelines.filter(p => p.status === 'pending').length;

      const successRate = totalPipelines > 0 ? (successfulPipelines / totalPipelines) * 100 : 0;
      const failureRate = totalPipelines > 0 ? (failedPipelines / totalPipelines) * 100 : 0;

      // Group by project
      const projectStats: Record<number, {
        total: number;
        success: number;
        failed: number;
        running: number;
        pending: number;
        successRate: number;
      }> = {};

      projectIds.forEach(projectId => {
        const projectPipelines = pipelines.filter(p => p.project_id === projectId);
        const projectSuccessful = projectPipelines.filter(p => p.status === 'success').length;
        const projectTotal = projectPipelines.length;

        projectStats[projectId] = {
          total: projectTotal,
          success: projectSuccessful,
          failed: projectPipelines.filter(p => p.status === 'failed').length,
          running: projectPipelines.filter(p => p.status === 'running').length,
          pending: projectPipelines.filter(p => p.status === 'pending').length,
          successRate: projectTotal > 0 ? (projectSuccessful / projectTotal) * 100 : 0,
        };
      });

      // Calculate coverage statistics (if available)
      const pipelinesWithCoverage = pipelines.filter(p => p.coverage && parseFloat(p.coverage) > 0);
      const avgCoverage = pipelinesWithCoverage.length > 0 
        ? pipelinesWithCoverage.reduce((sum, p) => sum + parseFloat(p.coverage!), 0) / pipelinesWithCoverage.length
        : 0;

      return {
        totalPipelines,
        successfulPipelines,
        failedPipelines,
        runningPipelines,
        pendingPipelines,
        successRate,
        failureRate,
        avgCoverage,
        projectStats,
        pipelines,
      };
    },
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectIds.length > 0,
    }
  );
}