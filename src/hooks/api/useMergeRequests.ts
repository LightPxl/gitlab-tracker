import { mergeRequestsApi } from '@/api';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';
import { useApiQuery } from './useApiQuery';
import { GitLabMergeRequest } from '@/types/gitlab';
import { DateRangeFilter } from '@/api/types/common';

/**
 * Hook to get merge requests for a specific project
 */
export function useProjectMergeRequests(
  projectId: number,
  state: 'opened' | 'closed' | 'merged' | 'all' = 'opened',
  enabled: boolean = true
) {
  return useApiQuery(
    QUERY_KEYS.projectMRs(projectId, state),
    () => mergeRequestsApi.getProjectMergeRequests(projectId, state),
    {
      ...QUERY_CONFIGS.ISSUES, // Same refresh rate as issues
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get all merge requests for a project with pagination
 */
export function useAllProjectMergeRequests(
  projectId: number,
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['merge-requests', 'all-project', projectId, dateFilter?.since?.toISOString()],
    () => mergeRequestsApi.getAllProjectMergeRequests(projectId, dateFilter),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get global merge requests
 */
export function useGlobalMergeRequests(
  state: 'opened' | 'closed' | 'merged' | 'all' = 'opened',
  page: number = 1,
  perPage: number = 20
) {
  return useApiQuery(
    [...QUERY_KEYS.mergeRequests, state, page.toString(), perPage.toString()],
    () => mergeRequestsApi.getGlobalMergeRequests(state, { page, perPage }),
    {
      ...QUERY_CONFIGS.ISSUES,
      placeholderData: (prev) => prev,
    }
  );
}

/**
 * Hook to batch fetch merge requests for multiple projects
 * Note: GitLab API doesn't return author.email in MR list responses
 * Filtering by internal employees is done at the page level by matching author.username
 */
export function useBatchMergeRequests(
  projectIds: number[],
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    QUERY_KEYS.mrsBatch(projectIds, dateFilter?.since, dateFilter?.until),
    () => mergeRequestsApi.batchFetchMergeRequests(projectIds, dateFilter),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to get single merge request
 */
export function useMergeRequest(
  projectId: number,
  mergeRequestIid: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['merge-requests', 'single', projectId, mergeRequestIid],
    () => mergeRequestsApi.getMergeRequest(projectId, mergeRequestIid),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && mergeRequestIid > 0,
    }
  );
}

/**
 * Hook to get merge request changes
 */
export function useMergeRequestChanges(
  projectId: number,
  mergeRequestIid: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['merge-requests', 'changes', projectId, mergeRequestIid],
    () => mergeRequestsApi.getMergeRequestChanges(projectId, mergeRequestIid),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && mergeRequestIid > 0,
    }
  );
}

/**
 * Hook to get merge request commits
 */
export function useMergeRequestCommits(
  projectId: number,
  mergeRequestIid: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['merge-requests', 'commits', projectId, mergeRequestIid],
    () => mergeRequestsApi.getMergeRequestCommits(projectId, mergeRequestIid),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && mergeRequestIid > 0,
    }
  );
}

/**
 * Hook to get merge request approvals
 */
export function useMergeRequestApprovals(
  projectId: number,
  mergeRequestIid: number,
  enabled: boolean = true
) {
  return useApiQuery(
    ['merge-requests', 'approvals', projectId, mergeRequestIid],
    () => mergeRequestsApi.getMergeRequestApprovals(projectId, mergeRequestIid),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && mergeRequestIid > 0,
    }
  );
}

/**
 * Hook for comprehensive merge request analytics
 */
export function useMergeRequestAnalytics(
  projectIds: number[],
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['merge-requests', 'analytics', projectIds.sort(), dateRange?.since?.toISOString()],
    async () => {
      const mergeRequests = await mergeRequestsApi.batchFetchMergeRequests(projectIds, dateRange);

      // Separate by state
      const opened = mergeRequests.filter(mr => mr.state === 'opened');
      const merged = mergeRequests.filter(mr => mr.state === 'merged');
      const closed = mergeRequests.filter(mr => mr.state === 'closed');

      // Calculate metrics
      const totalMRs = mergeRequests.length;
      const mergeRate = totalMRs > 0 ? (merged.length / totalMRs) * 100 : 0;

      // Calculate average review time for merged MRs
      const avgReviewTime = merged.length > 0 ? merged.reduce((sum, mr) => {
        if (mr.merged_at && mr.created_at) {
          const reviewTime = new Date(mr.merged_at).getTime() - new Date(mr.created_at).getTime();
          return sum + reviewTime;
        }
        return sum;
      }, 0) / merged.length : 0;

      // Group by author
      const authorStats: Record<string, { opened: number; merged: number; closed: number }> = {};
      mergeRequests.forEach(mr => {
        const author = mr.author.username;
        if (!authorStats[author]) {
          authorStats[author] = { opened: 0, merged: 0, closed: 0 };
        }
        authorStats[author][mr.state as keyof typeof authorStats[string]]++;
      });

      return {
        totalMRs,
        opened: opened.length,
        merged: merged.length,
        closed: closed.length,
        mergeRate,
        avgReviewTimeMs: avgReviewTime,
        avgReviewTimeDays: avgReviewTime / (1000 * 60 * 60 * 24),
        authorStats,
        mergeRequests,
      };
    },
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectIds.length > 0,
    }
  );
}