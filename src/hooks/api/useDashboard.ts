import { 
  useCurrentUser,
} from './useUsers';
import {
  useAllProjects,
} from './useProjects';
import {
  useBatchIssues,
} from './useIssues';
import {
  useBatchCommits,
} from './useCommits';
import { useLoadingState } from './useApiQuery';
import { DateRangeFilter } from '@/api/types/common';
import { isInternalEmail } from '@/lib/utils';

/**
 * Dashboard data hook - optimized for fast loading
 * Only fetches essential data: projects, issues, commits
 * Removed for speed: pipelines, merge requests, incidents
 */
export function useDashboardData(options?: {
  dateRange?: DateRangeFilter;
  enabled?: boolean;
}) {
  const { dateRange, enabled = true } = options || {};

  // Get all projects first
  const allProjectsQuery = useAllProjects(enabled);
  const projectIds = allProjectsQuery.data?.map(p => p.id) ?? [];
  const hasProjects = projectIds.length > 0;

  // Core dashboard queries - only fetch when we have projects
  const issuesQuery = useBatchIssues(projectIds, 'opened', dateRange, enabled && hasProjects);
  const closedIssuesQuery = useBatchIssues(projectIds, 'closed', dateRange, enabled && hasProjects);
  const commitsQuery = useBatchCommits(projectIds, dateRange, enabled && hasProjects);

  // Current user for context
  const currentUserQuery = useCurrentUser();

  // Aggregate loading state
  const loadingState = useLoadingState([
    allProjectsQuery,
    issuesQuery,
    closedIssuesQuery,
    commitsQuery,
    currentUserQuery,
  ]);

  // Safe data access - always return arrays, never null
  // Filter commits to internal employees only (@lightpxl.com)
  const projects = allProjectsQuery.data ?? [];
  const openIssues = issuesQuery.data ?? [];
  const closedIssues = closedIssuesQuery.data ?? [];
  const commits = (commitsQuery.data ?? []).filter(c => isInternalEmail(c.author_email));

  return {
    // Raw data with safe defaults
    projects,
    openIssues,
    closedIssues,
    commits,
    currentUser: currentUserQuery.data ?? null,

    // Computed flags for conditional rendering
    hasProjects: projects.length > 0,
    hasIssues: openIssues.length > 0 || closedIssues.length > 0,
    hasCommits: commits.length > 0,

    // Loading states - granular for progressive loading
    ...loadingState,
    isLoadingProjects: allProjectsQuery.loading,
    isLoadingIssues: issuesQuery.loading || closedIssuesQuery.loading,
    isLoadingCommits: commitsQuery.loading,

    // Refetch methods - returns Promise for awaiting
    refetch: async () => {
      await allProjectsQuery.refetch();
      if (hasProjects) {
        await Promise.all([
          issuesQuery.refetch(),
          closedIssuesQuery.refetch(),
          commitsQuery.refetch(),
        ]);
      }
    },

    // Individual query objects for fine-grained control
    queries: {
      allProjects: allProjectsQuery,
      issues: issuesQuery,
      closedIssues: closedIssuesQuery,
      commits: commitsQuery,
      currentUser: currentUserQuery,
    },
  };
}