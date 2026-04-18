import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CommitChart } from '@/components/dashboard/CommitChart';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { GitLabAvatar } from '@/components/GitLabAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MetricCardSkeleton, ChartSkeleton, Skeleton } from '@/components/ui/skeletons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  GitCommit,
  GitPullRequest,
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Mail,
  User,
  Activity,
  Trophy,
  AlertCircle,
  RefreshCw,
  Bug,
  Target,
  TrendingUp,
  GitMerge,
  CircleDot,
  XCircle,
  ChevronDown,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useAllProjects } from '@/hooks/api/useProjects';
import { useBatchCommits } from '@/hooks/api/useCommits';
import { useBatchIssues } from '@/hooks/api/useIssues';
import { useBatchMergeRequests } from '@/hooks/api/useMergeRequests';
import { transformCommitActivity, transformHeatmapData } from '@/lib/transformers';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import { GitLabIssue, GitLabMergeRequest, GitLabCommit } from '@/types/gitlab';

// Helper functions
const formatValue = (value: number | null | undefined, loading?: boolean): string => {
  if (loading) return '...';
  if (value == null) return '0';
  return value.toLocaleString();
};

const getIssueStatusColor = (state: string) => {
  switch (state) {
    case 'opened': return 'bg-green-500/20 text-green-500 border-green-500/30';
    case 'closed': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
  }
};

const getMRStatusColor = (state: string) => {
  switch (state) {
    case 'opened': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    case 'merged': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    case 'closed': return 'bg-red-500/20 text-red-500 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
  }
};

const getMRStatusIcon = (state: string) => {
  switch (state) {
    case 'opened': return <CircleDot className="h-3.5 w-3.5" />;
    case 'merged': return <GitMerge className="h-3.5 w-3.5" />;
    case 'closed': return <XCircle className="h-3.5 w-3.5" />;
    default: return <CircleDot className="h-3.5 w-3.5" />;
  }
};

// Quick date presets
const DATE_PRESETS = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Last Year', days: 365 },
  { label: 'All Time', days: null },
];

const DeveloperDetailPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get preset from URL params (passed from DevelopersPage), default to 90 days (index 1)
  const urlPreset = searchParams.get('preset');
  const initialPreset = urlPreset !== null ? parseInt(urlPreset, 10) : 1;
  const validPreset = initialPreset >= 0 && initialPreset < DATE_PRESETS.length ? initialPreset : 1;
  
  const [selectedPreset, setSelectedPreset] = useState(validPreset);
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const preset = DATE_PRESETS[validPreset];
    if (preset.days === null) return undefined; // All Time
    return {
      from: subDays(now, preset.days),
      to: now,
    };
  });

  // Create date filter for API calls
  const dateFilter = useMemo(() => {
    if (!date?.from) return undefined; // No filter = ALL DATA
    
    const since = new Date(date.from);
    since.setHours(0, 0, 0, 0);
    
    const until = new Date(date.to || new Date());
    until.setHours(23, 59, 59, 999);
    
    return { since, until };
  }, [date]);

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

  // Construct email from username for internal users
  const developerEmail = username ? `${username.toLowerCase()}@lightpxl.com` : '';

  // 1. Fetch all projects first
  const projectsQuery = useAllProjects(true);
  const projectIds = projectsQuery.data?.map(p => p.id) ?? [];
  const hasProjects = projectIds.length > 0;

  // 2. Fetch data with date filter for fast loading
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

  // Process developer data
  const developerData = useMemo(() => {
    const commits = commitsQuery.data ?? [];
    const openIssues = openIssuesQuery.data ?? [];
    const closedIssues = closedIssuesQuery.data ?? [];
    const allIssues = [...openIssues, ...closedIssues];
    const mergeRequests = mergeRequestsQuery.data ?? [];

    // Filter data for this specific developer
    const devCommits = commits.filter(c => 
      c.author_email?.toLowerCase() === developerEmail.toLowerCase()
    );

    // Find by username match (MR author username)
    const devMRs = mergeRequests.filter(mr => 
      mr.author?.username?.toLowerCase() === username?.toLowerCase()
    );

    // Issues assigned to this developer
    const devAssignedIssues = allIssues.filter(issue => 
      issue.assignees?.some(a => a.username?.toLowerCase() === username?.toLowerCase()) ||
      issue.assignee?.username?.toLowerCase() === username?.toLowerCase()
    );

    // Issues resolved by this developer (closed issues where they were assignee)
    const devResolvedIssues = closedIssues.filter(issue =>
      issue.assignees?.some(a => a.username?.toLowerCase() === username?.toLowerCase()) ||
      issue.assignee?.username?.toLowerCase() === username?.toLowerCase()
    );

    // Open issues assigned to developer
    const devOpenIssues = openIssues.filter(issue =>
      issue.assignees?.some(a => a.username?.toLowerCase() === username?.toLowerCase()) ||
      issue.assignee?.username?.toLowerCase() === username?.toLowerCase()
    );

    // Get developer info from commits or MRs
    let developerInfo = {
      name: username || 'Unknown',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
      webUrl: '',
    };

    // Try to get avatar and name from MRs (more reliable)
    if (devMRs.length > 0 && devMRs[0].author) {
      developerInfo.name = devMRs[0].author.name || developerInfo.name;
      developerInfo.avatar = devMRs[0].author.avatar_url || developerInfo.avatar;
      developerInfo.webUrl = devMRs[0].author.web_url || developerInfo.webUrl;
    } else if (devCommits.length > 0) {
      developerInfo.name = devCommits[0].author_name || developerInfo.name;
    }

    // Calculate issue resolution rate
    const issueResolutionRate = devAssignedIssues.length > 0
      ? Math.round((devResolvedIssues.length / devAssignedIssues.length) * 100)
      : 0;

    // Calculate MR merge rate
    const mergedMRs = devMRs.filter(mr => mr.state === 'merged');
    const mrMergeRate = devMRs.length > 0
      ? Math.round((mergedMRs.length / devMRs.length) * 100)
      : 0;

    // Calculate productivity based on delivery quality and consistency, not commit volume
    const activeDaysLast30 = new Set(
      devCommits
        .filter(c => new Date(c.authored_date) >= subDays(new Date(), 30))
        .map(c => c.authored_date.split('T')[0])
    ).size;
    const consistencyScore = Math.min(100, Math.round((activeDaysLast30 / 12) * 100));
    const productivityScore = Math.round(
      mrMergeRate * 0.45 +
      issueResolutionRate * 0.35 +
      consistencyScore * 0.2
    );

    // Bug issues
    const devBugIssues = devAssignedIssues.filter(i => 
      i.issue_type === 'incident' || 
      i.labels?.some(l => l.toLowerCase().includes('bug'))
    );
    const devResolvedBugs = devResolvedIssues.filter(i =>
      i.issue_type === 'incident' || 
      i.labels?.some(l => l.toLowerCase().includes('bug'))
    );

    // Charts
    const commitActivity = devCommits.length > 0 ? transformCommitActivity(devCommits) : [];
    const heatmap = transformHeatmapData(devCommits);

    // Recent activity - sort by date, most recent first
    const recentCommits = [...devCommits]
      .sort((a, b) => new Date(b.authored_date).getTime() - new Date(a.authored_date).getTime())
      .slice(0, 10);

    const recentMRs = [...devMRs]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);

    const recentIssues = [...devAssignedIssues]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);

    return {
      info: developerInfo,
      metrics: {
        totalCommits: devCommits.length,
        totalMRs: devMRs.length,
        mergedMRs: mergedMRs.length,
        openMRs: devMRs.filter(mr => mr.state === 'opened').length,
        assignedIssues: devAssignedIssues.length,
        resolvedIssues: devResolvedIssues.length,
        openIssues: devOpenIssues.length,
        issueResolutionRate,
        mrMergeRate,
        productivityScore,
        bugIssues: devBugIssues.length,
        resolvedBugs: devResolvedBugs.length,
      },
      activity: {
        commits: recentCommits,
        mergeRequests: recentMRs,
        issues: recentIssues,
      },
      charts: {
        commitActivity,
        heatmap,
      },
      allIssues: devAssignedIssues,
      allMRs: devMRs,
    };
  }, [
    commitsQuery.data, 
    openIssuesQuery.data, 
    closedIssuesQuery.data, 
    mergeRequestsQuery.data,
    username,
    developerEmail
  ]);

  // Loading state
  const isInitialLoad = projectsQuery.loading && !projectsQuery.data;
  const isLoadingData = commitsQuery.loading || openIssuesQuery.loading || closedIssuesQuery.loading || mergeRequestsQuery.loading;

  if (isInitialLoad) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

  const { info, metrics, activity, charts, allIssues, allMRs } = developerData;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* Top row: Back button, developer info, and actions on large screens */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/developers')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <GitLabAvatar
              src={info.avatar}
              alt={info.name}
              className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20 rounded-full shrink-0"
              size={56}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{info.name}</h2>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  {username}
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs hidden sm:inline-flex">
                  <Mail className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  {developerEmail}
                </Badge>
              </div>
            </div>

            {/* Actions - visible on large screens in same row */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Date Range Filter */}
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

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoadingData}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-9"
                onClick={() => window.location.href = `mailto:${developerEmail}`}
              >
                <Mail className="h-4 w-4" />
                Contact
              </Button>
              {info.webUrl && (
                <Button asChild className="gap-2 h-9">
                  <a href={info.webUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    GitLab
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Action buttons row - visible on small/medium screens only */}
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[180px] justify-between text-left font-normal text-sm">
                  <span className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {DATE_PRESETS[selectedPreset].label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
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

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoadingData}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="sm:hidden"
                onClick={() => window.location.href = `mailto:${developerEmail}`}
              >
                <Mail className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="gap-2 hidden sm:inline-flex"
                onClick={() => window.location.href = `mailto:${developerEmail}`}
              >
                <Mail className="h-4 w-4" />
                Contact
              </Button>
              {info.webUrl && (
                <>
                  <Button asChild size="icon" className="sm:hidden">
                    <a href={info.webUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild className="gap-2 hidden sm:inline-flex">
                    <a href={info.webUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      GitLab Profile
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
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
            title="Issues Assigned"
            value={formatValue(metrics.assignedIssues, isLoadingData)}
            icon={FileText}
            variant="warning"
            delay={0.04}
          />
          <MetricCard
            title="Issues Resolved"
            value={formatValue(metrics.resolvedIssues, isLoadingData)}
            icon={CheckCircle2}
            variant="success"
            delay={0.06}
          />
          <MetricCard
            title="Open Issues"
            value={formatValue(metrics.openIssues, isLoadingData)}
            icon={AlertCircle}
            variant="danger"
            delay={0.08}
          />
          <MetricCard
            title="Productivity"
            value={`${metrics.productivityScore}%`}
            icon={Trophy}
            variant="primary"
            delay={0.1}
          />
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Issue Resolution Rate */}
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                Issue Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-wrap items-end gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold">{metrics.issueResolutionRate}%</span>
                <span className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                  ({metrics.resolvedIssues}/{metrics.assignedIssues})
                </span>
              </div>
              <Progress value={metrics.issueResolutionRate} className="h-2 mt-2 sm:mt-3" />
            </CardContent>
          </Card>

          {/* MR Merge Rate */}
          <Card className="bg-card/50 border-white/5">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-purple-500" />
                MR Merge Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-wrap items-end gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold">{metrics.mrMergeRate}%</span>
                <span className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                  ({metrics.mergedMRs}/{metrics.totalMRs})
                </span>
              </div>
              <Progress value={metrics.mrMergeRate} className="h-2 mt-2 sm:mt-3" />
            </CardContent>
          </Card>

          {/* Bug Resolution */}
          <Card className="bg-card/50 border-white/5 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Bug className="h-4 w-4 text-red-500" />
                Bug Resolution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-wrap items-end gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold">{metrics.resolvedBugs}</span>
                <span className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                  / {metrics.bugIssues} bugs
                </span>
              </div>
              <Progress 
                value={metrics.bugIssues > 0 ? (metrics.resolvedBugs / metrics.bugIssues) * 100 : 0} 
                className="h-2 mt-2 sm:mt-3" 
              />
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Issues</span>
              <span className="text-[10px] sm:text-xs">({allIssues.length})</span>
            </TabsTrigger>
            <TabsTrigger value="mrs" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
              <GitPullRequest className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">MRs</span>
              <span className="text-[10px] sm:text-xs">({allMRs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="commits" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2">
              <GitCommit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Commits</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commit Chart */}
              {commitsQuery.loading && charts.commitActivity.length === 0 ? (
                <ChartSkeleton />
              ) : (
                <CommitChart data={charts.commitActivity} />
              )}

              {/* Recent Activity Summary */}
              <Card className="bg-card/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  <CardDescription>Latest contributions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-4">
                      {/* Recent Commits */}
                      {activity.commits.slice(0, 3).map((commit, idx) => (
                        <div key={commit.id + idx} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 p-1.5 rounded-full bg-primary/10">
                            <GitCommit className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{commit.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseISO(commit.authored_date), { addSuffix: true })}
                            </p>
                          </div>
                          <a 
                            href={commit.web_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}

                      {/* Recent MRs */}
                      {activity.mergeRequests.slice(0, 3).map((mr, idx) => (
                        <div key={mr.id + '-' + idx} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 p-1.5 rounded-full bg-purple-500/10">
                            <GitPullRequest className="h-3 w-3 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mr.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getMRStatusColor(mr.state)}`}>
                                {mr.state}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(mr.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <a 
                            href={mr.web_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}

                      {/* Recent Issues */}
                      {activity.issues.slice(0, 3).map((issue, idx) => (
                        <div key={issue.id + '-' + idx} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 p-1.5 rounded-full bg-yellow-500/10">
                            <FileText className="h-3 w-3 text-yellow-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{issue.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getIssueStatusColor(issue.state)}`}>
                                {issue.state}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(issue.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <a 
                            href={issue.web_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}

                      {activity.commits.length === 0 && activity.mergeRequests.length === 0 && activity.issues.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No recent activity
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Activity Heatmap */}
            {commitsQuery.loading && charts.heatmap.grid.length === 0 ? (
              <ChartSkeleton />
            ) : (
              <ActivityHeatmap data={charts.heatmap} />
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            <Card className="bg-card/50 border-white/5">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>All Assigned Issues</span>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs font-normal">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 px-1.5 sm:px-2">
                      {allIssues.filter(i => i.state === 'opened').length} Open
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 px-1.5 sm:px-2">
                      {allIssues.filter(i => i.state === 'closed').length} Closed
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-2 sm:space-y-3">
                    {allIssues.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No issues assigned to this developer
                      </p>
                    ) : (
                      allIssues.map((issue, idx) => (
                        <div 
                          key={issue.id + '-' + idx} 
                          className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                        >
                          <div className={`mt-0.5 p-1.5 sm:p-2 rounded-full shrink-0 ${issue.state === 'opened' ? 'bg-green-500/10' : 'bg-purple-500/10'}`}>
                            {issue.state === 'opened' ? (
                              <CircleDot className={`h-3 w-3 sm:h-4 sm:w-4 text-green-500`} />
                            ) : (
                              <CheckCircle2 className={`h-4 w-4 text-purple-500`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{issue.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  #{issue.iid} • Created {formatDistanceToNow(parseISO(issue.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              <a 
                                href={issue.web_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary shrink-0"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="outline" className={`text-xs ${getIssueStatusColor(issue.state)}`}>
                                {issue.state}
                              </Badge>
                              {issue.labels?.slice(0, 3).map((label, labelIdx) => (
                                <Badge key={labelIdx} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                              {issue.labels?.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{issue.labels.length - 3}
                                </Badge>
                              )}
                            </div>
                            {issue.closed_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                Closed {formatDistanceToNow(parseISO(issue.closed_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MRs Tab */}
          <TabsContent value="mrs" className="space-y-4">
            <Card className="bg-card/50 border-white/5">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>All Merge Requests</span>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-normal">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-1.5 sm:px-2">
                      {allMRs.filter(mr => mr.state === 'opened').length} Open
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 px-1.5 sm:px-2">
                      {allMRs.filter(mr => mr.state === 'merged').length} Merged
                    </Badge>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 px-1.5 sm:px-2">
                      {allMRs.filter(mr => mr.state === 'closed').length} Closed
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-2 sm:space-y-3">
                    {allMRs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No merge requests created by this developer
                      </p>
                    ) : (
                      allMRs.map((mr, idx) => (
                        <div 
                          key={mr.id + '-' + idx} 
                          className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                        >
                          <div className={`mt-0.5 p-1.5 sm:p-2 rounded-full shrink-0 ${getMRStatusColor(mr.state).split(' ')[0]}`}>
                            {getMRStatusIcon(mr.state)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-sm sm:text-base truncate sm:whitespace-normal">{mr.title}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                  !{mr.iid} • {formatDistanceToNow(parseISO(mr.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              <a 
                                href={mr.web_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary shrink-0"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                              <Badge variant="outline" className={`text-[10px] sm:text-xs ${getMRStatusColor(mr.state)}`}>
                                {getMRStatusIcon(mr.state)}
                                <span className="ml-1">{mr.state}</span>
                              </Badge>
                            </div>
                            {mr.merged_at && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                                <GitMerge className="h-3 w-3 inline mr-1" />
                                Merged {formatDistanceToNow(parseISO(mr.merged_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commits Tab */}
          <TabsContent value="commits" className="space-y-4">
            <Card className="bg-card/50 border-white/5">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium flex items-center justify-between">
                  <span>All Commits ({metrics.totalCommits})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-2 sm:space-y-3">
                    {activity.commits.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No commits found for this developer
                      </p>
                    ) : (
                      (commitsQuery.data ?? [])
                        .filter(c => c.author_email?.toLowerCase() === developerEmail.toLowerCase())
                        .sort((a, b) => new Date(b.authored_date).getTime() - new Date(a.authored_date).getTime())
                        .slice(0, 50)
                        .map((commit, idx) => (
                          <div 
                            key={commit.id + '-' + idx} 
                            className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="mt-0.5 p-1.5 sm:p-2 rounded-full bg-primary/10 shrink-0">
                              <GitCommit className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm sm:text-base truncate sm:whitespace-normal">{commit.title}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1">
                                    <code className="px-1 py-0.5 rounded bg-secondary/50 text-[10px] sm:text-xs">{commit.short_id}</code>
                                    <span className="hidden sm:inline">•</span>
                                    <span>{format(parseISO(commit.authored_date), 'MMM d, yyyy')}</span>
                                  </p>
                                </div>
                                <a 
                                  href={commit.web_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary shrink-0"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                    {metrics.totalCommits > 50 && (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                        Showing 50 of {metrics.totalCommits} commits
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DeveloperDetailPage;
