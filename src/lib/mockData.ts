export interface Developer {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar: string;
  role: string;
  team: string;
  commits: number;
  mergeRequests: number;
  codeReviews: number;
  issuesCompleted: number;
  issuesAssigned: number;
  productivityScore: number;
  trend: 'up' | 'down' | 'stable';
  webUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  healthScore: number;
  openIssues: number;
  closedIssues: number;
  pipelineStatus: 'success' | 'failed' | 'running' | 'pending';
  coverage: number;
  lastDeployment: string;
  webUrl?: string;
}

export interface Pipeline {
  id: string;
  project: string;
  status: 'success' | 'failed' | 'running' | 'pending' | 'canceled';
  branch: string;
  commit: string;
  author: string;
  duration: string;
  timestamp: string;
}

export interface DoraMetrics {
  leadTime: { value: number; unit: string; trend: number };
  deploymentFrequency: { value: number; unit: string; trend: number };
  changeFailureRate: { value: number; unit: string; trend: number };
  mttr: { value: number; unit: string; trend: number };
}

export interface CommitActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface SprintData {
  name: string;
  completed: number;
  total: number;
  velocity: number;
}

// Developers mock data
export const developers: Developer[] = [
  {
    id: '1',
    name: 'Ahmed Hassan',
    username: 'ahassan',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
    role: 'Senior Developer',
    team: 'Platform',
    commits: 127,
    mergeRequests: 23,
    codeReviews: 45,
    issuesCompleted: 18,
    issuesAssigned: 20,
    productivityScore: 94,
    trend: 'up',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    username: 'schen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    role: 'Tech Lead',
    team: 'Frontend',
    commits: 98,
    mergeRequests: 31,
    codeReviews: 67,
    issuesCompleted: 24,
    issuesAssigned: 25,
    productivityScore: 91,
    trend: 'up',
  },
  {
    id: '3',
    name: 'Michael Brown',
    username: 'mbrown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    role: 'Backend Developer',
    team: 'API',
    commits: 85,
    mergeRequests: 19,
    codeReviews: 28,
    issuesCompleted: 15,
    issuesAssigned: 18,
    productivityScore: 82,
    trend: 'stable',
  },
  {
    id: '4',
    name: 'Elena Rodriguez',
    username: 'erodriguez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    role: 'DevOps Engineer',
    team: 'Infrastructure',
    commits: 72,
    mergeRequests: 15,
    codeReviews: 22,
    issuesCompleted: 20,
    issuesAssigned: 21,
    productivityScore: 88,
    trend: 'up',
  },
  {
    id: '5',
    name: 'James Wilson',
    username: 'jwilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    role: 'Junior Developer',
    team: 'Frontend',
    commits: 45,
    mergeRequests: 8,
    codeReviews: 12,
    issuesCompleted: 10,
    issuesAssigned: 14,
    productivityScore: 71,
    trend: 'down',
  },
];

// Projects mock data
export const projects: Project[] = [
  {
    id: '1',
    name: 'Core Platform',
    healthScore: 92,
    openIssues: 23,
    closedIssues: 187,
    pipelineStatus: 'success',
    coverage: 87,
    lastDeployment: '2 hours ago',
  },
  {
    id: '2',
    name: 'Mobile API',
    healthScore: 78,
    openIssues: 45,
    closedIssues: 134,
    pipelineStatus: 'running',
    coverage: 72,
    lastDeployment: '1 day ago',
  },
  {
    id: '3',
    name: 'Admin Dashboard',
    healthScore: 85,
    openIssues: 12,
    closedIssues: 89,
    pipelineStatus: 'success',
    coverage: 81,
    lastDeployment: '4 hours ago',
  },
  {
    id: '4',
    name: 'Auth Service',
    healthScore: 95,
    openIssues: 5,
    closedIssues: 67,
    pipelineStatus: 'success',
    coverage: 94,
    lastDeployment: '30 minutes ago',
  },
];

// Pipelines mock data
export const pipelines: Pipeline[] = [
  {
    id: 'p1',
    project: 'Core Platform',
    status: 'success',
    branch: 'main',
    commit: 'feat: add user analytics',
    author: 'ahassan',
    duration: '4m 32s',
    timestamp: '10 minutes ago',
  },
  {
    id: 'p2',
    project: 'Mobile API',
    status: 'running',
    branch: 'feature/auth-v2',
    commit: 'refactor: optimize token refresh',
    author: 'schen',
    duration: '2m 15s',
    timestamp: '5 minutes ago',
  },
  {
    id: 'p3',
    project: 'Admin Dashboard',
    status: 'failed',
    branch: 'fix/chart-render',
    commit: 'fix: chart memory leak',
    author: 'mbrown',
    duration: '1m 48s',
    timestamp: '15 minutes ago',
  },
  {
    id: 'p4',
    project: 'Auth Service',
    status: 'success',
    branch: 'main',
    commit: 'chore: update deps',
    author: 'erodriguez',
    duration: '2m 55s',
    timestamp: '30 minutes ago',
  },
  {
    id: 'p5',
    project: 'Core Platform',
    status: 'pending',
    branch: 'develop',
    commit: 'test: add e2e coverage',
    author: 'jwilson',
    duration: '-',
    timestamp: '1 minute ago',
  },
];

// DORA Metrics
export const doraMetrics: DoraMetrics = {
  leadTime: { value: 0, unit: 'hours', trend: 0 },
  deploymentFrequency: { value: 0, unit: '/day', trend: 0 },
  changeFailureRate: { value: 0, unit: '%', trend: 0 },
  mttr: { value: 0, unit: 'min', trend: 0 },
};

// Commit activity for the past 30 days
export const commitActivity: CommitActivity[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const baseCommits = isWeekend ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 40) + 15;

  return {
    date: date.toISOString().split('T')[0],
    commits: baseCommits,
    additions: baseCommits * Math.floor(Math.random() * 50 + 20),
    deletions: baseCommits * Math.floor(Math.random() * 20 + 5),
  };
});

// Sprint data
export const sprintData: SprintData[] = [
  { name: 'Sprint 18', completed: 34, total: 40, velocity: 34 },
  { name: 'Sprint 19', completed: 38, total: 42, velocity: 38 },
  { name: 'Sprint 20', completed: 42, total: 45, velocity: 42 },
  { name: 'Sprint 21', completed: 36, total: 38, velocity: 36 },
  { name: 'Sprint 22', completed: 28, total: 44, velocity: 28 },
];

// Weekly activity heatmap data
export const activityHeatmap = Array.from({ length: 52 }, () =>
  Array.from({ length: 7 }, () => Math.floor(Math.random() * 5))
);

// Executive summary stats
export const executiveSummary = {
  totalCommits: 1847,
  totalCommitsTrend: 12,
  activeDevelopers: 24,
  activeDevelopersTrend: 2,
  projectsHealthScore: 87,
  projectsHealthScoreTrend: 5,
  pipelineSuccessRate: 94.2,
  pipelineSuccessRateTrend: 3,
  openCriticalBugs: 3,
  openCriticalBugsTrend: -2,
  avgCodeReviewTime: 4.2,
  avgCodeReviewTimeTrend: -15,
};

// Team velocity over time
export const velocityTrend = [
  { sprint: 'S15', velocity: 28, capacity: 35 },
  { sprint: 'S16', velocity: 32, capacity: 35 },
  { sprint: 'S17', velocity: 35, capacity: 38 },
  { sprint: 'S18', velocity: 34, capacity: 40 },
  { sprint: 'S19', velocity: 38, capacity: 42 },
  { sprint: 'S20', velocity: 42, capacity: 45 },
  { sprint: 'S21', velocity: 36, capacity: 38 },
  { sprint: 'S22', velocity: 41, capacity: 44 },
];

// Issue distribution
export const issueDistribution = [
  { name: 'Features', value: 45, color: 'hsl(var(--chart-1))' },
  { name: 'Bugs', value: 28, color: 'hsl(var(--chart-5))' },
  { name: 'Tech Debt', value: 15, color: 'hsl(var(--chart-4))' },
  { name: 'Documentation', value: 12, color: 'hsl(var(--chart-2))' },
];
