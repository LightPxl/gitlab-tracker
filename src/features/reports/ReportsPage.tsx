import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { velocityTrend } from '@/lib/mockData';
import {
  Users,
  AlertTriangle,
  FileDown,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  ChevronDown,
  GitMerge,
  FolderGit2,
  CheckCircle2,
  Bug
} from 'lucide-react';
import * as React from 'react';

import { useAllProjects, useBatchCommits, useBatchIssues, useBatchMergeRequests, useBatchProjectMembers } from '@/hooks/api';
import { transformCommitActivity, transformVelocityData } from '@/lib/transformers';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Button as UIButton } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { CommitChart } from '@/components/dashboard/CommitChart';
import { VelocityChart } from '@/components/dashboard/VelocityChart';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { GitLabCommit, GitLabIssue, GitLabMergeRequest } from '@/types/gitlab';

// Quick date presets
const DATE_PRESETS = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'All Time', days: null },
];

const ReportsPage = () => {
  const [selectedPreset, setSelectedPreset] = React.useState(0); // 30 days default
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [exportHistory, setExportHistory] = React.useState<{ name: string, date: string }[]>(() => {
    const saved = localStorage.getItem('report-export-history');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('report-export-history', JSON.stringify(exportHistory));
  }, [exportHistory]);

  // Handle preset selection
  const handlePresetSelect = React.useCallback((presetIndex: number) => {
    setSelectedPreset(presetIndex);
    const preset = DATE_PRESETS[presetIndex];
    if (preset.days === null) {
      setDate(undefined);
    } else {
      const now = new Date();
      setDate({
        from: subDays(now, preset.days),
        to: now,
      });
    }
  }, []);

  // Handle custom date selection
  const handleDateSelect = React.useCallback((newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from) {
      setSelectedPreset(-1);
    }
  }, []);

  // Create date filter for API calls
  const dateFilter = React.useMemo(() => {
    if (!date?.from) return undefined;
    
    const since = new Date(date.from);
    since.setHours(0, 0, 0, 0);
    
    const until = new Date(date.to || date.from);
    until.setHours(23, 59, 59, 999);
    
    return { since, until };
  }, [date]);

  // Fetch all projects
  const allProjectsQuery = useAllProjects(true);
  const allProjectIds = React.useMemo(() => 
    allProjectsQuery.data?.map(p => p.id) || [], 
    [allProjectsQuery.data]
  );

  // Filter projects by date range (projects with activity in the selected period)
  const projectsInPeriod = React.useMemo(() => {
    if (!allProjectsQuery.data) return [];
    if (!date?.from) return allProjectsQuery.data;

    const fromDate = new Date(date.from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(date.to || date.from);
    toDate.setHours(23, 59, 59, 999);

    return allProjectsQuery.data.filter(project => {
      const activityDate = new Date(project.last_activity_at);
      return activityDate >= fromDate && activityDate <= toDate;
    });
  }, [allProjectsQuery.data, date]);

  // Fetch data with date filter
  const commitsQuery = useBatchCommits(allProjectIds, dateFilter, allProjectIds.length > 0);
  const openIssuesQuery = useBatchIssues(allProjectIds, 'opened', dateFilter, allProjectIds.length > 0);
  const closedIssuesQuery = useBatchIssues(allProjectIds, 'closed', dateFilter, allProjectIds.length > 0);
  const mergeRequestsQuery = useBatchMergeRequests(allProjectIds, dateFilter, allProjectIds.length > 0);
  const projectMembersQuery = useBatchProjectMembers(allProjectIds, allProjectIds.length > 0);

  // Only show full loading on initial projects load, then show skeleton loaders for data
  const isInitialLoading = allProjectsQuery.loading && !allProjectsQuery.data;
  const isDataLoading = commitsQuery.loading || openIssuesQuery.loading || 
                         closedIssuesQuery.loading || mergeRequestsQuery.loading ||
                         projectMembersQuery.isLoading;

  // Calculate detailed developer metrics
  const developerMetrics = React.useMemo(() => {
    if (!commitsQuery.data || !mergeRequestsQuery.data || !projectMembersQuery.data) return [];

    const commits = commitsQuery.data;
    const mergeRequests = mergeRequestsQuery.data;
    const openIssues = openIssuesQuery.data || [];
    const closedIssues = closedIssuesQuery.data || [];
    const allIssues = [...openIssues, ...closedIssues];
    const projectMembers = projectMembersQuery.data || [];

    // Build developer map
    const devMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      avatar: string;
      commits: number;
      mergeRequests: number;
      projectsContributed: Set<number>;
      issuesAssigned: number;
      issuesResolved: number;
      bugsResolved: number;
    }>();

    // Process project members first to get all projects each developer belongs to
    projectMembers.forEach(({ projectId, members }) => {
      members.forEach(member => {
        const email = member.username ? `${member.username.toLowerCase()}@lightpxl.com` : member.email;
        
        if (!devMap.has(email)) {
          devMap.set(email, {
            id: email,
            name: member.name || member.username || 'Unknown',
            email,
            avatar: member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.username || 'Unknown')}&background=random`,
            commits: 0,
            mergeRequests: 0,
            projectsContributed: new Set(),
            issuesAssigned: 0,
            issuesResolved: 0,
            bugsResolved: 0,
          });
        } else {
          // Update avatar if member has one and devMap doesn't
          const dev = devMap.get(email)!;
          if (member.avatar_url && dev.avatar.includes('ui-avatars.com')) {
            dev.avatar = member.avatar_url;
          }
        }
        
        // Add this project to the developer's contributed projects
        const dev = devMap.get(email)!;
        dev.projectsContributed.add(projectId);
      });
    });

    // Process commits (only for commit count, not projects)
    commits.forEach(commit => {
      const email = commit.author_email || 'unknown';
      const name = commit.author_name || 'Unknown';
      
      if (!devMap.has(email)) {
        devMap.set(email, {
          id: email,
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          commits: 0,
          mergeRequests: 0,
          projectsContributed: new Set(),
          issuesAssigned: 0,
          issuesResolved: 0,
          bugsResolved: 0,
        });
      }
      
      const dev = devMap.get(email)!;
      dev.commits += 1;
    });

    // Process merge requests (get project contributions from MRs)
    mergeRequests.forEach(mr => {
      if (mr.author?.username) {
        const email = `${mr.author.username.toLowerCase()}@lightpxl.com`;
        const name = mr.author.name || mr.author.username;
        
        if (!devMap.has(email)) {
          devMap.set(email, {
            id: email,
            name,
            email,
            avatar: mr.author.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            commits: 0,
            mergeRequests: 0,
            projectsContributed: new Set(),
            issuesAssigned: 0,
            issuesResolved: 0,
            bugsResolved: 0,
          });
        } else {
          // Update avatar if MR has one and devMap doesn't
          const dev = devMap.get(email)!;
          if (mr.author.avatar_url && dev.avatar.includes('ui-avatars.com')) {
            dev.avatar = mr.author.avatar_url;
          }
        }
        
        const dev = devMap.get(email)!;
        dev.mergeRequests += 1;
        if (mr.project_id) {
          dev.projectsContributed.add(mr.project_id);
        }
      }
    });

    // Process issues (assigned and resolved, also track project contributions)
    allIssues.forEach(issue => {
      if (issue.assignees && issue.assignees.length > 0) {
        issue.assignees.forEach(assignee => {
          const email = `${assignee.username.toLowerCase()}@lightpxl.com`;
          
          if (!devMap.has(email)) {
            devMap.set(email, {
              id: email,
              name: assignee.name || assignee.username,
              email,
              avatar: assignee.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee.name || assignee.username)}&background=random`,
              commits: 0,
              mergeRequests: 0,
              projectsContributed: new Set(),
              issuesAssigned: 0,
              issuesResolved: 0,
              bugsResolved: 0,
            });
          } else {
            // Update avatar if issue has one and devMap doesn't
            const dev = devMap.get(email)!;
            if (assignee.avatar_url && dev.avatar.includes('ui-avatars.com')) {
              dev.avatar = assignee.avatar_url;
            }
          }
          
          const dev = devMap.get(email)!;
          dev.issuesAssigned += 1;
          
          // Track project contribution from issues
          if (issue.project_id) {
            dev.projectsContributed.add(issue.project_id);
          }
          
          // Check if issue is resolved (closed)
          if (issue.state === 'closed') {
            dev.issuesResolved += 1;
            
            // Check if it's a bug
            if (issue.issue_type === 'incident' || 
                issue.labels?.some(l => l.toLowerCase().includes('bug'))) {
              dev.bugsResolved += 1;
            }
          }
        });
      }
    });

    // Convert to array and calculate productivity
    const developers = Array.from(devMap.values())
      .filter(dev => dev.commits > 0 || dev.mergeRequests > 0)
      .map(dev => ({
        id: dev.id,
        name: dev.name,
        email: dev.email,
        avatar: dev.avatar,
        commits: dev.commits,
        mergeRequests: dev.mergeRequests,
        projectsContributed: dev.projectsContributed.size,
        issuesAssigned: dev.issuesAssigned,
        issuesResolved: dev.issuesResolved,
        bugsResolved: dev.bugsResolved,
        resolutionRate: dev.issuesAssigned > 0 
          ? Math.round((dev.issuesResolved / dev.issuesAssigned) * 100)
          : 0,
        productivity: dev.commits + (dev.mergeRequests * 2) + (dev.issuesResolved * 1.5),
      }))
      .sort((a, b) => b.productivity - a.productivity);

    return developers;
  }, [commitsQuery.data, mergeRequestsQuery.data, openIssuesQuery.data, closedIssuesQuery.data, projectMembersQuery.data]);

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    const totalCommits = commitsQuery.data?.length || 0;
    const totalMRs = mergeRequestsQuery.data?.length || 0;
    // Count projects with activity in the selected period
    const totalProjects = projectsInPeriod.length;
    const activeDevelopers = developerMetrics.length;
    const totalIssuesResolved = developerMetrics.reduce((sum, dev) => sum + dev.issuesResolved, 0);
    const totalBugsResolved = developerMetrics.reduce((sum, dev) => sum + dev.bugsResolved, 0);
    const totalOpenIssues = openIssuesQuery.data?.length || 0;
    const avgResolutionRate = activeDevelopers > 0
      ? Math.round(developerMetrics.reduce((sum, dev) => sum + dev.resolutionRate, 0) / activeDevelopers)
      : 0;

    return {
      totalCommits,
      totalMRs,
      totalProjects,
      activeDevelopers,
      totalIssuesResolved,
      totalBugsResolved,
      totalOpenIssues,
      avgResolutionRate,
    };
  }, [commitsQuery.data, mergeRequestsQuery.data, projectsInPeriod, developerMetrics, openIssuesQuery.data]);

  // Transform data for charts
  const displayCommits = React.useMemo(() => 
    commitsQuery.data ? transformCommitActivity(commitsQuery.data) : [],
    [commitsQuery.data]
  );

  const displayVelocity = React.useMemo(() => 
    closedIssuesQuery.data?.length ? transformVelocityData(closedIssuesQuery.data) : velocityTrend,
    [closedIssuesQuery.data]
  );

  const handleExportPDF = () => {
    if (developerMetrics.length === 0) {
      toast.error('No data available for export');
      return;
    }

    const doc = new jsPDF() as any;
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
    const fileName = `LightPxl-DetailedReport-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;

    const dateRangeStr = date?.from && date?.to
      ? `${format(date.from, 'PP')} - ${format(date.to, 'PP')}`
      : 'All Time';

    // --- Title & Metadata ---
    doc.setFontSize(22);
    doc.setTextColor(33, 33, 33);
    doc.text(`LightPxl Detailed Performance Report`, 14, 24);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generation Date: ${timestamp}`, 14, 40);
    doc.text(`Reporting Period: ${dateRangeStr}`, 14, 45);
    doc.text(`Total Developers: ${summaryMetrics.activeDevelopers}`, 14, 50);

    // --- Executive Summary Section ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Executive Summary', 14, 65);

    const summaryData = [
      ['Metric', 'Value', 'Status'],
      ['Total Commits', summaryMetrics.totalCommits.toString(), 'Active'],
      ['Merge Requests', summaryMetrics.totalMRs.toString(), 'Productive'],
      ['Active Projects', summaryMetrics.totalProjects.toString(), 'Monitored'],
      ['Active Developers', summaryMetrics.activeDevelopers.toString(), 'Contributing'],
      ['Issues Resolved', summaryMetrics.totalIssuesResolved.toString(), 'Completed'],
      ['Bugs Fixed', summaryMetrics.totalBugsResolved.toString(), 'Quality'],
      ['Open Issues', summaryMetrics.totalOpenIssues.toString(), summaryMetrics.totalOpenIssues < 10 ? 'Good' : 'Review'],
      ['Avg Resolution Rate', `${summaryMetrics.avgResolutionRate}%`, summaryMetrics.avgResolutionRate > 70 ? 'Excellent' : 'Needs Improvement']
    ];

    autoTable(doc, {
      startY: 70,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        2: { fontStyle: 'bold', halign: 'center' }
      }
    });

    // --- Detailed Developer Analytics ---
    const currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('2. Detailed Developer Performance', 14, currentY);

    const developerData = developerMetrics.map(dev => [
      dev.name,
      dev.commits.toString(),
      dev.mergeRequests.toString(),
      dev.projectsContributed.toString(),
      `${dev.issuesResolved}/${dev.issuesAssigned}`,
      dev.bugsResolved.toString(),
      `${dev.resolutionRate}%`
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Developer', 'Commits', 'MRs', 'Projects', 'Issues (Resolved/Assigned)', 'Bugs Fixed', 'Resolution %']],
      body: developerData,
      theme: 'grid',
      headStyles: { fillColor: [48, 63, 159], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        6: { fontStyle: 'bold', halign: 'center' }
      }
    });

    // --- Top Performers Section ---
    const topPerformersY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (topPerformersY > 240) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('3. Top Performers', 14, 20);
      
      const topPerformers = developerMetrics.slice(0, 5);
      const topPerformersData = topPerformers.map((dev, index) => [
        `#${index + 1}`,
        dev.name,
        `${dev.commits} commits, ${dev.mergeRequests} MRs`,
        `${dev.issuesResolved} issues resolved`,
        `${dev.resolutionRate}% resolution rate`
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Rank', 'Developer', 'Contributions', 'Issues', 'Performance']],
        body: topPerformersData,
        theme: 'plain',
        headStyles: { fillColor: [76, 175, 80], fontSize: 10 },
        bodyStyles: { fontSize: 9 }
      });
    } else {
      doc.setFontSize(14);
      doc.text('3. Top Performers', 14, topPerformersY);
      
      const topPerformers = developerMetrics.slice(0, 5);
      const topPerformersData = topPerformers.map((dev, index) => [
        `#${index + 1}`,
        dev.name,
        `${dev.commits} commits, ${dev.mergeRequests} MRs`,
        `${dev.issuesResolved} issues resolved`,
        `${dev.resolutionRate}% resolution rate`
      ]);

      autoTable(doc, {
        startY: topPerformersY + 5,
        head: [['Rank', 'Developer', 'Contributions', 'Issues', 'Performance']],
        body: topPerformersData,
        theme: 'plain',
        headStyles: { fillColor: [76, 175, 80], fontSize: 10 },
        bodyStyles: { fontSize: 9 }
      });
    }

    // --- Add to History ---
    setExportHistory(prev => {
      const newItem = { name: fileName, date: format(new Date(), 'MMM dd, HH:mm') };
      return [newItem, ...prev].slice(0, 5); // Keep last 5
    });

    // --- Footer & Finalize ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`LightPxl Detailed Report | Confidential`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(fileName);
    toast.success('Detailed report exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 p-2 sm:p-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold">Management Reports</h2>
            <p className="text-muted-foreground mt-1">
              Export analytics and generate executive summaries
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <UIButton variant="outline" className="w-full sm:w-[280px] gap-2 justify-start text-sm">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-auto" />
                </UIButton>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={handleDateSelect}
                      numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
                      disabled={(date) => date > new Date()}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <UIButton 
              className="w-full sm:w-auto gap-2 text-sm whitespace-nowrap" 
              onClick={handleExportPDF} 
              disabled={isInitialLoading || developerMetrics.length === 0}
            >
              <FileDown className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Export Detailed PDF</span>
              <span className="sm:hidden">Export PDF</span>
            </UIButton>
          </div>
        </motion.div>

        {isInitialLoading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-4 sm:p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-4 sm:p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Total Commits"
            value={summaryMetrics.totalCommits}
            subtitle="In selected period"
            icon={BarChart3}
            variant="primary"
            delay={0}
          />
          <MetricCard
            title="Merge Requests"
            value={summaryMetrics.totalMRs}
            subtitle="Merged & Open"
            icon={GitMerge}
            variant="success"
            delay={0.05}
          />
          <MetricCard
            title="Active Developers"
            value={summaryMetrics.activeDevelopers}
            subtitle="Contributing"
            icon={Users}
            variant="default"
            delay={0.1}
          />
          <MetricCard
            title="Avg Resolution Rate"
            value={`${summaryMetrics.avgResolutionRate}%`}
            subtitle="Issues resolved"
            icon={TrendingUp}
            variant={summaryMetrics.avgResolutionRate > 70 ? "success" : "warning"}
            delay={0.15}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Active Projects"
            value={summaryMetrics.totalProjects}
            subtitle="With activity"
            icon={FolderGit2}
            variant="default"
            delay={0.2}
          />
          <MetricCard
            title="Issues Resolved"
            value={summaryMetrics.totalIssuesResolved}
            subtitle="Completed"
            icon={CheckCircle2}
            variant="success"
            delay={0.25}
          />
          <MetricCard
            title="Bugs Fixed"
            value={summaryMetrics.totalBugsResolved}
            subtitle="Quality work"
            icon={Bug}
            variant="primary"
            delay={0.3}
          />
          <MetricCard
            title="Open Issues"
            value={summaryMetrics.totalOpenIssues}
            subtitle="Pending"
            icon={AlertTriangle}
            variant={summaryMetrics.totalOpenIssues < 10 ? "success" : "warning"}
            delay={0.35}
          />
        </div>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"
        >
          <div className="lg:col-span-2">
            <div className="glass-card rounded-xl p-4 sm:p-6 h-full">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Developer Performance Analytics</h3>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {isDataLoading && developerMetrics.length === 0 ? (
                  <div className="space-y-3 px-4 sm:px-0">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-muted-foreground">
                        <th className="text-left py-2 sm:py-3 font-medium px-4 sm:px-0">Developer</th>
                        <th className="text-center py-2 sm:py-3 font-medium hidden sm:table-cell">Commits</th>
                        <th className="text-center py-2 sm:py-3 font-medium hidden md:table-cell">MRs</th>
                        <th className="text-center py-2 sm:py-3 font-medium hidden lg:table-cell">Projects</th>
                        <th className="text-center py-2 sm:py-3 font-medium">Issues</th>
                        <th className="text-center py-2 sm:py-3 font-medium hidden md:table-cell">Bugs</th>
                        <th className="text-right py-2 sm:py-3 font-medium px-4 sm:px-0">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {developerMetrics.slice(0, 10).map((dev) => (
                        <tr key={dev.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 sm:py-4 px-4 sm:px-0">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <img src={dev.avatar} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10" alt="" />
                              <span className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{dev.name}</span>
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 text-center hidden sm:table-cell">{dev.commits}</td>
                          <td className="py-3 sm:py-4 text-center hidden md:table-cell">{dev.mergeRequests}</td>
                          <td className="py-3 sm:py-4 text-center hidden lg:table-cell">{dev.projectsContributed}</td>
                          <td className="py-3 sm:py-4 text-center">
                            <span className="text-xs">
                              <span className="font-semibold text-success">{dev.issuesResolved}</span>
                              <span className="text-muted-foreground">/{dev.issuesAssigned}</span>
                            </span>
                          </td>
                          <td className="py-3 sm:py-4 text-center hidden md:table-cell">
                            {dev.bugsResolved > 0 && (
                              <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">
                                {dev.bugsResolved}
                              </span>
                            )}
                            {dev.bugsResolved === 0 && (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 sm:py-4 text-right px-4 sm:px-0">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              dev.resolutionRate >= 80 ? 'bg-success/10 text-success' :
                              dev.resolutionRate >= 60 ? 'bg-warning/10 text-warning' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {dev.resolutionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!isDataLoading && developerMetrics.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No developer activity found for the selected period.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="glass-card rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Key Insights</h3>
              {isDataLoading && developerMetrics.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-3">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Most Productive Developer */}
                  {developerMetrics[0] && (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">Most Productive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <img src={developerMetrics[0].avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                        <div>
                          <div className="font-semibold text-sm">{developerMetrics[0].name}</div>
                          <div className="text-xs text-muted-foreground">{Math.round(developerMetrics[0].productivity)} productivity score</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Best Issue Resolver */}
                  {(() => {
                    const bestResolver = [...developerMetrics]
                      .filter(d => d.issuesAssigned >= 3)
                      .sort((a, b) => b.resolutionRate - a.resolutionRate)[0];
                    return bestResolver && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-muted-foreground">Best Issue Resolver</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={bestResolver.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                          <div>
                            <div className="font-semibold text-sm">{bestResolver.name}</div>
                            <div className="text-xs text-muted-foreground">{bestResolver.resolutionRate}% resolution rate</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Top Bug Fixer */}
                  {(() => {
                    const topBugFixer = [...developerMetrics]
                      .filter(d => d.bugsResolved > 0)
                      .sort((a, b) => b.bugsResolved - a.bugsResolved)[0];
                    return topBugFixer && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Bug className="w-4 h-4 text-warning" />
                          <span className="text-xs font-medium text-muted-foreground">Top Bug Fixer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={topBugFixer.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                          <div>
                            <div className="font-semibold text-sm">{topBugFixer.name}</div>
                            <div className="text-xs text-muted-foreground">{topBugFixer.bugsResolved} bugs fixed</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Most Commits */}
                  {(() => {
                    const topCommitter = [...developerMetrics].sort((a, b) => b.commits - a.commits)[0];
                    return topCommitter && topCommitter.commits > 0 && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">Most Active Committer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src={topCommitter.avatar} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                          <div>
                            <div className="font-semibold text-sm">{topCommitter.name}</div>
                            <div className="text-xs text-muted-foreground">{topCommitter.commits} commits</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {!isDataLoading && developerMetrics.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No insights available
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="glass-card rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-semibold mb-3 sm:mb-4">Export History</h3>
              <div className="space-y-2 sm:space-y-3">
                {exportHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/20 hover:bg-secondary/30 transition-colors group cursor-default">
                    <span className="truncate flex-1 mr-2 text-xs">{item.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap text-xs">{item.date}</span>
                  </div>
                ))}
                {exportHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">
                    No recent exports
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {!isInitialLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <CommitChart data={displayCommits} />
            <VelocityChart data={velocityTrend} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
