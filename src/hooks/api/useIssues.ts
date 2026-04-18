import { issuesApi } from '@/api';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';
import { useApiQuery, useBatchOperation } from './useApiQuery';
import { GitLabIssue } from '@/types/gitlab';
import { DateRangeFilter } from '@/api/types/common';

/**
 * Hook to get issues for a specific project
 */
export function useProjectIssues(
  projectId: number,
  state: 'opened' | 'closed' | 'all' = 'opened',
  enabled: boolean = true
) {
  return useApiQuery(
    QUERY_KEYS.projectIssues(projectId, state),
    () => issuesApi.getProjectIssues(projectId, state),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get all issues for a project with pagination
 */
export function useAllProjectIssues(
  projectId: number,
  state: 'opened' | 'closed' | 'all' = 'opened',
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['issues', 'all-project', projectId, state, dateFilter?.since?.toISOString()],
    () => issuesApi.getAllProjectIssues(projectId, state, dateFilter),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get incidents for multiple projects
 */
export function useIncidents(projectIds: number[], enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.incidents(projectIds),
    () => issuesApi.getIncidents(projectIds),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to batch fetch issues for multiple projects
 */
export function useBatchIssues(
  projectIds: number[],
  state: 'opened' | 'closed' | 'all' = 'opened',
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    QUERY_KEYS.issuesBatch(projectIds, state, dateFilter?.since, dateFilter?.until),
    () => issuesApi.batchFetchIssues(projectIds, state, dateFilter),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to get single issue
 */
export function useIssue(projectId: number, issueIid: number, enabled: boolean = true) {
  return useApiQuery(
    ['issues', 'single', projectId, issueIid],
    () => issuesApi.getIssue(projectId, issueIid),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && issueIid > 0,
    }
  );
}

/**
 * Hook to get issue links/related issues
 */
export function useIssueLinks(projectId: number, issueIid: number, enabled: boolean = true) {
  return useApiQuery(
    ['issues', 'links', projectId, issueIid],
    () => issuesApi.getIssueLinks(projectId, issueIid),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && issueIid > 0,
    }
  );
}

/**
 * Hook to get milestone issues
 */
export function useMilestoneIssues(
  projectId: number,
  milestoneId: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['issues', 'milestone', projectId, milestoneId],
    () => issuesApi.getMilestoneIssues(projectId, milestoneId),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && milestoneId > 0,
    }
  );
}

/**
 * Hook for comprehensive issue analytics across projects
 */
export function useIssueAnalytics(
  projectIds: number[],
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  const openIssuesQuery = useBatchIssues(projectIds, 'opened', dateRange, enabled);
  const closedIssuesQuery = useBatchIssues(projectIds, 'closed', dateRange, enabled);
  const incidentsQuery = useIncidents(projectIds, enabled);

  return {
    openIssues: openIssuesQuery,
    closedIssues: closedIssuesQuery,
    incidents: incidentsQuery,
    isLoading: openIssuesQuery.loading || closedIssuesQuery.loading || incidentsQuery.loading,
    hasError: openIssuesQuery.error || closedIssuesQuery.error || incidentsQuery.error,
    errors: [openIssuesQuery.error, closedIssuesQuery.error, incidentsQuery.error].filter(Boolean),
  };
}

/**
 * Hook for issue statistics and trends
 */
export function useIssueStatistics(
  projectIds: number[],
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['issues', 'statistics', projectIds.sort(), dateRange?.since?.toISOString()],
    async () => {
      const [openIssues, closedIssues, incidents] = await Promise.all([
        issuesApi.batchFetchIssues(projectIds, 'opened', dateRange),
        issuesApi.batchFetchIssues(projectIds, 'closed', dateRange),
        issuesApi.getIncidents(projectIds),
      ]);

      // Calculate statistics
      const totalOpen = openIssues.length;
      const totalClosed = closedIssues.length;
      const totalIncidents = incidents.length;

      // Group by labels
      const labelStats: Record<string, number> = {};
      [...openIssues, ...closedIssues].forEach(issue => {
        issue.labels.forEach(label => {
          labelStats[label] = (labelStats[label] || 0) + 1;
        });
      });

      // Group by project
      const projectStats: Record<number, { open: number; closed: number; incidents: number }> = {};
      projectIds.forEach(projectId => {
        projectStats[projectId] = {
          open: openIssues.filter(i => i.project_id === projectId).length,
          closed: closedIssues.filter(i => i.project_id === projectId).length,
          incidents: incidents.filter(i => i.project_id === projectId).length,
        };
      });

      return {
        totalOpen,
        totalClosed,
        totalIncidents,
        closureRate: totalClosed / (totalOpen + totalClosed) * 100,
        labelStats,
        projectStats,
        openIssues,
        closedIssues,
        incidents,
      };
    },
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectIds.length > 0,
    }
  );
}