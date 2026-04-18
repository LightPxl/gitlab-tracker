import { gitlabHttpClient } from './gitlab-http-client';
import { PaginationParams, DateRangeFilter } from '@/api/types/common';
import { GitLabMergeRequest } from '@/types/gitlab';

export class MergeRequestsApiClient {
  /**
   * Get merge requests for a specific project
   */
  async getProjectMergeRequests(
    projectId: number,
    state: 'opened' | 'closed' | 'merged' | 'all' = 'opened',
    params: PaginationParams = {}
  ): Promise<GitLabMergeRequest[]> {
    const { page = 1, perPage = 20 } = params;
    
    return gitlabHttpClient.get<GitLabMergeRequest[]>(`/projects/${projectId}/merge_requests`, {
      params: {
        state,
        page: page.toString(),
        per_page: perPage.toString(),
      },
    });
  }

  /**
   * Get all merge requests for a project with automatic pagination
   * Optimized: Fewer pages when date filter is set (short date range = less data)
   */
  async getAllProjectMergeRequests(
    projectId: number,
    dateFilter?: DateRangeFilter
  ): Promise<GitLabMergeRequest[]> {
    const allMRs: GitLabMergeRequest[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    
    // Short date range = limit pages for speed, no filter = fetch all
    const maxPages = dateFilter ? 3 : 50;

    while (hasMore && page <= maxPages) {
      try {
        const params: Record<string, string> = {
          state: 'all',
          page: page.toString(),
          per_page: perPage.toString(),
        };

        if (dateFilter?.since) {
          params.created_after = dateFilter.since.toISOString();
        }
        if (dateFilter?.until) {
          params.created_before = dateFilter.until.toISOString();
        }

        const mrs = await gitlabHttpClient.get<GitLabMergeRequest[]>(
          `/projects/${projectId}/merge_requests`, 
          { params, silentOnAccessDenied: true, defaultValue: [] }
        );

        if (!mrs || mrs.length === 0) {
          hasMore = false;
        } else {
          allMRs.push(...mrs);
          hasMore = mrs.length === perPage;
          page++;
        }
      } catch {
        // Silent fail - project may be deleted or inaccessible
        hasMore = false;
      }
    }

    return allMRs;
  }

  /**
   * Get global merge requests across all projects
   */
  async getGlobalMergeRequests(
    state: 'opened' | 'closed' | 'merged' | 'all' = 'opened',
    params: PaginationParams = {}
  ): Promise<GitLabMergeRequest[]> {
    const { page = 1, perPage = 20 } = params;
    
    return gitlabHttpClient.get<GitLabMergeRequest[]>('/merge_requests', {
      params: {
        state,
        scope: 'all',
        page: page.toString(),
        per_page: perPage.toString(),
      },
    });
  }

  /**
   * Batch fetch merge requests for multiple projects
   * Optimized: Maximum concurrency when date filter is set
   */
  async batchFetchMergeRequests(
    projectIds: number[],
    dateFilter?: DateRangeFilter
  ): Promise<GitLabMergeRequest[]> {
    if (!projectIds || projectIds.length === 0) return [];

    const hasDateFilter = !!dateFilter;
    
    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getAllProjectMergeRequests(projectId, dateFilter),
      {
        batchSize: hasDateFilter ? 25 : 12,
        concurrency: hasDateFilter ? 15 : 6,
        delayMs: hasDateFilter ? 5 : 30,
      }
    );

    return results.flat();
  }

  /**
   * Get single merge request
   */
  async getMergeRequest(projectId: number, mergeRequestIid: number): Promise<GitLabMergeRequest> {
    return gitlabHttpClient.get<GitLabMergeRequest>(`/projects/${projectId}/merge_requests/${mergeRequestIid}`);
  }

  /**
   * Get merge request changes
   */
  async getMergeRequestChanges(projectId: number, mergeRequestIid: number): Promise<any> {
    return gitlabHttpClient.get<any>(`/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`);
  }

  /**
   * Get merge request commits
   */
  async getMergeRequestCommits(projectId: number, mergeRequestIid: number): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/merge_requests/${mergeRequestIid}/commits`);
  }

  /**
   * Get merge request approvals
   */
  async getMergeRequestApprovals(projectId: number, mergeRequestIid: number): Promise<any> {
    try {
      return gitlabHttpClient.get<any>(`/projects/${projectId}/merge_requests/${mergeRequestIid}/approvals`);
    } catch (error) {
      // Approvals might not be available in all GitLab instances
      console.warn('Failed to fetch MR approvals', error);
      return null;
    }
  }
}

export const mergeRequestsApi = new MergeRequestsApiClient();