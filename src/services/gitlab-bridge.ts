/**
 * @deprecated This service is deprecated. Use the new API layer in @/api instead.
 * This file is kept for backward compatibility during migration.
 * 
 * Migration guide:
 * - Import from '@/hooks/api' for React components
 * - Import from '@/api' for direct API calls
 * 
 * Example:
 * OLD: import { gitlabService } from '@/services/gitlab';
 * NEW: import { useProjects } from '@/hooks/api';
 */

import { GitLabApi } from '@/api';

console.warn('GitlabService is deprecated. Please migrate to the new API layer. See @/api and @/hooks/api');

// Bridge to new API layer for backward compatibility
export const gitlabService = {
  // User methods
  async checkConnection(): Promise<boolean> {
    return GitLabApi.users.checkConnection();
  },

  async getCurrentUser() {
    return GitLabApi.users.getCurrentUser();
  },

  // Projects methods
  async getProjects(page: number = 1, perPage: number = 10) {
    return GitLabApi.projects.getProjects({ page, perPage });
  },

  async fetchAllProjects() {
    return GitLabApi.projects.getAllProjects();
  },

  async searchProjects(query: string) {
    return GitLabApi.projects.searchProjects(query);
  },

  async getProjectContributors(projectId: number) {
    return GitLabApi.projects.getProjectContributors(projectId);
  },

  async getProjectUsers(projectId: number) {
    return GitLabApi.projects.getProjectUsers(projectId);
  },

  // Issues methods
  async getProjectIssues(projectId: number, state: string = 'opened') {
    return GitLabApi.issues.getProjectIssues(projectId, state as any);
  },

  async fetchAllProjectIssues(projectId: number, state: string = 'opened', since?: Date) {
    return GitLabApi.issues.getAllProjectIssues(projectId, state as any, since ? { since } : undefined);
  },

  async getAllIssues(projectIds?: number[], state: string = 'opened') {
    if (!projectIds || projectIds.length === 0) return [];
    return GitLabApi.issues.batchFetchIssues(projectIds, state as any);
  },

  async getClosedIssues(projectIds?: number[]) {
    return this.getAllIssues(projectIds, 'closed');
  },

  async getIncidents(projectIds?: number[]) {
    if (!projectIds || projectIds.length === 0) return [];
    return GitLabApi.issues.getIncidents(projectIds);
  },

  // Merge Requests methods
  async getProjectMergeRequests(projectId: number, state: string = 'opened') {
    return GitLabApi.mergeRequests.getProjectMergeRequests(projectId, state as any);
  },

  async getMergeRequests(projectId?: number, state: string = 'opened') {
    if (projectId) {
      return GitLabApi.mergeRequests.getProjectMergeRequests(projectId, state as any);
    } else {
      return GitLabApi.mergeRequests.getGlobalMergeRequests(state as any);
    }
  },

  async fetchAllMergeRequests(projectId: number, since?: Date) {
    return GitLabApi.mergeRequests.getAllProjectMergeRequests(projectId, since ? { since } : undefined);
  },

  async getAllMergeRequests(projectIds?: number[]) {
    if (!projectIds || projectIds.length === 0) return [];
    return GitLabApi.mergeRequests.batchFetchMergeRequests(projectIds);
  },

  // Pipelines methods
  async getRecentPipelines(projectId?: number) {
    if (projectId) {
      return GitLabApi.pipelines.getRecentPipelines(projectId);
    } else {
      return GitLabApi.pipelines.getGlobalRecentPipelines();
    }
  },

  async getProductionPipelines(projectIds?: number[]) {
    if (!projectIds || projectIds.length === 0) return [];
    return GitLabApi.pipelines.batchFetchProductionPipelines(projectIds);
  },

  // Commits methods
  async getProjectCommits(projectId: number) {
    return GitLabApi.commits.getProjectCommits(projectId, { perPage: 20 });
  },

  async fetchAllProjectCommits(projectId: number, since?: Date) {
    return GitLabApi.commits.getAllProjectCommits(projectId, since ? { since } : undefined);
  },

  // Groups methods
  async getGroups() {
    return GitLabApi.groups.getGroups();
  },

  async getSubgroups(groupId: number) {
    return GitLabApi.groups.getSubgroups(groupId);
  },

  async getGroupProjects(groupId: string) {
    return GitLabApi.groups.getGroupProjects(groupId);
  },

  // Misc methods
  async getEvents() {
    return GitLabApi.misc.getEvents();
  },

  async getTodos() {
    return GitLabApi.misc.getTodos();
  },

  async markTodoAsDone(todoId: string) {
    return GitLabApi.misc.markTodoAsDone(todoId);
  },

  async getProjectMilestones(projectId: number) {
    return GitLabApi.misc.getProjectMilestones(projectId);
  },

  async getMilestoneIssues(projectId: number, milestoneId: number) {
    return GitLabApi.issues.getMilestoneIssues(projectId, milestoneId);
  },

  async getIssueSubTasks(projectId: number, issueIid: number) {
    return GitLabApi.issues.getIssueLinks(projectId, issueIid);
  },

  async getUsers(page: number = 1, perPage: number = 20) {
    return GitLabApi.users.getUsers({ page, perPage });
  },

  async getAllUsers() {
    return GitLabApi.users.getAllUsers();
  },
};