import { gitlabHttpClient } from './gitlab-http-client';
import { PaginationParams, DateRangeFilter } from '@/api/types/common';
import { GitLabPipeline } from '@/types/gitlab';

export class PipelinesApiClient {
  /**
   * Get pipelines for a specific project
   */
  async getProjectPipelines(
    projectId: number,
    params: PaginationParams & {
      status?: 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped';
      ref?: string;
    } = {}
  ): Promise<GitLabPipeline[]> {
    const { page = 1, perPage = 20, status, ref } = params;
    
    const queryParams: Record<string, string> = {
      page: page.toString(),
      per_page: perPage.toString(),
    };

    if (status) queryParams.status = status;
    if (ref) queryParams.ref = ref;

    return gitlabHttpClient.get<GitLabPipeline[]>(`/projects/${projectId}/pipelines`, {
      params: queryParams,
    });
  }

  /**
   * Get recent pipelines for a project
   */
  async getRecentPipelines(projectId: number): Promise<GitLabPipeline[]> {
    return this.getProjectPipelines(projectId, { perPage: 10 });
  }

  /**
   * Get global recent pipelines
   */
  async getGlobalRecentPipelines(): Promise<GitLabPipeline[]> {
    return gitlabHttpClient.get<GitLabPipeline[]>('/pipelines', {
      params: {
        scope: 'active',
        per_page: '20',
      },
    });
  }

  /**
   * Get production pipelines (successful on main/master branch)
   */
  async getProductionPipelines(projectId: number): Promise<GitLabPipeline[]> {
    return gitlabHttpClient.get<GitLabPipeline[]>(`/projects/${projectId}/pipelines`, {
      params: {
        status: 'success',
        ref: 'main',
        per_page: '20',
      },
    });
  }

  /**
   * Batch fetch production pipelines for multiple projects
   */
  async batchFetchProductionPipelines(projectIds: number[]): Promise<GitLabPipeline[]> {
    if (!projectIds || projectIds.length === 0) return [];

    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getProductionPipelines(projectId),
      {
        batchSize: 10,
        concurrency: 3,
        delayMs: 100,
      }
    );

    return results.flat();
  }

  /**
   * Batch fetch recent pipelines for multiple projects
   */
  async batchFetchRecentPipelines(projectIds: number[]): Promise<GitLabPipeline[]> {
    if (!projectIds || projectIds.length === 0) return [];

    const results = await gitlabHttpClient.batchProcess(
      projectIds,
      (projectId) => this.getRecentPipelines(projectId),
      {
        batchSize: 10,
        concurrency: 4,
        delayMs: 50,
      }
    );

    return results.flat();
  }

  /**
   * Get single pipeline
   */
  async getPipeline(projectId: number, pipelineId: number): Promise<GitLabPipeline> {
    return gitlabHttpClient.get<GitLabPipeline>(`/projects/${projectId}/pipelines/${pipelineId}`);
  }

  /**
   * Get pipeline jobs
   */
  async getPipelineJobs(projectId: number, pipelineId: number): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/pipelines/${pipelineId}/jobs`);
  }

  /**
   * Get pipeline test report
   */
  async getPipelineTestReport(projectId: number, pipelineId: number): Promise<any> {
    try {
      return gitlabHttpClient.get<any>(`/projects/${projectId}/pipelines/${pipelineId}/test_report`);
    } catch (error) {
      // Test reports might not be available for all pipelines
      console.warn('Failed to fetch pipeline test report', error);
      return null;
    }
  }

  /**
   * Get latest pipeline for each project (useful for coverage data)
   */
  async getLatestPipelinesMap(projectIds: number[]): Promise<Record<number, GitLabPipeline>> {
    if (!projectIds || projectIds.length === 0) return {};

    const map: Record<number, GitLabPipeline> = {};

    await gitlabHttpClient.batchProcess(
      projectIds,
      async (projectId) => {
        try {
          const pipelines = await this.getRecentPipelines(projectId);
          if (pipelines && pipelines.length > 0) {
            map[projectId] = pipelines[0];
          }
        } catch (error) {
          console.warn(`Failed to fetch pipeline for project ${projectId}`, error);
        }
        return null;
      },
      {
        batchSize: 10,
        concurrency: 4,
        delayMs: 50,
      }
    );

    return map;
  }

  /**
   * Retry a pipeline
   */
  async retryPipeline(projectId: number, pipelineId: number): Promise<GitLabPipeline> {
    return gitlabHttpClient.post<GitLabPipeline>(`/projects/${projectId}/pipelines/${pipelineId}/retry`);
  }

  /**
   * Cancel a pipeline
   */
  async cancelPipeline(projectId: number, pipelineId: number): Promise<GitLabPipeline> {
    return gitlabHttpClient.post<GitLabPipeline>(`/projects/${projectId}/pipelines/${pipelineId}/cancel`);
  }
}

export const pipelinesApi = new PipelinesApiClient();