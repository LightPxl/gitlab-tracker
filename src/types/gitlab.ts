export interface GitLabUser {
    id: number;
    username: string;
    email: string;
    name: string;
    avatar_url: string;
    web_url: string;
}

export interface GitLabProject {
    id: number;
    name: string;
    description: string;
    web_url: string;
    avatar_url: string | null;
    visibility: string;
    open_issues_count?: number;
    last_activity_at: string;
    namespace: {
        name: string;
        avatar_url: string | null;
    };
    star_count: number;
    forks_count: number;
    statistics?: {
        commit_count: number;
        storage_size: number;
        repository_size: number;
        wiki_size: number;
        lfs_objects_size: number;
        job_artifacts_size: number;
        repository_check_failed: boolean;
    };
    empty_repo?: boolean;
    permissions?: {
        project_access?: {
            access_level: number;
            notification_level: number;
        };
        group_access?: {
            access_level: number;
            notification_level: number;
        };
    };
}

export interface GitLabCommit {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    author_email: string;
    authored_date: string;
    message: string;
    web_url: string;
    project_id?: number;
}

export interface GitLabPipeline {
    id: number;
    project_id: number;
    status: 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped';
    ref: string;
    sha: string;
    web_url: string;
    created_at: string;
    updated_at: string;
    coverage?: string;
}

export interface GitLabMergeRequest {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    state: 'opened' | 'closed' | 'locked' | 'merged';
    created_at: string;
    updated_at: string;
    merged_at: string | null;
    closed_at: string | null;
    web_url: string;
    author: GitLabUser;
    assignee: GitLabUser | null;
    assignees: GitLabUser[];
}

export interface GitLabGroup {
    id: number;
    name: string;
    path: string;
    description: string;
    avatar_url: string | null;
    full_name: string;
    full_path: string;
}

export interface GitLabIssue {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    state: 'opened' | 'closed';
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    labels: string[];
    issue_type: 'issue' | 'incident' | 'test_case';
    author: GitLabUser;
    assignee: GitLabUser | null;
    assignees: GitLabUser[];
    web_url: string;
    weight?: number;
}

export interface GitLabWiki {
    format: string;
    slug: string;
    title: string;
    content?: string;
}

// Internal dashboard types mapped from GitLab data
export interface DashboardProject {
    id: string;
    name: string;
    group: string;
    healthScore: number;
    lastActivity: string;
    openIssues: number;
    mergeRequests: number;
    coverage: number;
    status: 'healthy' | 'at-risk' | 'critical';
}
