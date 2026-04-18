import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, GitCommit, GitPullRequest, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Developer } from '@/lib/mockData';
import { GitLabAvatar } from '@/components/GitLabAvatar';
import { Progress } from '@/components/ui/progress';

import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';

interface DeveloperLeaderboardProps {
  developers: Developer[];
  onSelectDeveloper?: (developer: Developer) => void;
  itemsPerPage?: number;
}

export function DeveloperLeaderboard({ developers, onSelectDeveloper }: DeveloperLeaderboardProps) {
  // Sorting is now handled by parent or assumed passed in correct order if needed, 
  // but for a paginated list of users, we typically just show them.
  // However, the card name is "Leaderboard", which implies sorting.
  // If we are paginating USERS (by name/id), we can't truly "Sort" by productivity across pages here.
  // We will simply render the list provided.

  const displayDevelopers = developers;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankBadge = (index: number) => {
    // Rank is just index in this list + implicit offset if we knew it, 
    // but for now local index is fine for UI visualization
    if (index === 0) return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black';
    if (index === 1) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
    if (index === 2) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Developers</h3>
        <span className="text-xs text-muted-foreground">{displayDevelopers.length} contributors</span>
      </div>

      <div className="space-y-4">
        {displayDevelopers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No developer data available</p>
          </div>
        ) : (
          displayDevelopers.map((dev, index) => {
            if (!dev) return null;
            return (
              <motion.div
                key={dev.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                onClick={() => onSelectDeveloper?.(dev)}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/30 transition-all cursor-pointer border border-white/5 hover:border-primary/10"
              >
                {/* Removed Rank Badge if we are just listing users, or keep as simple index */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <GitLabAvatar
                      src={dev.avatar}
                      alt={dev.name || 'Developer'}
                      className="h-10 w-10 border-2 border-border rounded-full"
                      size={40}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{dev.name || 'Unknown'}</span>
                        {getTrendIcon(dev.trend)}
                      </div>
                      <p className="text-xs text-muted-foreground">{dev.username || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitCommit className="h-3 w-3" />
                      {dev.commits ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      {dev.mergeRequests ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {dev.codeReviews ?? 0}
                    </span>
                  </div>
                </div>

                <div className="w-24 hidden sm:block text-right">
                  <div className="text-xs mb-1 text-muted-foreground">Productivity</div>
                  <div className="font-mono font-medium">{dev.productivityScore ?? 0}%</div>
                  <Progress
                    value={dev.productivityScore ?? 0}
                    className="h-1.5 mt-1"
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
