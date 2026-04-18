import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { gitlabService } from '@/services/gitlab';
import {
    FolderIcon,
    ChevronRight,
    Search,
    LayoutGrid,
    List,
    Users,
    AlertCircle,
    CheckCircle2,
    Bug,
    BookOpen,
    ArrowLeft,
    Loader2,
    ExternalLink,
    GitBranch,
    Calendar,
    ChevronDown,
    ChevronUp,
    FolderTree,
    TrendingUp,
    Activity,
    XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { GitLabGroup, GitLabProject, GitLabIssue, GitLabUser } from '@/types/gitlab';
import { format, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface GroupWithStats extends GitLabGroup {
    subgroupsCount: number;
    projectsCount: number;
    activeProjectsCount: number;
    healthScore: number;
}

interface ProjectPath {
    groupId: number;
    groupName: string;
}

const GroupsPage = () => {
    // View state
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'hierarchy'>('hierarchy');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPath, setCurrentPath] = useState<ProjectPath[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [selectedProject, setSelectedProject] = useState<GitLabProject | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<GitLabIssue | null>(null);

    // Date range state with default 90 days
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 90),
        to: new Date()
    });

    // Fetch all groups
    const { data: allGroups = [], isLoading: isLoadingGroups, isInitialLoading: isInitialLoadingGroups } = useQuery({
        queryKey: ['all-groups'],
        queryFn: () => gitlabService.getGroups()
    });

    // Fetch groups at current path
    const currentGroupId = currentPath.length > 0 ? currentPath[currentPath.length - 1].groupId : null;
    const { data: groups = [] } = useQuery({
        queryKey: ['groups', currentGroupId],
        queryFn: () => currentGroupId 
            ? gitlabService.getSubGroups(currentGroupId)
            : gitlabService.getGroups(),
        enabled: true
    });

    // Fetch projects for current group
    const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
        queryKey: ['group-projects', currentGroupId],
        queryFn: () => currentGroupId 
            ? gitlabService.getGroupProjects(currentGroupId)
            : gitlabService.getProjects(),
        enabled: true
    });

    // Fetch all projects for statistics
    const { data: allProjects = [], isLoading: isLoadingAllProjects } = useQuery({
        queryKey: ['all-projects'],
        queryFn: () => gitlabService.getProjects()
    });

    // Fetch issues for selected project
    const { data: projectIssues, isLoading: isLoadingIssues } = useQuery({
        queryKey: ['project-issues', selectedProject?.id],
        queryFn: () => gitlabService.getProjectIssues(selectedProject!.id, 'opened'),
        enabled: !!selectedProject
    });

    const { data: projectIncidents, isLoading: isLoadingIncidents } = useQuery({
        queryKey: ['project-incidents', selectedProject?.id],
        queryFn: async () => {
            const issues = await gitlabService.getProjectIssues(selectedProject!.id, 'opened');
            return issues.filter(issue => issue.issue_type === 'incident');
        },
        enabled: !!selectedProject
    });

    const { data: projectTasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['project-tasks', selectedProject?.id],
        queryFn: async () => {
            const issues = await gitlabService.getProjectIssues(selectedProject!.id, 'opened');
            return issues.filter(issue => 
                issue.labels?.includes('task') || 
                issue.issue_type === 'test_case'
            );
        },
        enabled: !!selectedProject
    });

    // Calculate date range
    const fromDate = dateRange?.from ? new Date(dateRange.from).getTime() : 0;
    const toDate = dateRange?.to ? new Date(dateRange.to).getTime() : Date.now();

    // Filter projects by date range
    const projectsInPeriod = useMemo(() => {
        if (!dateRange?.from) return allProjects;
        return allProjects.filter(p => {
            const lastActivity = new Date(p.last_activity_at).getTime();
            return lastActivity >= fromDate && lastActivity <= toDate;
        });
    }, [allProjects, fromDate, toDate, dateRange]);

    // Calculate group statistics with hierarchy
    const groupsWithStats = useMemo((): GroupWithStats[] => {
        if (!groups || !allProjects) return [];

        return groups.map(group => {
            // Count subgroups (direct children)
            const subgroupsCount = allGroups.filter(g => 
                g.parent_id === group.id
            ).length;

            // Count all projects in this group and its descendants
            const groupProjects = allProjects.filter(p => {
                if (!p.namespace) return false;
                // Check if project belongs to this group or any of its subgroups
                const namespace = p.namespace;
                return namespace.id === group.id || namespace.full_path?.startsWith(group.full_path + '/');
            });

            const projectsCount = groupProjects.length;

            // Count active projects in date range
            const activeProjectsCount = dateRange?.from 
                ? groupProjects.filter(p => {
                    const lastActivity = new Date(p.last_activity_at).getTime();
                    return lastActivity >= fromDate && lastActivity <= toDate;
                }).length
                : projectsCount;

            // Calculate health score (based on active projects ratio)
            const healthScore = projectsCount > 0 
                ? Math.round((activeProjectsCount / projectsCount) * 100)
                : 100;

            return {
                ...group,
                subgroupsCount,
                projectsCount,
                activeProjectsCount,
                healthScore
            };
        });
    }, [groups, allGroups, allProjects, dateRange, fromDate, toDate]);

    // Calculate manager insights
    const managerInsights = useMemo(() => {
        const totalGroups = allGroups.length;
        const totalProjects = allProjects.length;
        const activeProjects = projectsInPeriod.length;

        // Calculate unique contributors
        const uniqueContributors = new Set(
            allProjects.flatMap(p => [p.creator_id])
        ).size;

        // Health distribution
        const healthyProjects = projectsInPeriod.filter(p => {
            // Project is healthy if it has recent activity
            const daysAgo = (Date.now() - new Date(p.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo < 7;
        }).length;

        const fairProjects = projectsInPeriod.filter(p => {
            const daysAgo = (Date.now() - new Date(p.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo >= 7 && daysAgo < 14;
        }).length;

        const atRiskProjects = activeProjects - healthyProjects - fairProjects;

        return {
            totalGroups,
            totalProjects,
            activeProjects,
            uniqueContributors,
            healthyProjects,
            fairProjects,
            atRiskProjects
        };
    }, [allGroups, allProjects, projectsInPeriod]);

    // Filter groups and projects by search
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groupsWithStats;
        return groupsWithStats.filter(g => 
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.full_path?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [groupsWithStats, searchQuery]);

    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects;
        return projects.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.path?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    // Navigation functions
    const navigateToGroup = (group: GitLabGroup) => {
        setCurrentPath([...currentPath, { groupId: group.id, groupName: group.name }]);
        setExpandedGroups(new Set());
    };

    const navigateBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const toggleGroupExpand = (groupId: number) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    // Quick date presets
    const setQuickDate = (days: number) => {
        setDateRange({
            from: subDays(new Date(), days),
            to: new Date()
        });
    };

    const getHealthBadge = (score: number) => {
        if (score >= 75) return { variant: 'default' as const, label: 'Healthy', icon: CheckCircle2, color: 'text-green-500' };
        if (score >= 50) return { variant: 'secondary' as const, label: 'Fair', icon: AlertCircle, color: 'text-yellow-500' };
        if (score >= 25) return { variant: 'destructive' as const, label: 'At Risk', icon: AlertCircle, color: 'text-orange-500' };
        return { variant: 'destructive' as const, label: 'Critical', icon: XCircle, color: 'text-red-500' };
    };

    const isLoading = isInitialLoadingGroups || isLoadingAllProjects;
    const isDataLoading = isLoadingGroups || isLoadingProjects;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header with Manager Insights */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">Groups & Teams</h1>
                            <p className="text-muted-foreground mt-1">Organizational hierarchy and team management</p>
                        </div>

                        {/* Date Range Picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal shrink-0">
                                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </span>
                                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <div className="p-3 border-b space-y-2">
                                    <div className="text-sm font-medium">Quick Select</div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>
                                            30 days
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setQuickDate(90)}>
                                            90 days
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setQuickDate(180)}>
                                            180 days
                                        </Button>
                                    </div>
                                </div>
                                <CalendarComponent
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Manager Insights Cards */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Card key={i} className="p-6">
                                    <Skeleton className="h-4 w-20 mb-2" />
                                    <Skeleton className="h-8 w-16 mb-1" />
                                    <Skeleton className="h-3 w-32" />
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Groups</p>
                                        <p className="text-2xl font-bold mt-1">{managerInsights.totalGroups}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Teams & departments</p>
                                    </div>
                                    <FolderTree className="h-8 w-8 text-primary opacity-20" />
                                </div>
                            </Card>

                            <Card className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Active Projects</p>
                                        <p className="text-2xl font-bold mt-1">{managerInsights.activeProjects}</p>
                                        <p className="text-xs text-muted-foreground mt-1">of {managerInsights.totalProjects} total</p>
                                    </div>
                                    <Activity className="h-8 w-8 text-primary opacity-20" />
                                </div>
                            </Card>

                            <Card className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Contributors</p>
                                        <p className="text-2xl font-bold mt-1">{managerInsights.uniqueContributors}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Unique developers</p>
                                    </div>
                                    <Users className="h-8 w-8 text-primary opacity-20" />
                                </div>
                            </Card>

                            <Card className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Health Score</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <p className="text-2xl font-bold text-green-500">{managerInsights.healthyProjects}</p>
                                            <p className="text-sm text-yellow-500">{managerInsights.fairProjects}</p>
                                            <p className="text-sm text-red-500">{managerInsights.atRiskProjects}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Healthy / Fair / At Risk</p>
                                    </div>
                                    <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Groups and Projects List */}
                    <div className="lg:col-span-2">
                        <Card className="p-6">
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search groups and projects..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant={viewMode === 'hierarchy' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('hierarchy')}
                                    >
                                        <FolderTree className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === 'list' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('list')}
                                    >
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Breadcrumbs */}
                            {currentPath.length > 0 && (
                                <div className="flex items-center gap-2 mb-4 text-sm">
                                    <Button variant="ghost" size="sm" onClick={() => setCurrentPath([])}>
                                        <FolderIcon className="h-4 w-4 mr-1" />
                                        Root
                                    </Button>
                                    {currentPath.map((path, index) => (
                                        <div key={path.groupId} className="flex items-center gap-2">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                                            >
                                                {path.groupName}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Loading State */}
                            {isLoading ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <Skeleton className="h-5 w-48 mb-2" />
                                                    <Skeleton className="h-4 w-32" />
                                                </div>
                                                <Skeleton className="h-8 w-20" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Groups Section */}
                                    {filteredGroups.length > 0 && (
                                        <section>
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                                <FolderIcon className="h-4 w-4" />
                                                Groups ({filteredGroups.length})
                                            </h3>

                                            <div className={cn(
                                                viewMode === 'grid' && "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                                viewMode === 'list' && "space-y-2",
                                                viewMode === 'hierarchy' && "space-y-2"
                                            )}>
                                                {filteredGroups.map((group) => {
                                                    const health = getHealthBadge(group.healthScore);
                                                    const isExpanded = expandedGroups.has(group.id);

                                                    return (
                                                        <motion.div
                                                            key={group.id}
                                                            layout
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="glass-card p-4 hover:bg-white/5 transition-all cursor-pointer rounded-lg border"
                                                        >
                                                            <div 
                                                                onClick={() => viewMode === 'hierarchy' ? toggleGroupExpand(group.id) : navigateToGroup(group)}
                                                                className="flex items-center justify-between"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    {viewMode === 'hierarchy' && (
                                                                        isExpanded ? 
                                                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> :
                                                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                    )}
                                                                    <FolderIcon className="h-5 w-5 text-primary shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium truncate">{group.name}</p>
                                                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                                            <span>{group.subgroupsCount} subgroups</span>
                                                                            <span>•</span>
                                                                            <span>{group.projectsCount} projects</span>
                                                                            {dateRange?.from && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="text-primary">{group.activeProjectsCount} active</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant={health.variant} className="flex items-center gap-1">
                                                                        <health.icon className={cn("h-3 w-3", health.color)} />
                                                                        <span className="hidden sm:inline">{health.label}</span>
                                                                    </Badge>
                                                                </div>
                                                            </div>

                                                            {/* Hierarchy expansion */}
                                                            {viewMode === 'hierarchy' && isExpanded && group.projectsCount > 0 && (
                                                                <div className="ml-7 mt-3 pt-3 border-t space-y-2">
                                                                    <p className="text-xs text-muted-foreground mb-2">Projects in this group:</p>
                                                                    {projects
                                                                        .filter(p => p.namespace?.id === group.id)
                                                                        .slice(0, 5)
                                                                        .map(project => (
                                                                            <div
                                                                                key={project.id}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedProject(project);
                                                                                }}
                                                                                className="flex items-center gap-2 p-2 rounded hover:bg-white/5 transition-colors"
                                                                            >
                                                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                                                <span className="text-sm flex-1 truncate">{project.name}</span>
                                                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                                            </div>
                                                                        ))
                                                                    }
                                                                    {projects.filter(p => p.namespace?.id === group.id).length > 5 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigateToGroup(group);
                                                                            }}
                                                                            className="text-xs text-primary hover:underline ml-4"
                                                                        >
                                                                            View all {projects.filter(p => p.namespace?.id === group.id).length} projects
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {/* Projects Section */}
                                    {filteredProjects.length > 0 && (
                                        <section>
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                                <Activity className="h-4 w-4" />
                                                Projects ({filteredProjects.length})
                                            </h3>

                                            <div className={cn(
                                                viewMode === 'grid' && "grid grid-cols-1 sm:grid-cols-2 gap-4",
                                                viewMode === 'list' && "space-y-2",
                                                viewMode === 'hierarchy' && "space-y-2"
                                            )}>
                                                {filteredProjects.map((project) => (
                                                    <motion.div
                                                        key={project.id}
                                                        layout
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        onClick={() => setSelectedProject(project)}
                                                        className="glass-card p-4 hover:bg-white/5 transition-all cursor-pointer rounded-lg border"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium truncate">{project.name}</p>
                                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                                    {project.namespace?.full_path || project.path}
                                                                </p>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* No Results */}
                                    {!filteredGroups.length && !filteredProjects.length && (
                                        <div className="text-center py-20">
                                            <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Search className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium">No results found</h3>
                                            <p className="text-muted-foreground mt-2">Try adjusting your filters or navigating to a different group.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Project Details Panel */}
                    <div className={cn(
                        "lg:col-span-1",
                        !selectedProject && "hidden lg:block"
                    )}>
                        <AnimatePresence mode="wait">
                            {selectedProject ? (
                                <motion.div
                                    key={selectedProject.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="glass-card rounded-xl overflow-hidden sticky top-24"
                                >
                                    <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="lg:hidden"
                                            onClick={() => setSelectedProject(null)}
                                        >
                                            <ArrowLeft className="h-4 w-4 mr-2" />
                                            Back
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold truncate">{selectedProject.name}</h3>
                                            <a
                                                href={selectedProject.web_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-muted-foreground hover:text-primary"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </div>

                                    <Tabs defaultValue="issues" className="w-full">
                                        <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent px-2 h-12">
                                            <TabsTrigger value="issues" className="data-[state=active]:bg-primary/10">Issues</TabsTrigger>
                                            <TabsTrigger value="incidents" className="data-[state=active]:bg-primary/10">Incidents</TabsTrigger>
                                            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary/10">Tasks</TabsTrigger>
                                        </TabsList>

                                        <div className="p-4 h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar">
                                            <TabsContent value="issues" className="mt-0 space-y-3">
                                                {isLoadingIssues ? (
                                                    <div className="space-y-3">
                                                        {[...Array(3)].map((_, i) => (
                                                            <div key={i} className="p-3 rounded-lg bg-secondary/20">
                                                                <Skeleton className="h-4 w-full mb-2" />
                                                                <Skeleton className="h-3 w-20" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : projectIssues?.length === 0 ? (
                                                    <p className="text-center text-sm text-muted-foreground py-10">No open issues found.</p>
                                                ) : (
                                                    projectIssues?.map((issue: GitLabIssue) => (
                                                        <div
                                                            key={issue.id}
                                                            onClick={() => setSelectedIssue(issue)}
                                                            className="p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all border border-white/5 group/item"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-medium line-clamp-2">{issue.title}</p>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[10px] text-muted-foreground">#{issue.iid}</span>
                                                                        {issue.labels.slice(0, 2).map(l => (
                                                                            <Badge key={l} variant="secondary" className="text-[9px] h-3.5 px-1.5">{l}</Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </TabsContent>

                                            <TabsContent value="incidents" className="mt-0 space-y-3">
                                                {isLoadingIncidents ? (
                                                    <div className="space-y-3">
                                                        {[...Array(2)].map((_, i) => (
                                                            <div key={i} className="p-3 rounded-lg bg-destructive/10">
                                                                <Skeleton className="h-4 w-full mb-2" />
                                                                <Skeleton className="h-3 w-24" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : projectIncidents?.length === 0 ? (
                                                    <p className="text-center text-sm text-muted-foreground py-10">No active incidents.</p>
                                                ) : (
                                                    projectIncidents?.map((incident: GitLabIssue) => (
                                                        <div
                                                            key={incident.id}
                                                            onClick={() => setSelectedIssue(incident)}
                                                            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 cursor-pointer transition-all"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <Bug className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-medium">{incident.title}</p>
                                                                    <span className="text-[10px] text-destructive/70 mt-1 block">Opened: {new Date(incident.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </TabsContent>

                                            <TabsContent value="tasks" className="mt-0 space-y-3">
                                                {isLoadingTasks ? (
                                                    <div className="space-y-3">
                                                        {[...Array(2)].map((_, i) => (
                                                            <div key={i} className="p-3 rounded-lg bg-secondary/20">
                                                                <Skeleton className="h-4 w-full mb-2" />
                                                                <Skeleton className="h-3 w-20" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : projectTasks?.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                                                        <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                                                        <p className="text-sm font-medium">Task tracking enabled</p>
                                                        <p className="text-xs px-10">Tasks with 'task' label or type 'test_case' will appear here. No tasks found.</p>
                                                    </div>
                                                ) : (
                                                    projectTasks?.map((task: GitLabIssue) => (
                                                        <div
                                                            key={task.id}
                                                            onClick={() => setSelectedIssue(task)}
                                                            className="p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all border border-white/5"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[10px] text-muted-foreground">#{task.iid}</span>
                                                                        {task.labels.slice(0, 2).map(l => (
                                                                            <Badge key={l} variant="secondary" className="text-[9px] h-3.5 px-1.5">{l}</Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </motion.div>
                            ) : (
                                <div className="h-full flex items-center justify-center glass-card rounded-xl p-8 text-center border-dashed border-2 border-white/10">
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
                                            <LayoutGrid className="h-8 w-8 text-muted-foreground opacity-30" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">Select a Project</h3>
                                            <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
                                                Pick a project from the list to view its issues, tasks, and incidents in detail.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Issue Detail Sheet */}
            <Sheet open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto custom-scrollbar">
                    <SheetHeader className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant={selectedIssue?.issue_type === 'incident' ? 'destructive' : 'secondary'}>
                                {selectedIssue?.issue_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">#{selectedIssue?.iid}</span>
                        </div>
                        <SheetTitle className="text-xl leading-tight">{selectedIssue?.title}</SheetTitle>
                        <SheetDescription>
                            Opened {selectedIssue && new Date(selectedIssue.created_at).toLocaleDateString()} by {selectedIssue?.author.name}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-8">
                        {/* Assignees */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Assignees
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedIssue?.assignees && selectedIssue.assignees.length > 0 ? (
                                    selectedIssue.assignees.map((user: GitLabUser) => (
                                        <div key={user.id} className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-white/5">
                                            <img src={user.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                                            <span className="text-xs font-medium">{user.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground bg-secondary/20 px-3 py-1.5 rounded-full">Unassigned</p>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                Description
                            </h4>
                            <div className="prose prose-invert prose-sm max-w-none bg-secondary/10 p-4 rounded-xl border border-white/5 min-h-[100px] whitespace-pre-wrap">
                                {selectedIssue?.description || <span className="text-muted-foreground italic">No description provided.</span>}
                            </div>
                        </div>

                        {/* Sub Tasks Section */}
                        <SubTaskSection
                            projectId={selectedIssue?.project_id}
                            issueIid={selectedIssue?.iid}
                            onSelectIssue={setSelectedIssue}
                        />

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">State</p>
                                <p className="text-sm font-medium mt-1 inline-flex items-center gap-1">
                                    <Badge variant="outline" className="text-success border-success/30 bg-success/5">
                                        {selectedIssue?.state}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Updated</p>
                                <p className="text-sm font-medium mt-1">
                                    {selectedIssue && new Date(selectedIssue.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button className="w-full gap-2" asChild>
                                <a href={selectedIssue?.web_url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    View on GitLab
                                </a>
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </DashboardLayout>
    );
};

const SubTaskSection = ({ projectId, issueIid, onSelectIssue }: { projectId?: number, issueIid?: number, onSelectIssue: (issue: GitLabIssue) => void }) => {
    const { data: subTasks, isLoading } = useQuery({
        queryKey: ['sub-tasks', projectId, issueIid],
        queryFn: () => gitlabService.getIssueSubTasks(projectId!, issueIid!),
        enabled: !!projectId && !!issueIid
    });

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    if (!subTasks || subTasks.length === 0) return null;

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Linked Tasks / Sub-tasks ({subTasks.length})
            </h4>
            <div className="space-y-2">
                {subTasks.map((task: any) => (
                    <div
                        key={task.id}
                        onClick={() => onSelectIssue(task)}
                        className="p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all border border-white/5 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-xs font-medium line-clamp-1">{task.title}</span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GroupsPage;
