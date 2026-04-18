// API Clients
export { GitLabHttpClient, gitlabHttpClient } from './clients/gitlab-http-client';
export { ProjectsApiClient, projectsApi } from './clients/projects-api';
export { IssuesApiClient, issuesApi } from './clients/issues-api';
export { MergeRequestsApiClient, mergeRequestsApi } from './clients/merge-requests-api';
export { PipelinesApiClient, pipelinesApi } from './clients/pipelines-api';
export { CommitsApiClient, commitsApi } from './clients/commits-api';
export { UsersApiClient, GroupsApiClient, usersApi, groupsApi } from './clients/users-groups-api';
export { MiscApiClient, miscApi } from './clients/misc-api';

// Import for internal use in GitLabApi class
import { projectsApi as projectsApiInstance } from './clients/projects-api';
import { issuesApi as issuesApiInstance } from './clients/issues-api';
import { mergeRequestsApi as mergeRequestsApiInstance } from './clients/merge-requests-api';
import { pipelinesApi as pipelinesApiInstance } from './clients/pipelines-api';
import { commitsApi as commitsApiInstance } from './clients/commits-api';
import { usersApi as usersApiInstance, groupsApi as groupsApiInstance } from './clients/users-groups-api';
import { miscApi as miscApiInstance } from './clients/misc-api';

// Types
export type {
  ApiResponse,
  ApiError,
  PaginationParams,
  DateRangeFilter,
  QueryOptions,
  Repository,
  HttpClient,
  RequestConfig,
  CacheStrategy,
  QueryConfig,
  BatchConfig,
} from './types/common';

// Error Handling
export { ApiErrorHandler, RetryStrategy } from './error-handling';

// Query Configuration
export {
  QUERY_CONFIGS,
  QUERY_KEYS,
  getQueryConfig,
  INVALIDATION_PATTERNS,
} from './query-config';

// Main API facade - provides a unified interface
export class GitLabApi {
  static projects = projectsApiInstance;
  static issues = issuesApiInstance;
  static mergeRequests = mergeRequestsApiInstance;
  static pipelines = pipelinesApiInstance;
  static commits = commitsApiInstance;
  static users = usersApiInstance;
  static groups = groupsApiInstance;
  static misc = miscApiInstance;

  // Connection and health checks
  static async checkConnection(): Promise<boolean> {
    return usersApiInstance.checkConnection();
  }

  // Batch operations across multiple resources
  static async getDashboardData(projectIds: number[]) {
    const [
      projects,
      commits,
      pipelines,
      incidents,
      mergeRequests,
      issues,
      closedIssues
    ] = await Promise.allSettled([
      this.projects.batchProcessProjects(
        await this.projects.getAllProjects(),
        (project) => Promise.resolve(project)
      ),
      this.commits.batchFetchCommits(projectIds),
      this.pipelines.batchFetchRecentPipelines(projectIds),
      this.issues.getIncidents(projectIds),
      this.mergeRequests.batchFetchMergeRequests(projectIds),
      this.issues.batchFetchIssues(projectIds, 'opened'),
      this.issues.batchFetchIssues(projectIds, 'closed'),
    ]);

    return {
      projects: projects.status === 'fulfilled' ? projects.value : [],
      commits: commits.status === 'fulfilled' ? commits.value : [],
      pipelines: pipelines.status === 'fulfilled' ? pipelines.value : [],
      incidents: incidents.status === 'fulfilled' ? incidents.value : [],
      mergeRequests: mergeRequests.status === 'fulfilled' ? mergeRequests.value : [],
      issues: issues.status === 'fulfilled' ? issues.value : [],
      closedIssues: closedIssues.status === 'fulfilled' ? closedIssues.value : [],
    };
  }
}

// Default export for convenience
export default GitLabApi;