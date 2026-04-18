import { QueryConfig } from '@/api/types/common';

// Different cache strategies for different types of data
export const QUERY_CONFIGS: Record<string, QueryConfig> = {
  // User data changes rarely
  USER: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  },

  // Projects change moderately
  PROJECTS: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  },

  // Issues and MRs change frequently
  ISSUES: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    refetchOnWindowFocus: true,
  },

  // Pipelines change very frequently
  PIPELINES: {
    staleTime: 15 * 1000, // 15 seconds
    cacheTime: 60 * 1000, // 1 minute
    retry: 1,
    refetchOnWindowFocus: true,
  },

  // Dashboard data (aggregated) - optimized for faster perceived loading
  DASHBOARD: {
    staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time to reduce refetching
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 0, // Don't retry - let data load progressively
    refetchOnWindowFocus: false,
  },

  // Heavy operations (batch fetches) - longer cache for performance
  BATCH_OPERATIONS: {
    staleTime: 10 * 60 * 1000, // 10 minutes - data doesn't change that fast
    cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 0, // Don't retry batch operations - they handle errors internally
    refetchOnWindowFocus: false,
  },

  // Statistics and reports - longer cache
  STATISTICS: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  },
};

// Query key factories for consistent caching
export const QUERY_KEYS = {
  // User
  user: ['user'] as const,
  userProfile: (id: number) => ['user', 'profile', id] as const,

  // Projects
  projects: ['projects'] as const,
  projectsPaginated: (page: number, perPage: number) => ['projects', 'paginated', page, perPage] as const,
  projectsAll: ['projects', 'all'] as const,
  project: (id: number) => ['projects', id] as const,
  projectUsers: (id: number) => ['projects', id, 'users'] as const,
  projectContributors: (id: number) => ['projects', id, 'contributors'] as const,

  // Groups
  groups: ['groups'] as const,
  group: (id: number) => ['groups', id] as const,
  groupProjects: (id: string | number) => ['groups', id, 'projects'] as const,
  subgroups: (id: number) => ['groups', id, 'subgroups'] as const,

  // Issues
  issues: ['issues'] as const,
  projectIssues: (projectId: number, state?: string) => ['issues', 'project', projectId, state] as const,
  allProjectIssues: (projectIds: number[], state?: string) => ['issues', 'projects', projectIds.sort(), state] as const,
  issuesBatch: (projectIds: number[], state?: string, since?: Date, until?: Date) => [
    'issues', 'batch', projectIds.sort(), state, since?.toISOString(), until?.toISOString()
  ] as const,

  // Merge Requests
  mergeRequests: ['merge-requests'] as const,
  projectMRs: (projectId: number, state?: string) => ['merge-requests', 'project', projectId, state] as const,
  allProjectMRs: (projectIds: number[]) => ['merge-requests', 'projects', projectIds.sort()] as const,
  mrsBatch: (projectIds: number[], since?: Date, until?: Date) => [
    'merge-requests', 'batch', projectIds.sort(), since?.toISOString(), until?.toISOString()
  ] as const,

  // Commits
  commits: ['commits'] as const,
  projectCommits: (projectId: number, since?: Date) => [
    'commits', 'project', projectId, since?.toISOString()
  ] as const,
  commitsBatch: (projectIds: number[], since?: Date, until?: Date) => [
    'commits', 'batch', projectIds.sort(), since?.toISOString(), until?.toISOString()
  ] as const,

  // Pipelines
  pipelines: ['pipelines'] as const,
  projectPipelines: (projectId: number) => ['pipelines', 'project', projectId] as const,
  recentPipelines: (projectId?: number) => ['pipelines', 'recent', projectId] as const,
  productionPipelines: (projectIds: number[]) => ['pipelines', 'production', projectIds.sort()] as const,

  // Dashboard
  dashboardData: ['dashboard'] as const,
  dashboardMetrics: (projectIds: number[]) => ['dashboard', 'metrics', projectIds.sort()] as const,

  // Statistics and Reports
  statistics: ['statistics'] as const,
  projectStatistics: (projectId: number) => ['statistics', 'project', projectId] as const,
  developerStats: (projectIds: number[]) => ['statistics', 'developers', projectIds.sort()] as const,

  // Special operations
  incidents: (projectIds: number[]) => ['incidents', projectIds.sort()] as const,
  todos: ['todos'] as const,
  events: ['events'] as const,
  search: (query: string) => ['search', query] as const,
} as const;

// Helper to get query config by type
export function getQueryConfig(type: keyof typeof QUERY_CONFIGS): QueryConfig {
  return QUERY_CONFIGS[type];
}

// Helper to invalidate related queries
export const INVALIDATION_PATTERNS = {
  // When a project is updated, invalidate all project-related data
  PROJECT_UPDATED: (projectId: number) => [
    QUERY_KEYS.project(projectId),
    QUERY_KEYS.projectIssues(projectId),
    QUERY_KEYS.projectMRs(projectId),
    QUERY_KEYS.projectCommits(projectId),
    QUERY_KEYS.projectPipelines(projectId),
    QUERY_KEYS.projectUsers(projectId),
    QUERY_KEYS.projectContributors(projectId),
  ],

  // When user data changes, invalidate user and related data
  USER_UPDATED: () => [
    QUERY_KEYS.user,
    QUERY_KEYS.projects,
    QUERY_KEYS.groups,
  ],

  // When dashboard data needs refresh
  DASHBOARD_REFRESH: () => [
    QUERY_KEYS.dashboardData,
    QUERY_KEYS.projects,
    QUERY_KEYS.pipelines,
  ],
} as const;