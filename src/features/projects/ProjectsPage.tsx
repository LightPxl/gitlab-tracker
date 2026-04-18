import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProjectHealthCard } from '@/components/dashboard/ProjectHealthCard';
import { IssueDistributionChart } from '@/components/dashboard/IssueDistributionChart';
import { VelocityChart } from '@/components/dashboard/VelocityChart';
import { velocityTrend, Project as ProjectType } from '@/lib/mockData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import {
  FolderKanban,
  AlertCircle,
  TrendingUp,
  Loader2,
  GitPullRequest,
  Bug,
  Activity,
  ExternalLink,
  Search,
  X,
  Calendar as CalendarIcon,
  ChevronDown,
  RefreshCw,
  Book,
  FileText
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';

import { SimpleDataHandler } from '@/components/common/DataStateHandler';
import {
  useProjects,
  useAllProjects,
  useBatchIssues,
  useProjectContributors,
  useProjectMergeRequests,
  useProjectIssues,
  useProjectWikis
} from '@/hooks/api';
import { gitlabService } from '@/services/gitlab';
import { downloadWikiPdf } from '@/lib/wikiPdf';
import { toast } from 'sonner';
import { useBatchCommits } from '@/hooks/api/useCommits';
import { transformProjects, transformIssueDistribution, transformVelocityData } from '@/lib/transformers';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';

// Quick date presets for fast loading
const DATE_PRESETS = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'All Time', days: null },
];

const ProjectsPage = () => {
  const [page, setPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const perPage = 6; // Max 6 projects per page as requested

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
    setPage(1); // Reset to first page when date changes
    setSearchQuery(''); // Clear search when date changes
  }, []);

  // Handle custom date selection
  const handleDateSelect = useCallback((newDate: DateRange | undefined) => {
    setDate(newDate);
    setPage(1); // Reset to first page
    // Clear preset selection when using custom date
    if (newDate?.from) {
      setSelectedPreset(-1);
    }
  }, []);

  // Create date filter for API calls
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

  // Fetch ALL projects
  const allProjectsQuery = useAllProjects(true);

  // Filter projects by date activity - projects active in the selected period
  const projectsInPeriod = useMemo(() => {
    if (!allProjectsQuery.data) return [];

    // If no date filter, return all projects
    if (!dateFilter) return allProjectsQuery.data;

    // Filter projects that had activity in the selected date range
    return allProjectsQuery.data.filter(project => {
      if (!project.last_activity_at) return false;

      const activityDate = new Date(project.last_activity_at);
      return activityDate >= dateFilter.since && activityDate <= dateFilter.until;
    });
  }, [allProjectsQuery.data, dateFilter]);

  const allProjectIds = useMemo(() =>
    projectsInPeriod.map(p => p.id),
    [projectsInPeriod]
  );

  // Fetch data with date filter for accurate stats
  const issuesQuery = useBatchIssues(
    allProjectIds,
    'opened',
    dateFilter,
    allProjectIds.length > 0
  );

  const closedIssuesQuery = useBatchIssues(
    allProjectIds,
    'closed',
    dateFilter,
    allProjectIds.length > 0
  );

  const commitsQuery = useBatchCommits(
    allProjectIds,
    dateFilter,
    allProjectIds.length > 0
  );

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await allProjectsQuery.refetch();
      if (allProjectIds.length > 0) {
        await Promise.all([
          issuesQuery.refetch(),
          closedIssuesQuery.refetch(),
          commitsQuery.refetch(),
        ]);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [allProjectsQuery, issuesQuery, closedIssuesQuery, commitsQuery, allProjectIds.length]);

  // Fetch details for selected project (only when selected)
  const selectedProjectIssues = useProjectIssues(
    Number(selectedProject?.id) || 0,
    'opened',
    !!selectedProject
  );

  const selectedProjectMRs = useProjectMergeRequests(
    Number(selectedProject?.id) || 0,
    'opened',
    !!selectedProject
  );

  const selectedProjectContributors = useProjectContributors(
    Number(selectedProject?.id) || 0,
    !!selectedProject
  );

  const selectedProjectWikis = useProjectWikis(
    Number(selectedProject?.id) || 0,
    !!selectedProject
  );

  const handleDownloadWiki = async (wiki: any) => {
    try {
      const toastId = toast.loading('Generating Professional PDF...');

      // Fetch full wiki content
      const fullWiki = await gitlabService.getWikiPage(Number(selectedProject?.id), wiki.slug);

      // Use the professional PDF generator
      await downloadWikiPdf({
        title: fullWiki.title || wiki.title,
        slug: fullWiki.slug || wiki.slug,
        content: fullWiki.content,
        format: fullWiki.format || wiki.format
      });

      toast.dismiss(toastId);
      toast.success(`Downloaded ${fullWiki.title} as PDF`);
    } catch (error) {
      console.error('Failed to download wiki PDF', error);
      toast.dismiss();
      toast.error('Failed to download wiki PDF');
    }
  };

  // Transform ALL projects in period with memoization
  const allTransformedProjects = useMemo(() => {
    if (!projectsInPeriod.length) return [];

    return transformProjects(
      projectsInPeriod,
      {}, // Pipeline map
      issuesQuery.data || [],
      closedIssuesQuery.data || []
    );
  }, [projectsInPeriod, issuesQuery.data, closedIssuesQuery.data]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return allTransformedProjects;

    const query = searchQuery.toLowerCase();
    return allTransformedProjects.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.id.toLowerCase().includes(query)
    );
  }, [allTransformedProjects, searchQuery]);

  // Paginate filtered projects (6 per page)
  const paginatedProjects = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, page, perPage]);

  const totalPages = Math.ceil(filteredProjects.length / perPage);

  // Handler for search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to page 1 when searching
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setPage(1);
  }, []);

  // Memoize chart data transformations - use SELECTED project data or aggregate
  const displayIssues = useMemo(() => {
    const distributionSource = selectedProjectIssues.data?.length
      ? selectedProjectIssues.data
      : issuesQuery.data;

    return distributionSource?.length
      ? transformIssueDistribution(distributionSource)
      : [];
  }, [selectedProjectIssues.data, issuesQuery.data]);

  const displayVelocity = useMemo(() => {
    // Combine opened and closed issues for velocity chart
    const velocitySource = closedIssuesQuery.data;

    return velocitySource?.length
      ? transformVelocityData(velocitySource)
      : velocityTrend;
  }, [closedIssuesQuery.data]);

  // Memoize metrics calculation - based on ALL projects in the period
  const metrics = useMemo(() => {
    const totalProjects = allTransformedProjects.length;

    // Calculate health score from ALL projects
    const avgHealthScore = allTransformedProjects.length
      ? Math.round(allTransformedProjects.reduce((sum, p) => sum + p.healthScore, 0) / allTransformedProjects.length)
      : 0;

    // Calculate total open issues from ALL projects
    const totalOpenIssues = issuesQuery.data?.length || 0;

    // Avg Coverage from ALL projects
    const avgCoverage = allTransformedProjects.length
      ? Math.round(allTransformedProjects.reduce((sum, p) => sum + p.coverage, 0) / allTransformedProjects.length)
      : 0;

    return { totalProjects, avgHealthScore, totalOpenIssues, avgCoverage };
  }, [allTransformedProjects, issuesQuery.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Projects Overview</h2>
                <p className="text-muted-foreground mt-1">
                  Project health, sprint progress, and team velocity tracking
                </p>
              </div>

              {/* Refresh Button - Desktop */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="hidden sm:flex shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Controls Row - Fully Responsive */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Date Range Picker - Responsive */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal w-full lg:min-w-[280px] lg:max-w-[320px]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {date?.from ? (
                        date.to ? (
                          <>
                            <span className="hidden sm:inline">{format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}</span>
                            <span className="sm:hidden">{format(date.from, 'MMM dd')} - {format(date.to, 'MMM dd')}</span>
                          </>
                        ) : (
                          format(date.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>All Time</span>
                      )}
                    </span>
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <div className="flex flex-col sm:flex-row">
                    {/* Presets sidebar */}
                    <div className="border-b sm:border-b-0 sm:border-r p-3 space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                        Quick Select
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                        {DATE_PRESETS.map((preset, index) => (
                          <Button
                            key={preset.label}
                            variant={selectedPreset === index ? 'secondary' : 'ghost'}
                            size="sm"
                            className="w-full justify-start text-xs whitespace-nowrap"
                            onClick={() => handlePresetSelect(index)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {/* Calendar */}
                    <div className="overflow-x-auto">
                      <CalendarUI
                        mode="range"
                        selected={date}
                        onSelect={handleDateSelect}
                        numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Search Bar - Responsive */}
              <div className="relative flex-1 lg:max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-9 pr-9 w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Refresh Button - Mobile */}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="sm:hidden w-full"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        <SimpleDataHandler query={allProjectsQuery}>
          {() => (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Projects"
                  value={allProjectsQuery.loading ? "..." : metrics.totalProjects}
                  icon={FolderKanban}
                  variant="primary"
                  delay={0}
                />
                <MetricCard
                  title="Avg Health"
                  value={allProjectsQuery.loading ? "..." : `${metrics.avgHealthScore}%`}
                  icon={Activity}
                  variant={metrics.avgHealthScore >= 80 ? "success" : "warning"}
                  delay={0.05}
                />
                <MetricCard
                  title="Open Issues"
                  value={issuesQuery.loading ? "..." : metrics.totalOpenIssues}
                  icon={AlertCircle}
                  variant="warning"
                  delay={0.1}
                />
                <MetricCard
                  title="Avg Coverage"
                  value={allProjectsQuery.loading ? "..." : `${metrics.avgCoverage}%`}
                  icon={TrendingUp}
                  variant="default"
                  delay={0.15}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <ProjectHealthCard
                    projects={paginatedProjects}
                    onSelectProject={setSelectedProject}
                  />

                  {/* Better Pagination with Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
                    {/* Results Info */}
                    <div className="text-sm text-muted-foreground">
                      {filteredProjects.length > 0 ? (
                        <>
                          Showing <span className="font-medium text-foreground">{((page - 1) * perPage) + 1}</span> to{' '}
                          <span className="font-medium text-foreground">{Math.min(page * perPage, filteredProjects.length)}</span> of{' '}
                          <span className="font-medium text-foreground">{filteredProjects.length}</span> project{filteredProjects.length !== 1 ? 's' : ''}
                          {searchQuery && <span className="text-primary"> (filtered)</span>}
                          {dateFilter && <span className="text-primary"> (in period)</span>}
                        </>
                      ) : (
                        <span>No projects found</span>
                      )}
                    </div>

                    {/* Pagination Controls - Enhanced */}
                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          {/* First Page */}
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(1)}
                              disabled={page === 1}
                              className="h-9 px-3"
                            >
                              First
                            </Button>
                          </PaginationItem>

                          {/* Previous */}
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>

                          {/* Page Numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }

                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  isActive={page === pageNum}
                                  onClick={() => setPage(pageNum)}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          {/* Next */}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>

                          {/* Last Page */}
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(totalPages)}
                              disabled={page === totalPages}
                              className="h-9 px-3"
                            >
                              Last
                            </Button>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <VelocityChart data={displayVelocity} />
                  <IssueDistributionChart data={displayIssues} />
                </div>
              </div>
            </>
          )}
        </SimpleDataHandler>
      </div>

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto custom-scrollbar">
          <SheetHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Project ID: {selectedProject?.id}
              </Badge>
            </div>
            <SheetTitle className="text-xl leading-tight">{selectedProject?.name}</SheetTitle>
            <SheetDescription>
              Performance metrics and detailed activity for this project.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            {/* Overall Progress Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Overall Progress</h4>
                <span className="text-2xl font-bold font-mono text-success">
                  {selectedProject?.healthScore}%
                </span>
              </div>
              <Progress
                value={selectedProject?.healthScore || 0}
                className="h-2 mb-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Project Health</span>
                <span>
                  {selectedProject?.healthScore >= 85 ? 'Excellent' :
                    selectedProject?.healthScore >= 70 ? 'Good' :
                      selectedProject?.healthScore >= 50 ? 'Needs Attention' : 'Critical'}
                </span>
              </div>
            </div>

            {/* Issue Statistics - Primary Metrics */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Issue Statistics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Issues</p>
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {(selectedProject?.openIssues || 0) + (selectedProject?.closedIssues || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Bugs</p>
                  <p className="text-2xl font-bold font-mono text-destructive">
                    {selectedProjectIssues.data?.filter(i =>
                      i.issue_type === 'incident' ||
                      i.labels?.some(l => l.toLowerCase().includes('bug'))
                    ).length || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Resolved</p>
                  <p className="text-2xl font-bold font-mono text-success">
                    {selectedProject?.closedIssues || 0}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {((selectedProject?.closedIssues || 0) / Math.max((selectedProject?.openIssues || 0) + (selectedProject?.closedIssues || 0), 1) * 100).toFixed(1)}% resolved
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Still Open</p>
                  <p className="text-2xl font-bold font-mono text-warning">
                    {selectedProject?.openIssues || 0}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {((selectedProject?.openIssues || 0) / Math.max((selectedProject?.openIssues || 0) + (selectedProject?.closedIssues || 0), 1) * 100).toFixed(1)}% open
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Stats - Progress Tracking */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Progress Tracking</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Health Score</p>
                  <p className="text-2xl font-bold font-mono text-success">{selectedProject?.healthScore}%</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Project health</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Merge Requests</p>
                  <p className="text-2xl font-bold font-mono text-primary">{selectedProjectMRs.data?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Active MRs</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Contributors</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{selectedProjectContributors.data?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Team members</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Last Activity</p>
                  <p className="text-lg font-bold font-mono text-foreground">{selectedProject?.lastDeployment || '-'}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Recent update</p>
                </div>
              </div>
            </div>

            {/* Recent Issues */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Bug className="h-4 w-4 text-warning" />
                Recent Issues ({selectedProjectIssues.data?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedProjectIssues.loading ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4 text-primary" /></div>
                ) : !selectedProjectIssues.data?.length ? (
                  <p className="text-xs text-muted-foreground italic p-2">No open issues found.</p>
                ) : (
                  selectedProjectIssues.data.slice(0, 5).map((issue) => (
                    <div key={issue.id} className="p-3 rounded-lg bg-secondary/10 border border-white/5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{issue.title}</p>
                        <p className="text-[10px] text-muted-foreground">#{issue.iid} • {new Date(issue.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4">Open</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Recent Merge Requests */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-primary" />
                Recent Merge Requests ({selectedProjectMRs.data?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedProjectMRs.loading ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4 text-primary" /></div>
                ) : !selectedProjectMRs.data?.length ? (
                  <p className="text-xs text-muted-foreground italic p-2">No active merge requests found.</p>
                ) : (
                  selectedProjectMRs.data.slice(0, 5).map((mr) => (
                    <div key={mr.id} className="p-3 rounded-lg bg-secondary/10 border border-white/5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{mr.title}</p>
                        <p className="text-[10px] text-muted-foreground">!{mr.iid} • {mr.author.name}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4 text-primary border-primary/30">{mr.state}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Wikis Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Book className="h-4 w-4 text-info" />
                Project Wikis ({selectedProjectWikis.data?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedProjectWikis.isLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4 text-primary" /></div>
                ) : !selectedProjectWikis.data?.length ? (
                  <p className="text-xs text-muted-foreground italic p-2">No wikis found.</p>
                ) : (
                  selectedProjectWikis.data.map((wiki) => (
                    <div key={wiki.slug} className="p-3 rounded-lg bg-secondary/10 border border-white/5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{wiki.title}</p>
                        <p className="text-[10px] text-muted-foreground">{wiki.slug}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadWiki(wiki)}
                        className="h-7 w-7 p-0"
                        title="Download PDF"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Contributors */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                Top Contributors
              </h4>
              <div className="space-y-2">
                {selectedProjectContributors.loading ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4 text-primary" /></div>
                ) : !selectedProjectContributors.data?.length ? (
                  <p className="text-xs text-muted-foreground italic p-2">No contributor data available.</p>
                ) : (
                  selectedProjectContributors.data.slice(0, 5).map((contributor) => (
                    <div key={contributor.email} className="p-3 rounded-lg bg-secondary/10 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                          {contributor.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{contributor.name}</p>
                          <p className="text-[10px] text-muted-foreground">{contributor.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold font-mono">{contributor.commits}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">commits</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-6">
              <Button
                asChild
                className="w-full gap-2"
                variant="secondary"
              >
                <a href={selectedProject?.webUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Full Project Analysis
                </a>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default ProjectsPage;
