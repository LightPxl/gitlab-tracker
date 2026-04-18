import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeveloperLeaderboard } from '@/components/dashboard/DeveloperLeaderboard';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { Developer } from '@/lib/mockData';
import { CommitChart } from '@/components/dashboard/CommitChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import {
  GitCommit,
  GitPullRequest,
  FileText,
  CheckCircle2,
  Bug,
  Loader2,
  User,
  ExternalLink,
  ChevronRight,
  Trophy,
  Activity,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, subDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useAllProjects } from '@/hooks/api/useProjects';
import { useBatchCommits } from '@/hooks/api/useCommits';
import { useBatchIssues } from '@/hooks/api/useIssues';
import { useBatchMergeRequests } from '@/hooks/api/useMergeRequests';
import { transformCommitActivity, transformHeatmapData } from '@/lib/transformers';
import { MetricCardSkeleton, ChartSkeleton, Skeleton } from '@/components/ui/skeletons';

// Format value helper
const formatValue = (value: number | null | undefined, loading?: boolean): string => {
  if (loading) return '...';
  if (value == null) return '-';
  return value.toLocaleString();
};

// Quick date presets for fast loading
const DATE_PRESETS = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'All Time', days: null },
];

const DevelopersPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const perPage = 6; // Max 6 developers per page

  // Default to last 30 days for fast initial load
  const [selectedPreset, setSelectedPreset] = useState(0); // 30 days by default
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: subDays(now, 30),
      to: now,
    };
  });

  // Handle preset selection
  const handlePresetSelect = useCallback((presetIndex: number) => {
    setSelectedPreset(presetIndex);
    const preset = DATE_PRESETS[presetIndex];
    if (preset.days === null) {
      setDate(undefined); // All time
    } else {
      const now = new Date();
      setDate({
        from: subDays(now, preset.days),
        to: now,
      });
    }
  }, []);

  // Navigate to developer detail page with current date preset
  const handleSelectDeveloper = useCallback((developer: Developer) => {
    // Extract username from email (remove @lightpxl.com)
    const username = developer.email?.split('@')[0] || developer.username || developer.id;
    navigate(`/developers/${username}?preset=${selectedPreset}`);
  }, [navigate, selectedPreset]);

  // Create date filter for API calls - undefined = all data
  // Fix: Use start of day for 'since' and end of day for 'until' to include full day
  const dateFilter = useMemo(() => {
    if (!date?.from) return undefined; // No filter = ALL DATA
    
    // Start of selected day (00:00:00)
    const since = new Date(date.from);
    since.setHours(0, 0, 0, 0);
    
    // End of selected day (23:59:59.999)
    const until = new Date(date.to || date.from);
    until.setHours(23, 59, 59, 999);
    
    return { since, until };
  }, [date]);

  // 1. Fetch all projects first
  const projectsQuery = useAllProjects(true);
  const projectIds = projectsQuery.data?.map(p => p.id) ?? [];
  const hasProjects = projectIds.length > 0;

  // 2. Fetch data in parallel once we have projects (with date filter for fast load)
  const commitsQuery = useBatchCommits(projectIds, dateFilter, hasProjects);
  const openIssuesQuery = useBatchIssues(projectIds, 'opened', dateFilter, hasProjects);
  const closedIssuesQuery = useBatchIssues(projectIds, 'closed', dateFilter, hasProjects);
  const mergeRequestsQuery = useBatchMergeRequests(projectIds, dateFilter, hasProjects);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await projectsQuery.refetch();
      if (hasProjects) {
        await Promise.all([
          commitsQuery.refetch(),
          openIssuesQuery.refetch(),
          closedIssuesQuery.refetch(),
          mergeRequestsQuery.refetch(),
        ]);
      }
    } finally {
      // Small delay to show animation completed
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [projectsQuery, commitsQuery, openIssuesQuery, closedIssuesQuery, mergeRequestsQuery, hasProjects]);

  // Memoized calculations
  const { metrics, developers, charts } = useMemo(() => {
    // Data is pre-filtered to internal employees at hook level
    const commits = commitsQuery.data ?? [];
    const openIssues = openIssuesQuery.data ?? [];
    const closedIssues = closedIssuesQuery.data ?? [];
    const mergeRequests = mergeRequestsQuery.data ?? [];

    // Calculate metrics
    const totalCommits = commits.length;
    const totalMRs = mergeRequests.length;
    const totalOpenIssues = openIssues.length;
    const totalClosedIssues = closedIssues.length;
    
    // Count bugs from open issues
    const totalBugs = openIssues.filter(i => 
      i.issue_type === 'incident' || 
      i.labels?.some(l => l.toLowerCase().includes('bug'))
    ).length;

    // Build developers from BOTH commits AND MRs
    const devMap = new Map<string, Developer>();
    
    // Helper to create developer entry
    const createDeveloper = (email: string, name: string, avatar?: string, webUrl?: string): Developer => ({
      id: email,
      name,
      username: name.toLowerCase().replace(/\s+/g, '.'),
      email,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
      role: 'Developer',
      team: 'Engineering',
      commits: 0,
      mergeRequests: 0,
      codeReviews: 0,
      issuesCompleted: 0,
      issuesAssigned: 0,
      productivityScore: 0,
      trend: 'stable' as const,
      webUrl: webUrl || '',
    });

    // 1. Add developers from commits
    commits.forEach(commit => {
      const email = commit.author_email || 'unknown';
      const name = commit.author_name || 'Unknown';
      
      if (!devMap.has(email)) {
        devMap.set(email, createDeveloper(email, name));
      }
      
      devMap.get(email)!.commits += 1;
    });

    // 2. Add developers from MRs (even if they have no commits)
    mergeRequests.forEach(mr => {
      if (mr.author?.username) {
        const username = mr.author.username.toLowerCase();
        // Construct email from username for internal users
        const email = `${username}@lightpxl.com`;
        const name = mr.author.name || username;
        
        if (!devMap.has(email)) {
          devMap.set(email, createDeveloper(
            email, 
            name, 
            mr.author.avatar_url,
            mr.author.web_url
          ));
        }
        
        const dev = devMap.get(email)!;
        dev.mergeRequests += 1;
        if (mr.author.avatar_url) dev.avatar = mr.author.avatar_url;
        if (mr.author.web_url) dev.webUrl = mr.author.web_url;
      }
    });

    const allIssues = [...openIssues, ...closedIssues];
    const now = new Date();
    const last30Days = subDays(now, 30);
    const prev30Days = subDays(last30Days, 30);

    const getIssueOwnerUsernames = (issue: { assignee?: { username?: string | null } | null; assignees?: Array<{ username?: string | null }> | null; }) => {
      const usernames = new Set<string>();
      issue.assignees?.forEach(assignee => {
        if (assignee.username) usernames.add(assignee.username.toLowerCase());
      });
      if (issue.assignee?.username) usernames.add(issue.assignee.username.toLowerCase());
      return usernames;
    };

    const scoresByEmail = new Map<string, {
      mergedCount: number;
      mergeRate: number;
      resolvedIssues: number;
      issueResolutionRate: number;
      activeDaysScore: number;
      trend: 'up' | 'down' | 'stable';
    }>();

    let maxMergedCount = 0;
    let maxResolvedIssues = 0;

    devMap.forEach((dev, email) => {
      const devMRs = mergeRequests.filter(mr => {
        const mrEmail = mr.author?.username ? `${mr.author.username.toLowerCase()}@lightpxl.com` : '';
        return mrEmail === email.toLowerCase();
      });
      const mergedMRs = devMRs.filter(mr => mr.state === 'merged');
      const mergeRate = devMRs.length > 0 ? mergedMRs.length / devMRs.length : 0;

      const assignedIssues = allIssues.filter(issue => getIssueOwnerUsernames(issue).has(dev.username.toLowerCase()));
      const resolvedIssues = closedIssues.filter(issue => getIssueOwnerUsernames(issue).has(dev.username.toLowerCase()));
      const issueResolutionRate = assignedIssues.length > 0 ? resolvedIssues.length / assignedIssues.length : 0;

      const activeDays = new Set(
        commits
          .filter(c => c.author_email?.toLowerCase() === email.toLowerCase() && new Date(c.authored_date) >= last30Days)
          .map(c => c.authored_date.split('T')[0])
      ).size;
      const activeDaysScore = Math.min(1, activeDays / 12);

      const recentImpact =
        mergedMRs.filter(mr => new Date(mr.updated_at) >= last30Days).length * 2 +
        resolvedIssues.filter(issue => new Date(issue.updated_at) >= last30Days).length;
      const previousImpact =
        mergedMRs.filter(mr => {
          const updated = new Date(mr.updated_at);
          return updated >= prev30Days && updated < last30Days;
        }).length * 2 +
        resolvedIssues.filter(issue => {
          const updated = new Date(issue.updated_at);
          return updated >= prev30Days && updated < last30Days;
        }).length;

      const trend: 'up' | 'down' | 'stable' = previousImpact === 0
        ? (recentImpact > 0 ? 'up' : 'stable')
        : (recentImpact >= previousImpact * 1.15 ? 'up' : recentImpact <= previousImpact * 0.85 ? 'down' : 'stable');

      maxMergedCount = Math.max(maxMergedCount, mergedMRs.length);
      maxResolvedIssues = Math.max(maxResolvedIssues, resolvedIssues.length);

      scoresByEmail.set(email, {
        mergedCount: mergedMRs.length,
        mergeRate,
        resolvedIssues: resolvedIssues.length,
        issueResolutionRate,
        activeDaysScore,
        trend,
      });

      dev.issuesAssigned = assignedIssues.length;
      dev.issuesCompleted = resolvedIssues.length;
      dev.codeReviews = mergedMRs.length;
    });

    devMap.forEach((dev, email) => {
      const scoreData = scoresByEmail.get(email);
      if (!scoreData) {
        dev.productivityScore = 0;
        dev.trend = 'stable';
        return;
      }

      const mergeVolumeScore = maxMergedCount > 0 ? scoreData.mergedCount / maxMergedCount : 0;
      const issueThroughputScore = maxResolvedIssues > 0 ? scoreData.resolvedIssues / maxResolvedIssues : 0;

      dev.productivityScore = Math.round(
        (scoreData.mergeRate * 0.35 +
          mergeVolumeScore * 0.25 +
          scoreData.issueResolutionRate * 0.20 +
          issueThroughputScore * 0.15 +
          scoreData.activeDaysScore * 0.05) * 100
      );
      dev.trend = scoreData.trend;
    });

    // Sort by productivity and filter out inactive
    const sortedDevs = Array.from(devMap.values())
      .filter(d => d.commits > 0 || d.mergeRequests > 0)
      .sort((a, b) => b.productivityScore - a.productivityScore);

    // Average productivity
    const avgProductivity = sortedDevs.length > 0
      ? Math.round(sortedDevs.reduce((sum, d) => sum + d.productivityScore, 0) / sortedDevs.length)
      : 0;

    // Charts
    const commitActivity = commits.length > 0 ? transformCommitActivity(commits) : [];
    const heatmap = transformHeatmapData(commits);

    return {
      metrics: {
        totalCommits,
        totalMRs,
        totalOpenIssues,
        totalClosedIssues,
        totalBugs,
        avgProductivity,
        activeDevelopers: sortedDevs.length,
      },
      developers: sortedDevs,
      charts: {
        commitActivity,
        heatmap,
      },
    };
  }, [commitsQuery.data, openIssuesQuery.data, closedIssuesQuery.data, mergeRequestsQuery.data]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(developers.length / perPage));
  const displayDevelopers = developers.slice((page - 1) * perPage, page * perPage);

  // Loading states
  const isInitialLoad = projectsQuery.loading && !projectsQuery.data;
  const isLoadingData = commitsQuery.loading || openIssuesQuery.loading || closedIssuesQuery.loading;

  // Initial loading skeleton
  if (isInitialLoad) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <MetricCardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold">Developer Analytics</h2>
            <p className="text-muted-foreground mt-1">
              Performance metrics and contribution analysis
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Range Filter Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-between text-left font-normal text-sm h-9">
                  <span className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {DATE_PRESETS[selectedPreset].label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="space-y-1">
                  {DATE_PRESETS.map((preset, index) => (
                    <Button
                      key={preset.label}
                      variant={selectedPreset === index ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handlePresetSelect(index)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingData}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Commits"
            value={formatValue(metrics.totalCommits, commitsQuery.loading)}
            icon={GitCommit}
            variant="primary"
            delay={0}
          />
          <MetricCard
            title="Merge Requests"
            value={formatValue(metrics.totalMRs, mergeRequestsQuery.loading)}
            icon={GitPullRequest}
            variant="default"
            delay={0.02}
          />
          <MetricCard
            title="Open Issues"
            value={formatValue(metrics.totalOpenIssues, openIssuesQuery.loading)}
            icon={FileText}
            variant="warning"
            delay={0.04}
          />
          <MetricCard
            title="Closed Issues"
            value={formatValue(metrics.totalClosedIssues, closedIssuesQuery.loading)}
            icon={CheckCircle2}
            variant="success"
            delay={0.06}
          />
          <MetricCard
            title="Open Bugs"
            value={formatValue(metrics.totalBugs, openIssuesQuery.loading)}
            icon={Bug}
            variant="danger"
            delay={0.08}
          />
          <MetricCard
            title="Avg Productivity"
            value={`${metrics.avgProductivity}%`}
            icon={Trophy}
            variant="primary"
            delay={0.1}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Developer Leaderboard */}
          <div className="space-y-4">
            <div className="relative">
              {isLoadingData && (
                <div className="absolute top-2 right-2 z-10">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
              <DeveloperLeaderboard
                developers={displayDevelopers}
                onSelectDeveloper={handleSelectDeveloper}
              />
            </div>

            {/* Pagination */}
            {developers.length > perPage && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4 text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>

          {/* Commit Chart */}
          {commitsQuery.loading && charts.commitActivity.length === 0 ? (
            <ChartSkeleton />
          ) : (
            <CommitChart data={charts.commitActivity} />
          )}
        </div>

        {/* Activity Heatmap */}
        {commitsQuery.loading && charts.heatmap.grid.length === 0 ? (
          <ChartSkeleton />
        ) : (
          <ActivityHeatmap data={charts.heatmap} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DevelopersPage;
