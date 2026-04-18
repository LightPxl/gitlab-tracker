import { projectsApi } from '@/api';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';
import { useApiQuery, useBatchOperation } from './useApiQuery';
import { GitLabProject } from '@/types/gitlab';

/**
 * Hook to get paginated projects
 */
export function useProjects(page: number = 1, perPage: number = 10) {
  return useApiQuery(
    QUERY_KEYS.projectsPaginated(page, perPage),
    () => projectsApi.getProjects({ page, perPage }),
    {
      ...QUERY_CONFIGS.PROJECTS,
      placeholderData: (prev) => prev,
    }
  );
}

/**
 * Hook to get all projects (expensive operation)
 */
export function useAllProjects(enabled: boolean = false) {
  return useApiQuery(
    QUERY_KEYS.projectsAll,
    () => projectsApi.getAllProjects(),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled,
    }
  );
}

/**
 * Hook to get single project
 */
export function useProject(projectId: number, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.project(projectId),
    () => projectsApi.getProject(projectId),
    {
      ...QUERY_CONFIGS.PROJECTS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to search projects
 */
export function useSearchProjects(query: string, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.search(query),
    () => projectsApi.searchProjects(query),
    {
      ...QUERY_CONFIGS.PROJECTS,
      enabled: enabled && query.length > 2,
    }
  );
}

/**
 * Hook to get project contributors
 */
export function useProjectContributors(projectId: number, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.projectContributors(projectId),
    () => projectsApi.getProjectContributors(projectId),
    {
      ...QUERY_CONFIGS.PROJECTS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get project users/members
 */
export function useProjectUsers(projectId: number, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.projectUsers(projectId),
    () => projectsApi.getProjectUsers(projectId),
    {
      ...QUERY_CONFIGS.PROJECTS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook to get project statistics
 */
export function useProjectStatistics(projectId: number, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.projectStatistics(projectId),
    () => projectsApi.getProjectStatistics(projectId),
    {
      ...QUERY_CONFIGS.STATISTICS,
      enabled: enabled && projectId > 0,
    }
  );
}

/**
 * Hook for batch processing projects with progress tracking
 */
export function useBatchProcessProjects<T>(
  projects: GitLabProject[],
  processor: (project: GitLabProject) => Promise<T>,
  options?: {
    enabled?: boolean;
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  }
) {
  return useBatchOperation(projects, processor, options);
}

/**
 * Hook to get projects with enriched data (contributors, stats, etc.)
 */
export function useEnrichedProjects(projectIds: number[], enabled: boolean = true) {
  const projectsQuery = useApiQuery(
    ['projects', 'enriched', projectIds.sort()],
    async () => {
      if (!projectIds.length) return [];
      
      // Get basic project data first
      const projects = await Promise.all(
        projectIds.map(id => projectsApi.getProject(id).catch(() => null))
      );
      
      const validProjects = projects.filter(Boolean) as GitLabProject[];
      
      // Enrich with additional data
      const enrichedProjects = await Promise.all(
        validProjects.map(async (project) => {
          try {
            const [contributors, users] = await Promise.all([
              projectsApi.getProjectContributors(project.id).catch(() => []),
              projectsApi.getProjectUsers(project.id).catch(() => []),
            ]);
            
            return {
              ...project,
              contributors,
              users,
            };
          } catch (error) {
            return project;
          }
        })
      );
      
      return enrichedProjects;
    },
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled: enabled && projectIds.length > 0,
    }
  );

  return projectsQuery;
}