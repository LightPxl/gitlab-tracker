import { usersApi } from '@/api';
import { QUERY_KEYS, QUERY_CONFIGS } from '@/api/query-config';
import { useApiQuery } from './useApiQuery';
import { GitLabUser } from '@/types/gitlab';
import { useQuery } from '@tanstack/react-query';
import { gitlabService } from '@/services/gitlab';

/**
 * Hook to get current authenticated user
 */
export function useCurrentUser() {
  return useApiQuery(
    QUERY_KEYS.user,
    () => usersApi.getCurrentUser(),
    QUERY_CONFIGS.USER
  );
}

/**
 * Hook to get user by ID
 */
export function useUser(userId: number, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.userProfile(userId),
    () => usersApi.getUser(userId),
    {
      ...QUERY_CONFIGS.USER,
      enabled: enabled && userId > 0,
    }
  );
}

/**
 * Hook to batch fetch project members for multiple projects
 */
export function useBatchProjectMembers(projectIds: number[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['batch-project-members', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];

      // Fetch members for each project
      const promises = projectIds.map(id =>
        gitlabService.getProjectUsers(id)
          .catch(err => {
            console.warn(`Failed to fetch members for project ${id}:`, err);
            return [];
          })
      );

      const results = await Promise.all(promises);
      
      // Return array of { projectId, members }
      return projectIds.map((id, index) => ({
        projectId: id,
        members: results[index] || []
      }));
    },
    enabled: enabled && projectIds.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}


/**
 * Hook to get paginated users
 */
export function useUsers(page: number = 1, perPage: number = 20) {
  return useApiQuery(
    ['users', 'paginated', page, perPage],
    () => usersApi.getUsers({ page, perPage }),
    {
      ...QUERY_CONFIGS.USER,
      placeholderData: (prev) => prev,
    }
  );
}

/**
 * Hook to get all users (expensive operation, use sparingly)
 */
export function useAllUsers(enabled: boolean = false) {
  return useApiQuery(
    ['users', 'all'],
    () => usersApi.getAllUsers(),
    {
      ...QUERY_CONFIGS.BATCH_OPERATIONS,
      enabled,
    }
  );
}

/**
 * Hook to search users
 */
export function useSearchUsers(query: string, enabled: boolean = true) {
  return useApiQuery(
    ['users', 'search', query],
    () => usersApi.searchUsers(query),
    {
      ...QUERY_CONFIGS.USER,
      enabled: enabled && query.length > 2,
    }
  );
}

/**
 * Hook to check GitLab connection
 */
export function useConnectionCheck() {
  return useApiQuery(
    ['connection', 'check'],
    () => usersApi.checkConnection(),
    {
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    }
  );
}