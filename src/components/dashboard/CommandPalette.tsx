import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    FolderTree,
    GitBranch,
    BarChart3,
    Settings,
    Search,
} from "lucide-react";
import { gitlabService } from "@/services/gitlab";
import { GitLabProject } from "@/types/gitlab";

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [projects, setProjects] = React.useState<GitLabProject[]>([]);
    const navigate = useNavigate();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    React.useEffect(() => {
        if (query.length > 2) {
            gitlabService.searchProjects(query).then(setProjects);
        } else {
            setProjects([]);
        }
    }, [query]);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Type a command or search projects..."
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard Overview</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/groups"))}>
                        <FolderTree className="mr-2 h-4 w-4" />
                        <span>Groups & Hierarchy</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/reports"))}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Management Reports</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Navigation">
                    <CommandItem onSelect={() => runCommand(() => navigate("/projects"))}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        <span>Projects List</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/developers"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Developers Activity</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/pipelines"))}>
                        <GitBranch className="mr-2 h-4 w-4" />
                        <span>CI/CD Pipelines</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                </CommandGroup>
                {projects.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Projects Search">
                            {projects.map((project) => (
                                <CommandItem
                                    key={project.id}
                                    onSelect={() => runCommand(() => window.open(project.web_url, "_blank"))}
                                >
                                    <Search className="mr-2 h-4 w-4" />
                                    <span>{project.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">ID: {project.id}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}
