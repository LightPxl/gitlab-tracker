import { GitLabUser, GitLabCommit, GitLabMergeRequest } from '@/types/gitlab';
import { Developer } from '@/lib/mockData';

export function buildDevelopers(
  users: GitLabUser[],
  commits: GitLabCommit[],
  mergeRequests: GitLabMergeRequest[]
): Developer[] {
  return users.map(user => {
    const userCommits = commits.filter(commit => 
      commit.author_email === user.email || commit.author_name === user.name
    );
    
    const userMRs = mergeRequests.filter(mr => 
      mr.author?.id === user.id
    );

    const userMergedMRs = userMRs.filter(mr => mr.state === 'merged');
    
    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCommits = userCommits.filter(commit => 
      new Date(commit.authored_date) > thirtyDaysAgo
    ).length;
    
    const recentMRs = userMRs.filter(mr => 
      new Date(mr.created_at) > thirtyDaysAgo
    ).length;

    const mergeRate = userMRs.length > 0 ? userMergedMRs.length / userMRs.length : 0;
    const consistencyScore = Math.min(1, (recentCommits + recentMRs) / 20);
    const collaborationScore = Math.min(1, userMRs.length / 15);
    const productivityScore = Math.round(
      (mergeRate * 0.5 + consistencyScore * 0.3 + collaborationScore * 0.2) * 100
    );

    // Determine trend based on recent activity
    const totalActivity = userCommits.length + userMRs.length;
    const recentActivity = recentCommits + recentMRs;
    const trend: 'up' | 'down' | 'stable' = 
      recentActivity > totalActivity * 0.3 ? 'up' : 
      recentActivity < totalActivity * 0.1 ? 'down' : 'stable';

    return {
      id: user.id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar_url || '',
      role: 'Developer', // Default role since not available from GitLab API
      team: 'Development', // Default team since not available from GitLab API
      commits: userCommits.length,
      mergeRequests: userMRs.length,
      codeReviews: userMRs.length, // Approximate code reviews as MR count
      issuesCompleted: 0, // Would need separate issues data
      issuesAssigned: 0, // Would need separate issues data
      productivityScore,
      trend,
      webUrl: user.web_url,
    };
  }).sort((a, b) => b.productivityScore - a.productivityScore);
}