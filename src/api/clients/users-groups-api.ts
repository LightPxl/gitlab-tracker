import { gitlabHttpClient } from './gitlab-http-client';
import { PaginationParams } from '@/api/types/common';
import { GitLabUser, GitLabGroup } from '@/types/gitlab';

export class UsersApiClient {
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<GitLabUser> {
    return gitlabHttpClient.get<GitLabUser>('/user');
  }

  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<GitLabUser> {
    return gitlabHttpClient.get<GitLabUser>(`/users/${userId}`);
  }

  /**
   * Get paginated users
   */
  async getUsers(params: PaginationParams & { active?: boolean } = {}): Promise<GitLabUser[]> {
    const { page = 1, perPage = 20, active = true } = params;
    
    return gitlabHttpClient.get<GitLabUser[]>('/users', {
      params: {
        active: active.toString(),
        page: page.toString(),
        per_page: perPage.toString(),
      },
    });
  }

  /**
   * Get all users with automatic pagination
   */
  async getAllUsers(): Promise<GitLabUser[]> {
    const allUsers: GitLabUser[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore && page <= 50) { // Safety limit
      try {
        const users = await this.getUsers({ page, perPage });
        
        if (!users || users.length === 0) {
          hasMore = false;
        } else {
          allUsers.push(...users);
          hasMore = users.length === perPage;
          page++;
        }
      } catch (error) {
        console.error('Failed to fetch users page', page, error);
        hasMore = false;
      }
    }

    return allUsers;
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<GitLabUser[]> {
    return gitlabHttpClient.get<GitLabUser[]>('/users', {
      params: {
        search: query,
        per_page: '10',
      },
    });
  }

  /**
   * Check connection by getting current user
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
}

export class GroupsApiClient {
  /**
   * Get user's groups
   */
  async getGroups(params: PaginationParams & { minAccessLevel?: number } = {}): Promise<GitLabGroup[]> {
    const { page = 1, perPage = 20, minAccessLevel = 30 } = params;
    
    return gitlabHttpClient.get<GitLabGroup[]>('/groups', {
      params: {
        min_access_level: minAccessLevel.toString(),
        page: page.toString(),
        per_page: perPage.toString(),
      },
    });
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId: number): Promise<GitLabGroup> {
    return gitlabHttpClient.get<GitLabGroup>(`/groups/${groupId}`);
  }

  /**
   * Get group projects
   */
  async getGroupProjects(groupId: string | number): Promise<any[]> {
    return gitlabHttpClient.get<any[]>(`/groups/${groupId}/projects`, {
      params: {
        include_subgroups: 'true',
        order_by: 'last_activity_at',
        sort: 'desc',
        per_page: '20',
      },
    });
  }

  /**
   * Get subgroups
   */
  async getSubgroups(groupId: number): Promise<GitLabGroup[]> {
    return gitlabHttpClient.get<GitLabGroup[]>(`/groups/${groupId}/subgroups`, {
      params: {
        min_access_level: '30',
        per_page: '20',
      },
    });
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: number): Promise<GitLabUser[]> {
    return gitlabHttpClient.get<GitLabUser[]>(`/groups/${groupId}/members`);
  }
}

export const usersApi = new UsersApiClient();
export const groupsApi = new GroupsApiClient();