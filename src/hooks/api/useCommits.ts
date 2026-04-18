import { commitsApi } from '@/api';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';
import { useApiQuery } from './useApiQuery';
import { GitLabCommit } from '@/types/gitlab';
import { DateRangeFilter } from '@/api/types/common';
import { isInternalEmail } from '@/lib/utils';

/**
 * Hook to get commits for a specific project
 */
export function useProjectCommits(
  projectId: number,
  options?: {
    ref?: string;
    since?: Date;
    until?: Date;
    path?: string;
  },
  enabled: boolean = true
) {
  return useApiQuery(
    QUERY_KEYS.projectCommits(projectId, options?.since),
    () => commitsApi.getProjectCommits(projectId, options),
    {
      ...QUERY_CONFIGS.ISSUES, // Same refresh rate as issues
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get all commits for a project with pagination
 */
export function useAllProjectCommits(
  projectId: number,
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'all-project', projectId, dateFilter?.since?.toISOString()],
    () => commitsApi.getAllProjectCommits(projectId, dateFilter),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to batch fetch commits for multiple projects
 * Automatically filters to internal employees only (@lightpxl.com)
 */
export function useBatchCommits(
  projectIds: number[],
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  const query = useApiQuery(
    QUERY_KEYS.commitsBatch(projectIds, dateFilter?.since, dateFilter?.until),
    () => commitsApi.batchFetchCommits(projectIds, dateFilter),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectIds.length > 0,
    }
  );

  // Return filtered data (internal employees only)
  return {
    ...query,
    data: query.data?.filter(c => isInternalEmail(c.author_email)),
  };
}

/**
 * Hook to get single commit
 */
export function useCommit(
  projectId: number,
  commitSha: string,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'single', projectId, commitSha],
    () => commitsApi.getCommit(projectId, commitSha),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && commitSha.length > 0,
    }
  );
}

/**
 * Hook to get commit diff
 */
export function useCommitDiff(
  projectId: number,
  commitSha: string,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'diff', projectId, commitSha],
    () => commitsApi.getCommitDiff(projectId, commitSha),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && commitSha.length > 0,
    }
  );
}

/**
 * Hook to get commit comments
 */
export function useCommitComments(
  projectId: number,
  commitSha: string,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'comments', projectId, commitSha],
    () => commitsApi.getCommitComments(projectId, commitSha),
    {
      ...QUERY_CONFIGS.ISSUES,
      enabled: enabled && projectId > 0 && commitSha.length > 0,
    }
  );
}

/**
 * Hook to get commits by author
 */
export function useCommitsByAuthor(
  projectId: number,
  authorEmail: string,
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'by-author', projectId, authorEmail, dateFilter?.since?.toISOString()],
    () => commitsApi.getCommitsByAuthor(projectId, authorEmail, dateFilter),
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectId > 0 && authorEmail.length > 0,
    }
  );
}

/**
 * Hook to get recent commits across multiple projects
 */
export function useRecentCommitsForProjects(
  projectIds: number[],
  limit: number = 20,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'recent-projects', projectIds.sort(), limit],
    () => commitsApi.getRecentCommitsForProjects(projectIds, limit),
    {
      ...QUERY_CONFIGS.DASHBOARD,
      enabled: enabled && projectIds.length > 0,
    }
  );
}

/**
 * Hook to get commit statistics for a project
 */
export function useCommitStats(
  projectId: number,
  dateFilter?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'stats', projectId, dateFilter?.since?.toISOString()],
    () => commitsApi.getCommitStats(projectId, dateFilter),
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook for comprehensive commit analytics across projects
 */
export function useCommitAnalytics(
  projectIds: number[],
  dateRange?: DateRangeFilter,
  enabled: boolean = true
) {
  return useApiQuery(
    ['commits', 'analytics', projectIds.sort(), dateRange?.since?.toISOString()],
    async () => {
      const commits = await commitsApi.batchFetchCommits(projectIds, dateRange);

      // Calculate basic statistics
      const totalCommits = commits.length;
      const uniqueAuthors = [...new Set(commits.map(c => c.author_email))];

      // Group commits by day
      const commitsByDay: Record<string, number> = {};
      commits.forEach(commit => {
        const day = new Date(commit.authored_date).toISOString().split('T')[0];
        commitsByDay[day] = (commitsByDay[day] || 0) + 1;
      });

      // Group commits by author
      const commitsByAuthor: Record<string, number> = {};
      commits.forEach(commit => {
        const author = commit.author_email;
        commitsByAuthor[author] = (commitsByAuthor[author] || 0) + 1;
      });

      // Group commits by project
      const commitsByProject: Record<number, number> = {};
      projectIds.forEach(projectId => {
        commitsByProject[projectId] = commits.filter(c => c.project_id === projectId).length;
      });

      // Calculate average commits per day
      const dateKeys = Object.keys(commitsByDay);
      const avgCommitsPerDay = dateKeys.length > 0 
        ? Object.values(commitsByDay).reduce((sum, count) => sum + count, 0) / dateKeys.length
        : 0;

      // Find most active authors
      const topAuthors = Object.entries(commitsByAuthor)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([email, count]) => ({ email, count }));

      return {
        totalCommits,
        uniqueAuthors: uniqueAuthors.length,
        avgCommitsPerDay,
        commitsByDay,
        commitsByAuthor,
        commitsByProject,
        topAuthors,
        commits,
      };
    },
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectIds.length > 0,
    }
  );
}