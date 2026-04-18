import { gitlabHttpClient } from './gitlab-http-client';
import { PaginationParams, DateRangeFilter } from '@/api/types/common';
import { GitLabProject } from '@/types/gitlab';

// Cache for accessible project IDs (persists during session)
const accessibleProjectsCache = new Set<number>();
const inaccessibleProjectsCache = new Set<number>();

export class ProjectsApiClient {
  /**
   * Check if a project has accessible repository
   * Uses a lightweight HEAD-like check
   */
  private async isProjectAccessible(projectId: number): Promise<boolean> {
    // Return cached result if available
    if (accessibleProjectsCache.has(projectId)) return true;
    if (inaccessibleProjectsCache.has(projectId)) return false;

    try {
      // Try to access repository branches (lightweight endpoint)
      // Use silentOnAccessDenied to avoid console noise
      const result = await gitlabHttpClient.get<any[]>(`/projects/${projectId}/repository/branches`, {
        params: { per_page: '1' },
        timeout: 3000,
        silentOnAccessDenied: true,
        defaultValue: null, // null means inaccessible
      });
      
      if (result === null) {
        inaccessibleProjectsCache.add(projectId);
        return false;
      }
      
      accessibleProjectsCache.add(projectId);
      return true;
    } catch {
      inaccessibleProjectsCache.add(projectId);
      return false;
    }
  }

  /**
   * Filter projects to only include accessible ones
   * Runs checks in parallel for speed
   */
  async filterAccessibleProjects(projects: GitLabProject[]): Promise<GitLabProject[]> {
    // Quick path: check cache first
    const uncheckedProjects = projects.filter(p => 
      !accessibleProjectsCache.has(p.id) && !inaccessibleProjectsCache.has(p.id)
    );
    
    // Check uncached projects in parallel (batches of 20)
    if (uncheckedProjects.length > 0) {
      const batchSize = 20;
      for (let i = 0; i < uncheckedProjects.length; i += batchSize) {
        const batch = uncheckedProjects.slice(i, i + batchSize);
        await Promise.all(batch.map(p => this.isProjectAccessible(p.id)));
      }
    }

    // Return only accessible projects
    return projects.filter(p => accessibleProjectsCache.has(p.id));
  }

  /**
   * Get accessible project IDs from a list
   */
  getAccessibleProjectIds(projectIds: number[]): number[] {
    return projectIds.filter(id => 
      accessibleProjectsCache.has(id) || !inaccessibleProjectsCache.has(id)
    );
  }

  /**
   * Clear accessibility cache (useful when token changes)
   */
  clearAccessibilityCache(): void {
    accessibleProjectsCache.clear();
    inaccessibleProjectsCache.clear();
  }

  /**
   * Get paginated projects
   */
  async getProjects(params: PaginationParams = {}): Promise<GitLabProject[]> {
    const { page = 1, perPage = 10 } = params;
    
    return gitlabHttpClient.get<GitLabProject[]>('/projects', {
      params: {
        order_by: 'last_activity_at',
        sort: 'desc',
        page: page.toString(),
        per_page: perPage.toString(),
      },
    });
  }

  /**
   * Get all projects with automatic pagination
   * Automatically filters out inaccessible projects
   */
  async getAllProjects(filterAccessible = true): Promise<GitLabProject[]> {
    const allProjects: GitLabProject[] = [];
    let page = 1;
    const perPage = 20;
    let hasMore = true;

    while (hasMore && page <= 50) { // Safety limit
      try {
        const projects = await this.getProjects({ page, perPage });
        
        if (!projects || projects.length === 0) {
          hasMore = false;
        } else {
          allProjects.push(...projects);
          hasMore = projects.length === perPage;
          page++;
        }
      } catch (error) {
        console.error('Error fetching projects page', page, error);
        hasMore = false;
      }
    }

    // Filter to accessible projects only (runs access checks in parallel)
    if (filterAccessible) {
      return this.filterAccessibleProjects(allProjects);
    }

    return allProjects;
  }

  /**
   * Get single project by ID
   */
  async getProject(projectId: number): Promise<GitLabProject> {
    return gitlabHttpClient.get<GitLabProject>(`/projects/${projectId}`);
  }

  /**
   * Search projects by query
   */
  async searchProjects(query: string): Promise<GitLabProject[]> {
    return gitlabHttpClient.get<GitLabProject[]>('/projects', {
      params: {
        search: query,
        min_access_level: '30',
        per_page: '10',
      },
    });
  }

  /**
   * Get project contributors
   */
  async getProjectContributors(projectId: number): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/repository/contributors`, {
      params: {
        order_by: 'commits',
        sort: 'desc',
      },
    });
  }

  /**
   * Get project users (members)
   */
  async getProjectUsers(projectId: number): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/users`, {
      params: {
        per_page: '50',
      },
    });
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId: number): Promise<any> {
    return gitlabHttpClient.get<any>(`/projects/${projectId}`, {
      params: {
        statistics: 'true',
      },
    });
  }

  /**
   * Batch process projects with rate limiting
   */
  async batchProcessProjects<T>(
    projects: GitLabProject[],
    processor: (project: GitLabProject) => Promise<T>,
    options?: {
      batchSize?: number;
      concurrency?: number;
      delayMs?: number;
    }
  ): Promise<T[]> {
    return gitlabHttpClient.batchProcess(projects, processor, options);
  }
}

export const projectsApi = new ProjectsApiClient();