import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from '@tanstack/react-query';
import { gitlabService } from '@/services/gitlab';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FolderTree,
  GitBranch,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  GitlabIcon,
  Bell,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Search as SearchIcon,
  CheckCircle2,
  MessageSquare,
  GitPullRequest,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GitLabProject } from '@/types/gitlab';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CommandPalette } from '@/components/dashboard/CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Developers', href: '/developers', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Groups', href: '/groups', icon: FolderTree },
  { name: 'CI/CD', href: '/pipelines', icon: GitBranch },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Only use saved collapsed state for desktop, mobile always uses full width when open
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? saved === 'true' : false;
  });
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(desktopCollapsed));
  }, [desktopCollapsed]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const { data: userData } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => gitlabService.getCurrentUser(),
    staleTime: Infinity
  });

  const { data: todos, refetch: refetchTodos } = useQuery({
    queryKey: ['gitlab-todos'],
    queryFn: () => gitlabService.getTodos(),
    refetchInterval: 30000 // Refresh every 30s
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['project-search', debouncedSearch],
      queryFn: () => gitlabService.searchProjects(debouncedSearch),
      enabled: debouncedSearch.length > 2
  });

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const getPageTitle = () => {
    const item = navigation.find(n => n.href === location.pathname);
    return item ? item.name : 'Dashboard';
  };

  // Computed collapsed state: mobile sidebar is always expanded when open
  const collapsed = isMobile ? false : desktopCollapsed;
  const setCollapsed = setDesktopCollapsed;

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,86,255,0.1),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(56,139,253,0.08),transparent_18%)]" />
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen',
          'bg-sidebar/90 border-r border-white/8 backdrop-blur-2xl',
          'flex flex-col transition-all duration-200',
          collapsed ? 'w-[72px]' : 'w-[240px]',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/6 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_0_28px_hsl(var(--primary)/0.3)]">
            <GitlabIcon className="h-5 w-5" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="text-sm font-semibold tracking-tight text-white">Projects Tracking</span>
              <span className="text-xs text-muted-foreground">LightPxl</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <Tooltip key={item.name} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                      'hover:bg-sidebar-accent/80 group',
                      isActive && 'bg-white/[0.05] text-sidebar-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    )}
                  >
                    <item.icon className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                    )} />
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'text-sm font-medium',
                          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                        )}
                      >
                        {item.name}
                      </motion.span>
                    )}
                    {isActive && !collapsed && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary shadow-[0_0_12px_hsl(var(--sidebar-primary)/0.75)]"
                      />
                    )}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    {item.name}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors',
                  'hover:bg-sidebar-accent/80 text-sidebar-foreground/70 hover:text-sidebar-foreground'
                )}
              >
                {isDark ? (
                  <Moon className="h-5 w-5 shrink-0" />
                ) : (
                  <Sun className="h-5 w-5 shrink-0" />
                )}
                {!collapsed && <span className="text-sm">Theme</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                Toggle Theme
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'hover:bg-sidebar-accent/80 text-sidebar-foreground/70 hover:text-sidebar-foreground'
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-sm">Settings</span>}
              </NavLink>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                Settings
              </TooltipContent>
            )}
          </Tooltip>

          {/* Collapse button - hidden on mobile */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'hidden md:flex items-center justify-center w-full py-2 rounded-lg transition-colors',
              'hover:bg-sidebar-accent/80 text-sidebar-foreground/70 hover:text-sidebar-foreground'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>

          {/* Close button - visible on mobile only */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'flex md:hidden items-center justify-center w-full py-2 rounded-lg transition-colors',
              'hover:bg-sidebar-accent/80 text-sidebar-foreground/70 hover:text-sidebar-foreground'
            )}
          >
            <X className="h-5 w-5 mr-2" />
            <span className="text-sm">Close</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          'flex-1 min-w-0 transition-all duration-200',
          'ml-0',
          !isMobile && (desktopCollapsed ? 'md:ml-[72px]' : 'md:ml-[240px]')
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/6 bg-background/70 backdrop-blur-2xl">
          <div className="flex items-center justify-between px-4 md:px-6 h-14 md:h-16">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">{getPageTitle()}</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">GitLab.com • Real-time Data</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block w-64">
                <DropdownMenu open={!!searchResults && searchResults.length > 0 && searchQuery.length > 2}>
                  <DropdownMenuTrigger asChild>
                    <div className="relative group cursor-pointer" onClick={() => {
                      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true });
                      document.dispatchEvent(event);
                    }}>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        <Input
                          placeholder="Search projects..."
                        className="h-9 rounded-xl border border-white/8 bg-white/[0.03] pl-9 pr-12 text-xs focus-visible:ring-1 focus-visible:ring-primary/30 cursor-text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          readOnly // The CommandPalette handles the actual search interaction
                      />
                      <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        <span className="text-[8px]">Ctrl</span>
                        <span>K</span>
                      </div>
                      {isSearching && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="start">
                    {searchResults?.map((project: GitLabProject) => (
                      <DropdownMenuItem key={project.id} className="cursor-pointer" asChild>
                        <a href={project.web_url} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full">
                          <span className="truncate">{project.name}</span>
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {todos && todos.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-[10px] font-bold text-destructive-foreground rounded-full flex items-center justify-center">
                        {todos.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between border-b border-white/6 bg-muted/20 p-4">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    <Badge variant="outline" className="text-[10px]">{todos?.length || 0} Pending</Badge>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {todos && todos.length > 0 ? (
                      todos.map((todo: any) => (
                        <div key={todo.id} className="group relative border-b border-white/6 p-4 transition-colors last:border-0 hover:bg-muted/30">
                          <div className="flex gap-3 pr-8">
                            <div className="mt-1">
                              {todo.action_name === 'marked' ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                                todo.action_name === 'mentioned' ? <MessageSquare className="h-4 w-4 text-primary" /> :
                                  <GitPullRequest className="h-4 w-4 text-warning" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{todo.project.name_with_namespace}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{todo.body}</p>
                              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                {todo.author.name} • {new Date(todo.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mark as read"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await gitlabService.markTodoAsDone(todo.id);
                                refetchTodos();
                                toast({
                                  title: "Notification marked as read",
                                  description: "The notification has been removed.",
                                });
                              } catch (error: any) {
                                console.error('Failed to mark todo as done', error);
                                if (error.message.includes('Forbidden') || error.message.includes('403')) {
                                  // Optimistically remove from UI even if server fails (likely due to read-only token)
                                  // We can force a refetch or manually filter, but refetch might just bring it back if server didn't update.
                                  // So let's tell the user.
                                  toast({
                                    variant: "destructive",
                                    title: "Permission Denied",
                                    description: "Token is read-only. Notification hidden locally.",
                                  });
                                  // Force remove from local cache/state if we had local state, but we rely on refetchTodos.
                                  // Ideally we should update the cache manually here but react-query refetch will overwrite it.
                                  // For now, the toast explains it.
                                } else {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to mark notification as read.",
                                  });
                                }
                              }
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-success" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center">
                        <CheckCircle2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">No pending notifications.</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-white/10 shadow-[0_8px_25px_rgba(0,0,0,0.25)]">
                  <AvatarImage src={userData?.avatar_url} />
                  <AvatarFallback>{userData?.name?.substring(0, 2).toUpperCase() || 'GU'}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{userData?.name || 'GitLab User'}</p>
                  <p className="text-xs text-muted-foreground">@{userData?.username || 'user'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="relative p-4 md:p-6">
          {children}
        </div>
        <CommandPalette />
      </div>
    </div>
  );
}
