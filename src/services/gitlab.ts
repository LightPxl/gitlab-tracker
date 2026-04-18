import { GitLabProject, GitLabCommit, GitLabPipeline, GitLabMergeRequest, GitLabUser, GitLabGroup, GitLabIssue, GitLabWiki } from '@/types/gitlab';
import { storage } from '@/lib/storage';

async function fetchGitLab<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = storage.getToken();
    const baseUrl = storage.getUrl().replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/v4`;

    if (!token) {
        console.error('GitLab Service: No token found');
        throw new Error('No GitLab token found');
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
        const response = await fetch(`${apiUrl}${path}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        clearTimeout(id);

        if (response.status === 401) {
            console.error('GitLab Service: Auth Error 401', response.status);
            storage.removeToken();
            window.location.href = '/settings';
            throw new Error('Unauthorized: Please check your GitLab token');
        }

        if (response.status === 403) {
            // console.warn('GitLab Service: Forbidden 403', path); // Optional: warn instead of error
            throw new Error('Forbidden: Insufficient permissions for this action');
        }

        if (!response.ok) {
            // For 404s on repositories, we just want to throw, not spam console
            if (response.status === 404) {
                throw new Error('404 Not Found');
            }

            const errorBody = await response.json().catch(() => ({}));
            console.error('GitLab Service: API Error', response.status, errorBody);
            throw new Error(errorBody.message || `GitLab API Error: ${response.statusText}`);
        }

        if (response.status === 304) return {} as T; // Not modified

        return await response.json();
    } catch (error) {
        clearTimeout(id);
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('GitLab Request Timeout: The server took too long to respond.');
            }
            // Don't log expected errors for bulk scraping
            if (error.message.includes('Forbidden') || error.message.includes('404')) {
                throw error;
            }
        }
        console.error('GitLab Service: Fetch Failed', path, error);
        throw error;
    }
}

export const gitlabService = {
    async checkConnection(): Promise<boolean> {
        try {
            await this.getCurrentUser();
            return true;
        } catch {
            return false;
        }
    },

    async getCurrentUser(): Promise<GitLabUser> {
        return fetchGitLab('/user');
    },

    async getProjects(page: number = 1, perPage: number = 10): Promise<GitLabProject[]> {
        return fetchGitLab(`/projects?order_by=last_activity_at&sort=desc&page=${page}&per_page=${perPage}`);
    },

    async getProjectCommits(projectId: number): Promise<GitLabCommit[]> {
        return fetchGitLab(`/projects/${projectId}/repository/commits?per_page=20`);
    },

    async getProjectIssues(projectId: number, state: string = 'opened'): Promise<GitLabIssue[]> {
        return fetchGitLab(`/projects/${projectId}/issues?state=${state}&per_page=10`);
    },

    async getProjectMergeRequests(projectId: number, state: string = 'opened'): Promise<GitLabMergeRequest[]> {
        return fetchGitLab(`/projects/${projectId}/merge_requests?state=${state}&per_page=10`);
    },

    async getRecentPipelines(projectId?: number): Promise<GitLabPipeline[]> {
        const path = projectId ? `/projects/${projectId}/pipelines?per_page=10` : '/pipelines?per_page=20&scope=active';
        return fetchGitLab(path);
    },

    async getMergeRequests(projectId?: number, state: string = 'opened'): Promise<GitLabMergeRequest[]> {
        const path = projectId
            ? `/projects/${projectId}/merge_requests?state=${state}&per_page=10`
            : `/merge_requests?state=${state}&scope=all&per_page=20`;

        return fetchGitLab(path);
    },

    async getGroupProjects(groupId: string): Promise<GitLabProject[]> {
        return fetchGitLab(`/groups/${groupId}/projects?include_subgroups=true&order_by=last_activity_at&sort=desc&per_page=20`);
    },

    async getGroups(): Promise<GitLabGroup[]> {
        return fetchGitLab('/groups?min_access_level=30&per_page=20');
    },

    async getSubgroups(groupId: number): Promise<GitLabGroup[]> {
        return fetchGitLab(`/groups/${groupId}/subgroups?min_access_level=30&per_page=20`);
    },

    async getEvents(): Promise<any[]> {
        return fetchGitLab('/events?per_page=100&action=pushed');
    },

    async getTodos(): Promise<any[]> {
        return fetchGitLab('/todos?state=pending&per_page=20');
    },

    async markTodoAsDone(todoId: string): Promise<void> {
        return fetchGitLab(`/todos/${todoId}/mark_as_done`, { method: 'POST' });
    },

    async searchProjects(query: string): Promise<GitLabProject[]> {
        return fetchGitLab(`/projects?search=${encodeURIComponent(query)}&min_access_level=30&per_page=5`);
    },

    async getIncidents(projectIds?: number[]): Promise<GitLabIssue[]> {
        if (!projectIds || projectIds.length === 0) return [];

        const promises = projectIds.map(id =>
            fetchGitLab<GitLabIssue[]>(`/projects/${id}/issues?issue_type=incident&per_page=10`).catch(() => [] as GitLabIssue[])
        );
        const results = await Promise.all(promises);
        return results.flat();
    },

    async getAllIssues(projectIds?: number[], state: string = 'opened'): Promise<GitLabIssue[]> {
        if (!projectIds || projectIds.length === 0) return [];

        const promises = projectIds.map(id =>
            fetchGitLab<GitLabIssue[]>(`/projects/${id}/issues?state=${state}&per_page=20`).catch(() => [] as GitLabIssue[])
        );
        const results = await Promise.all(promises);
        return results.flat();
    },

    async getClosedIssues(projectIds?: number[]): Promise<GitLabIssue[]> {
        return this.getAllIssues(projectIds, 'closed');
    },

    async getAllMergeRequests(projectIds?: number[]): Promise<GitLabMergeRequest[]> {
        if (!projectIds || projectIds.length === 0) return [];

        const promises = projectIds.map(id =>
            fetchGitLab<GitLabMergeRequest[]>(`/projects/${id}/merge_requests?scope=all&per_page=20`).catch(() => [] as GitLabMergeRequest[])
        );
        const results = await Promise.all(promises);
        return results.flat();
    },

    async getProjectUsers(projectId: number): Promise<GitLabUser[]> {
        return fetchGitLab(`/projects/${projectId}/users?per_page=50`);
    },

    async getProductionPipelines(projectIds?: number[]): Promise<GitLabPipeline[]> {
        if (!projectIds || projectIds.length === 0) return [];

        const promises = projectIds.map(id =>
            fetchGitLab<GitLabPipeline[]>(`/projects/${id}/pipelines?status=success&ref=main&per_page=20`).catch(() => [] as GitLabPipeline[])
        );
        const results = await Promise.all(promises);
        return results.flat();
    },

    async getProjectMilestones(projectId: number): Promise<any[]> {
        return fetchGitLab(`/projects/${projectId}/milestones?state=active`);
    },

    async getMilestoneIssues(projectId: number, milestoneId: number): Promise<GitLabIssue[]> {
        return fetchGitLab(`/projects/${projectId}/milestones/${milestoneId}/issues`);
    },

    async getIssueSubTasks(projectId: number, issueIid: number): Promise<GitLabIssue[]> {
        // Fetch issues linked to this one (related or children)
        try {
            return await fetchGitLab(`/projects/${projectId}/issues/${issueIid}/links`);
        } catch (error) {
            console.warn('GitLab Service: Failed to fetch issue links', error);
            return [];
        }
    },

    async getProjectContributors(projectId: number): Promise<any[]> {
        // Note: contributors API returns user info and commit count
        return fetchGitLab(`/projects/${projectId}/repository/contributors?order_by=commits&sort=desc`);
    },

    async getProjectWikis(projectId: number): Promise<GitLabWiki[]> {
        return fetchGitLab(`/projects/${projectId}/wikis`);
    },

    async getWikiPage(projectId: number, slug: string): Promise<GitLabWiki> {
        return fetchGitLab(`/projects/${projectId}/wikis/${slug}`);
    },

    // --- Report Specific Methods (Recursive Fetching) ---

    async fetchAllProjectCommits(projectId: number, since?: Date): Promise<GitLabCommit[]> {
        let allCommits: GitLabCommit[] = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            try {
                const extraParams = since ? `&since=${since.toISOString()}` : '';
                const commits = await fetchGitLab<GitLabCommit[]>(`/projects/${projectId}/repository/commits?per_page=${perPage}&page=${page}${extraParams}`);

                if (!commits || commits.length === 0) {
                    hasMore = false;
                } else {
                    allCommits = [...allCommits, ...commits];
                    if (commits.length < perPage) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            } catch (error) {
                // Ignore 404 (No repository) or 403 (No permission)
                // console.warn(`Failed to fetch commits for project ${projectId}`, error);
                hasMore = false;
            }

            // Safety break to prevent infinite loops in dev
            if (page > 20) hasMore = false;
        }

        return allCommits;
    },

    async fetchAllMergeRequests(projectId: number, since?: Date): Promise<GitLabMergeRequest[]> {
        let allMrs: GitLabMergeRequest[] = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            try {
                // Created after 'since' is a good proxy for report range
                const extraParams = since ? `&created_after=${since.toISOString()}` : '';
                const mrs = await fetchGitLab<GitLabMergeRequest[]>(`/projects/${projectId}/merge_requests?state=all&per_page=${perPage}&page=${page}${extraParams}`);

                if (!mrs || mrs.length === 0) {
                    hasMore = false;
                } else {
                    allMrs = [...allMrs, ...mrs];
                    if (mrs.length < perPage) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            } catch (error) {
                // Ignore errors
                hasMore = false;
            }

            if (page > 20) hasMore = false;
        }

        return allMrs;
    },

    async fetchAllProjectIssues(projectId: number, state: string = 'opened', since?: Date): Promise<GitLabIssue[]> {
        let allIssues: GitLabIssue[] = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            const extraParams = since ? `&created_after=${since.toISOString()}` : '';
            const issues = await fetchGitLab<GitLabIssue[]>(`/projects/${projectId}/issues?state=${state}&per_page=${perPage}&page=${page}${extraParams}`);

            if (!issues || issues.length === 0) {
                hasMore = false;
            } else {
                allIssues = [...allIssues, ...issues];
                if (issues.length < perPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            // Safety break
            if (page > 20) hasMore = false;
        }

        return allIssues;
    },

    async fetchAllProjects(): Promise<GitLabProject[]> {
        let allProjects: GitLabProject[] = [];
        let page = 1;
        const perPage = 20; // conservative batch size
        let hasMore = true;

        while (hasMore) {
            try {
                // Modified to remove min_access_level so we see all visible projects
                const projects = await fetchGitLab<GitLabProject[]>(`/projects?order_by=last_activity_at&sort=desc&page=${page}&per_page=${perPage}`);

                if (!projects || projects.length === 0) {
                    hasMore = false;
                } else {
                    allProjects = [...allProjects, ...projects];
                    if (projects.length < perPage) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            } catch (error) {
                console.error('Error fetching page', page, error);
                hasMore = false; // Stop on error
            }

            if (page > 50) hasMore = false; // Safety cap (1000 projects)
        }

        return allProjects;
    },

    async getAllUsers(): Promise<GitLabUser[]> {
        let allUsers: GitLabUser[] = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            try {
                // Fetch active users
                const users = await fetchGitLab<GitLabUser[]>(`/users?active=true&per_page=${perPage}&page=${page}`);

                if (!users || users.length === 0) {
                    hasMore = false;
                } else {
                    allUsers = [...allUsers, ...users];
                    if (users.length < perPage) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            } catch (error) {
                console.error('Failed to fetch users page', page, error);
                hasMore = false;
            }

            if (page > 50) hasMore = false; // Safety break
        }
        return allUsers;
    },

    async getUsers(page: number = 1, perPage: number = 20): Promise<GitLabUser[]> {
        return fetchGitLab(`/users?active=true&per_page=${perPage}&page=${page}`);
    }
};
