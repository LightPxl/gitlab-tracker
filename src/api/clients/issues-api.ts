import { gitlabHttpClient } from './gitlab-http-client';
import { PaginationParams, DateRangeFilter } from '@/api/types/common';
import { GitLabIssue } from '@/types/gitlab';

export class IssuesApiClient {
  /**
   * Get issues for a specific project
   */
  async getProjectIssues(
    projectId: number, 
    state: 'opened' | 'closed' | 'all' = 'opened',
    params: PaginationParams = {}
  ): Promise<GitLabIssue[]> {
    const { page = 1, perPage = 20 } = params;
    
    return gitlabHttpClient.get<GitLabIssue[]>(`/projects/${projectId}/issues`, {
      params: {
        state,
        page: page.toString(),
        per_page: perPage.toString(),
      },
    });
  }

  /**
   * Get all issues for a project with automatic pagination
   * Optimized: Fewer pages when date filter is set (short date range = less data)
   */
  async getAllProjectIssues(
    projectId: number,
    state: 'opened' | 'closed' | 'all' = 'opened',
    dateFilter?: DateRangeFilter
  ): Promise<GitLabIssue[]> {
    const allIssues: GitLabIssue[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    
    // Short date range = limit pages for speed, no filter = fetch all
    const maxPages = dateFilter ? 3 : 100;

    while (hasMore && page <= maxPages) {
      try {
        const params: Record<string, string> = {
          state,
          page: page.toString(),
          per_page: perPage.toString(),
        };

        if (dateFilter?.since) {
          params.created_after = dateFilter.since.toISOString();
        }
        if (dateFilter?.until) {
          params.created_before = dateFilter.until.toISOString();
        }

        const issues = await gitlabHttpClient.get<GitLabIssue[]>(`/projects/${projectId}/issues`, {
          params,
          silentOnAccessDenied: true,
          defaultValue: [],
        });

        if (!issues || issues.length === 0) {
          hasMore = false;
        } else {
          allIssues.push(...issues);
          hasMore = issues.length === perPage;
          page++;
        }
        
        // Yield to prevent blocking (every 5 pages)
        if (page % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch {
        hasMore = false;
      }
    }

    return allIssues;
  }

  /**
   * Get incidents for a project
   */
  async getProjectIncidents(projectId: number): Promise<GitLabIssue[]> {
    try {
      return gitlabHttpClient.get<GitLabIssue[]>(`/projects/${projectId}/issues`, {
        params: {
          issue_type: 'incident',
          per_page: '20',
        },
      });
    } catch {
      // Silent fail - return empty array
      return [];
    }
  }

  /**
   * Get incidents for multiple projects
   * Uses smaller batches to prevent browser freeze
   */
  async getIncidents(projectIds: number[]): Promise<GitLabIssue[]> {
    if (!projectIds || projectIds.length === 0) return [];

    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getProjectIncidents(projectId),
      {
        batchSize: 5,
        concurrency: 3,
        delayMs: 100,
      }
    );

    return results.flat();
  }

  /**
   * Batch fetch issues for multiple projects
   * Optimized: Maximum concurrency when date filter is set
   */
  async batchFetchIssues(
    projectIds: number[],
    state: 'opened' | 'closed' | 'all' = 'opened',
    dateFilter?: DateRangeFilter
  ): Promise<GitLabIssue[]> {
    if (!projectIds || projectIds.length === 0) return [];

    const hasDateFilter = !!dateFilter;
    
    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getAllProjectIssues(projectId, state, dateFilter),
      {
        batchSize: hasDateFilter ? 20 : 8,
        concurrency: hasDateFilter ? 15 : 5,
        delayMs: hasDateFilter ? 5 : 50,
      }
    );

    return results.flat();
  }

  /**
   * Get issue by ID and IID
   */
  async getIssue(projectId: number, issueIid: number): Promise<GitLabIssue> {
    return gitlabHttpClient.get<GitLabIssue>(`/projects/${projectId}/issues/${issueIid}`);
  }

  /**
   * Get issue links/related issues
   */
  async getIssueLinks(projectId: number, issueIid: number): Promise<GitLabIssue[]> {
    try {
      return gitlabHttpClient.get<GitLabIssue[]>(`/projects/${projectId}/issues/${issueIid}/links`);
    } catch (error) {
      console.warn('Failed to fetch issue links', error);
      return [];
    }
  }

  /**
   * Get milestone issues
   */
  async getMilestoneIssues(projectId: number, milestoneId: number): Promise<GitLabIssue[]> {
    return gitlabHttpClient.get<GitLabIssue[]>(`/projects/${projectId}/milestones/${milestoneId}/issues`);
  }
}

export const issuesApi = new IssuesApiClient();