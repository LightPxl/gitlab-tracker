import { motion } from 'framer-motion';
import { useMemo, useState, useCallback } from 'react';
import {
  GitCommit,
  Users,
  Activity,
  CheckCircle2,
  Folder,
  FileText,
  Bug,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CommitChart } from '@/components/dashboard/CommitChart';
import { VelocityChart } from '@/components/dashboard/VelocityChart';
import { IssueDistributionChart } from '@/components/dashboard/IssueDistributionChart';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import {
  Skeleton,
  MetricCardSkeleton,
  ChartSkeleton,
} from '@/components/ui/skeletons';
import {
  velocityTrend,
  issueDistribution as defaultIssueDistribution,
  activityHeatmap,
} from '@/lib/mockData';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useDashboardData } from '@/hooks/api/useDashboard';
import { 
  transformCommitActivity, 
  transformHeatmapData, 
  transformIssueDistribution, 
  transformVelocityData 
} from '@/lib/transformers';

// Simple value formatter
const formatValue = (value: number | null | undefined, loading?: boolean): string => {
  if (loading) return '...';
  if (value == null) return '-';
  return value.toLocaleString();
};

const formatPercent = (value: number | null | undefined, loading?: boolean): string => {
  if (loading) return '...';
  if (value == null) return '-';
  return `${value}%`;
};

const Dashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dashboardData = useDashboardData({ enabled: true });

  // Memoized refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await dashboardData.refetch();
    } finally {
      // Small delay to show animation completed
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [dashboardData]);

  // Memoized data transformations - only recalculate when data changes
  const { metrics, charts } = useMemo(() => {
    const projects = dashboardData.projects;
    // Commits are pre-filtered to internal employees at hook level
    const commits = dashboardData.commits;
    const openIssues = dashboardData.openIssues;
    const closedIssues = dashboardData.closedIssues;

    // Calculate metrics - only internal developers
    const uniqueDevs = commits.length > 0 
      ? new Set(commits.map(c => c.author_email).filter(Boolean)).size 
      : null;
    
    const totalIssues = openIssues.length + closedIssues.length;
    const openCount = openIssues.length;
    
    // Resolution rate
    const resolutionRate = totalIssues > 0 
      ? Math.round((closedIssues.length / totalIssues) * 100) 
      : null;

    // Avg commits per day (last 30 days)
    const avgCommitsPerDay = commits.length > 0 
      ? Math.round(commits.length / 30) 
      : null;

    // Critical bugs count
    const criticalBugs = openIssues.filter(i => 
      i.issue_type === 'incident' || 
      i.labels?.some(l => l.toLowerCase().includes('bug'))
    ).length;

    return {
      metrics: {
        commits: commits.length || null,
        developers: uniqueDevs,
        projects: projects.length || null,
        totalIssues: totalIssues || null,
        openIssues: openCount || null,
        resolvedIssues: closedIssues.length || null,
        resolutionRate,
        avgCommitsPerDay,
        criticalBugs: openIssues.length > 0 ? criticalBugs : null, // Show 0 if we have issues data, null if still loading
      },
      charts: {
        commitActivity: commits.length > 0 ? transformCommitActivity(commits) : [],
        heatmap: commits.length > 0 ? transformHeatmapData(commits) : activityHeatmap,
        velocity: closedIssues.length > 0 ? transformVelocityData(closedIssues) : velocityTrend,
        issueDistribution: totalIssues > 0 
          ? transformIssueDistribution([...openIssues, ...closedIssues]) 
          : defaultIssueDistribution,
      },
    };
  }, [
    dashboardData.projects, 
    dashboardData.commits, 
    dashboardData.openIssues, 
    dashboardData.closedIssues,
  ]);

  // Loading states
  const isInitialLoad = dashboardData.isLoadingProjects && dashboardData.projects.length === 0;
  const loadingCommits = dashboardData.isLoadingCommits;
  const loadingIssues = dashboardData.isLoadingIssues;
  const loadingProjects = dashboardData.isLoadingProjects;

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
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <MetricCardSkeleton key={i} />)}
          </div>
          <div className="space-y-6">
            <ChartSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
            <ChartSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary level="page">
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="linear-surface rounded-[28px] px-6 py-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/50">
                Live overview
              </div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">Executive Overview</h2>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Real-time insights from your GitLab projects with a cleaner operational surface.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || dashboardData.isLoading}
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/82 transition-all hover:-translate-y-0.5 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="linear-surface rounded-[28px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">Delivery status</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">Engineering pulse</h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/16 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  Healthy
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/45">Commit velocity</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatValue(metrics.avgCommitsPerDay, loadingCommits)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Average commits per day</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/45">Resolution rate</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(metrics.resolutionRate, loadingIssues)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Issues closed across tracked work</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/45">Open incidents</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatValue(metrics.criticalBugs, loadingIssues)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Priority items requiring attention</p>
                </div>
              </div>
            </div>

            <div className="linear-surface rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Focus</p>
              <div className="mt-4 space-y-3">
                {[
                  ['Projects synced', formatValue(metrics.projects, loadingProjects)],
                  ['Active developers', formatValue(metrics.developers, loadingCommits)],
                  ['Open issues', formatValue(metrics.openIssues, loadingIssues)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-white/45">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <MetricCard
              title="Total Commits"
              value={formatValue(metrics.commits, loadingCommits)}
              subtitle="Commits all Time"
              icon={GitCommit}
              variant="primary"
              delay={0}
            />
            <MetricCard
              title="Avg/Day"
              value={formatValue(metrics.avgCommitsPerDay, loadingCommits)}
              subtitle="Commits per day"
              icon={Activity}
              variant="default"
              delay={0.02}
            />
            <MetricCard
              title="Developers"
              value={formatValue(metrics.developers, loadingCommits)}
              subtitle="Active contributors"
              icon={Users}
              variant="success"
              delay={0.04}
            />
            <MetricCard
              title="Projects"
              value={formatValue(metrics.projects, loadingProjects)}
              subtitle="Active repos"
              icon={Folder}
              variant="primary"
              delay={0.06}
            />
            <MetricCard
              title="Total Issues"
              value={formatValue(metrics.totalIssues, loadingIssues)}
              subtitle="All time"
              icon={FileText}
              variant="default"
              delay={0.08}
            />
            <MetricCard
              title="Open Issues"
              value={formatValue(metrics.openIssues, loadingIssues)}
              subtitle="Pending work"
              icon={FileText}
              variant="warning"
              delay={0.1}
            />
            <MetricCard
              title="Resolved"
              value={formatValue(metrics.resolvedIssues, loadingIssues)}
              subtitle="Closed issues"
              icon={CheckCircle2}
              variant="success"
              delay={0.12}
            />
            <MetricCard
              title="Resolution Rate"
              value={formatPercent(metrics.resolutionRate, loadingIssues)}
              subtitle="Issues closed"
              icon={Activity}
              variant="primary"
              delay={0.14}
            />
            <MetricCard
              title="Critical Bugs"
              value={formatValue(metrics.criticalBugs, loadingIssues)}
              subtitle="Open incidents"
              icon={Bug}
              variant="danger"
              delay={0.16}
            />
          </div>

          {/* Charts */}
          <div className="space-y-6">
            <ErrorBoundary level="section">
              {loadingCommits && charts.commitActivity.length === 0 ? (
                <ChartSkeleton />
              ) : (
                <CommitChart data={charts.commitActivity} />
              )}
            </ErrorBoundary>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ErrorBoundary level="section">
                {loadingIssues ? <ChartSkeleton /> : <VelocityChart data={charts.velocity} />}
              </ErrorBoundary>
              <ErrorBoundary level="section">
                {loadingIssues ? <ChartSkeleton /> : <IssueDistributionChart data={charts.issueDistribution} />}
              </ErrorBoundary>
            </div>

            <ErrorBoundary level="section">
              {loadingCommits ? <ChartSkeleton /> : <ActivityHeatmap data={charts.heatmap} />}
            </ErrorBoundary>
          </div>
        </div>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default Dashboard;
