
import { useQuery } from '@tanstack/react-query';
import { gitlabService } from '@/services/gitlab';

export const useProjectWikis = (projectId: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['project-wikis', projectId],
        queryFn: () => gitlabService.getProjectWikis(projectId),
        enabled: !!projectId && enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
