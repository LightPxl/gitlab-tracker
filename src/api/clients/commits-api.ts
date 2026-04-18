import { gitlabHttpClient } from './gitlab-http-client';
import { PaginationParams, DateRangeFilter } from '@/api/types/common';
import { GitLabCommit } from '@/types/gitlab';

export class CommitsApiClient {
  /**
   * Get commits for a specific project
   */
  async getProjectCommits(
    projectId: number,
    params: PaginationParams & {
      ref?: string;
      since?: Date;
      until?: Date;
      path?: string;
    } = {}
  ): Promise<GitLabCommit[]> {
    const { page = 1, perPage = 20, ref, since, until, path } = params;
    
    const queryParams: Record<string, string> = {
      page: page.toString(),
      per_page: perPage.toString(),
    };

    if (ref) queryParams.ref_name = ref;
    if (since) queryParams.since = since.toISOString();
    if (until) queryParams.until = until.toISOString();
    if (path) queryParams.path = path;

    return gitlabHttpClient.get<GitLabCommit[]>(`/projects/${projectId}/repository/commits`, {
      params: queryParams,
    });
  }

  /**
   * Get all commits for a project with automatic pagination
   * Optimized: Fewer pages when date filter is set (short date range = less data)
   */
  async getAllProjectCommits(
    projectId: number,
    dateFilter?: DateRangeFilter
  ): Promise<GitLabCommit[]> {
    const allCommits: GitLabCommit[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;
    
    // Short date range = limit pages for speed, no filter = fetch all
    const maxPages = dateFilter ? 3 : 100;

    while (hasMore && page <= maxPages) {
      try {
        const params: Record<string, string> = {
          page: page.toString(),
          per_page: perPage.toString(),
        };

        if (dateFilter?.since) {
          params.since = dateFilter.since.toISOString();
        }
        if (dateFilter?.until) {
          params.until = dateFilter.until.toISOString();
        }

        const commits = await gitlabHttpClient.get<GitLabCommit[]>(
          `/projects/${projectId}/repository/commits`,
          { params, silentOnAccessDenied: true, defaultValue: [] }
        );

        if (!commits || commits.length === 0) {
          hasMore = false;
        } else {
          allCommits.push(...commits.map(commit => ({ ...commit, project_id: projectId })));
          hasMore = commits.length === perPage;
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

    return allCommits;
  }

  /**
   * Batch fetch commits for multiple projects
   * Optimized: Maximum concurrency when date filter is set (less data per request)
   */
  async batchFetchCommits(
    projectIds: number[],
    dateFilter?: DateRangeFilter
  ): Promise<GitLabCommit[]> {
    if (!projectIds || projectIds.length === 0) return [];

    // When date filter is set, we can use maximum concurrency (smaller responses)
    const hasDateFilter = !!dateFilter;
    
    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getAllProjectCommits(projectId, dateFilter),
      {
        batchSize: hasDateFilter ? 20 : 8,      // Much larger batches for filtered queries
        concurrency: hasDateFilter ? 15 : 5,    // Maximum concurrency for filtered queries
        delayMs: hasDateFilter ? 5 : 50,        // Minimal delay for filtered queries
      }
    );

    return results.flat();
  }

  /**
   * Get single commit
   */
  async getCommit(projectId: number, commitSha: string): Promise<GitLabCommit> {
    return gitlabHttpClient.get<GitLabCommit>(`/projects/${projectId}/repository/commits/${commitSha}`);
  }

  /**
   * Get commit diff
   */
  async getCommitDiff(projectId: number, commitSha: string): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/repository/commits/${commitSha}/diff`);
  }

  /**
   * Get commit comments
   */
  async getCommitComments(projectId: number, commitSha: string): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/repository/commits/${commitSha}/comments`);
  }

  /**
   * Get commits by author
   */
  async getCommitsByAuthor(
    projectId: number,
    authorEmail: string,
    dateFilter?: DateRangeFilter
  ): Promise<GitLabCommit[]> {
    const allCommits = await this.getAllProjectCommits(projectId, dateFilter);
    return allCommits.filter(commit => commit.author_email === authorEmail);
  }

  /**
   * Get recent commits across multiple projects for dashboard
   */
  async getRecentCommitsForProjects(
    projectIds: number[],
    limit: number = 20
  ): Promise<GitLabCommit[]> {
    if (!projectIds || projectIds.length === 0) return [];

    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getProjectCommits(projectId, { perPage: Math.ceil(limit / projectIds.length) }),
      {
        batchSize: 10,
        concurrency: 4,
        delayMs: 100,
      }
    );

    const allCommits = results.flat();
    
    // Sort by commit date and return the most recent
    return allCommits
      .sort((a, b) => new Date(b.authored_date).getTime() - new Date(a.authored_date).getTime())
      .slice(0, limit);
  }

  /**
   * Get commit statistics for a project
   */
  async getCommitStats(projectId: number, dateFilter?: DateRangeFilter): Promise<{
    totalCommits: number;
    authors: string[];
    commitsByDay: Record<string, number>;
  }> {
    const commits = await this.getAllProjectCommits(projectId, dateFilter);
    
    const authors = [...new Set(commits.map(c => c.author_email))];
    const commitsByDay: Record<string, number> = {};
    
    commits.forEach(commit => {
      const day = new Date(commit.authored_date).toISOString().split('T')[0];
      commitsByDay[day] = (commitsByDay[day] || 0) + 1;
    });

    return {
      totalCommits: commits.length,
      authors,
      commitsByDay,
    };
  }
}

export const commitsApi = new CommitsApiClient();