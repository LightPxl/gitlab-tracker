import { gitlabHttpClient } from './gitlab-http-client';

export class MiscApiClient {
  /**
   * Get user events (activity feed)
   */
  async getEvents(): Promise<any[]> {
    return gitlabHttpClient.get<any[]>('/events', {
      params: {
        per_page: '100',
        action: 'pushed',
      },
    });
  }

  /**
   * Get user's todos
   */
  async getTodos(): Promise<any[]> {
    return gitlabHttpClient.get<any[]>('/todos', {
      params: {
        state: 'pending',
        per_page: '20',
      },
    });
  }

  /**
   * Mark todo as done
   */
  async markTodoAsDone(todoId: string): Promise<void> {
    return gitlabHttpClient.post(`/todos/${todoId}/mark_as_done`);
  }

  /**
   * Get project milestones
   */
  async getProjectMilestones(projectId: number): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/projects/${projectId}/milestones`, {
      params: {
        state: 'active',
      },
    });
  }

  /**
   * Get system version info
   */
  async getVersion(): Promise<any> {
    try {
      return gitlabHttpClient.get<any>('/version');
    } catch (error) {
      // Version endpoint might not be available in all GitLab instances
      return null;
    }
  }

  /**
   * Get application settings (if available)
   */
  async getApplicationSettings(): Promise<any> {
    try {
      return gitlabHttpClient.get<any>('/application/settings');
    } catch (error) {
      // Settings endpoint requires admin access
      return null;
    }
  }

  /**
   * Get features flags (if available)
   */
  async getFeatureFlags(): Promise<any> {
    try {
      return gitlabHttpClient.get<any>('/features');
    } catch (error) {
      // Features endpoint might not be available
      return null;
    }
  }
}

export const miscApi = new MiscApiClient();