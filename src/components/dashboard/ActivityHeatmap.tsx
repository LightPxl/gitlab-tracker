import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, addWeeks } from 'date-fns';

interface ActivityHeatmapProps {
  data: {
    grid: {
      count: number;
      contributors: Record<string, number>;
      topContributor: string;
    }[][];
    years: string[];
    startDate?: Date;
  } | number[][]; // Fallback for old types if any
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generate a consistent color from a string (email)
const getAuthorColor = (str: string) => {
  if (!str) return 'hsl(var(--primary))';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Handle new data structure vs potentially old props
  const grid = 'grid' in data ? data.grid : [];
  const startDate = 'startDate' in data ? data.startDate : new Date();

  if (!grid || grid.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 h-64 flex items-center justify-center text-muted-foreground">
        No activity data available
      </div>
    );
  }

  // Calculate opacity based on count (max 10+ commits = full opacity)
  const getOpacity = (count: number) => {
    if (count === 0) return 0.1;
    // Logarithmic scale for better visual spread
    return Math.min(0.3 + (Math.log(count + 1) * 0.4), 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card rounded-xl p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Activity Heatmap</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            All-time contribution frequency by developer
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="min-w-max">
          {/* Timeline Header (Months/Years) could go here but simpler to just show data first */}

          <div className="flex gap-[3px]">
            {/* Y-Axis Labels */}
            <div className="flex flex-col justify-between pr-2 py-1 h-[100px]">
              {DAYS.map((day, i) => (
                i % 2 === 1 ? <span key={day} className="text-[10px] text-muted-foreground h-[10px] leading-[10px]">{day}</span> : null
              ))}
            </div>

            {/* The Grid */}
            {grid.map((week, weekIndex) => {
              const weekDate = startDate ? addWeeks(startDate, weekIndex) : new Date();
              const showMonth = weekDate.getDate() <= 7; // Approx start of month

              return (
                <div key={weekIndex} className="flex flex-col gap-[3px] relative">
                  {/* Optional Month Label above specific weeks */}
                  {showMonth && (
                    <span className="absolute -top-5 text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(weekDate, 'MMM yyyy')}
                    </span>
                  )}

                  {week.map((cell, dayIndex) => (
                    <motion.div
                      key={`${weekIndex}-${dayIndex}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.001 * weekIndex }}
                      className="w-3 h-3 rounded-[2px] transition-all hover:ring-2 hover:ring-white/50 cursor-pointer"
                      style={{
                        backgroundColor: cell.count > 0 ? getAuthorColor(cell.topContributor) : 'hsl(var(--secondary))',
                        opacity: cell.count > 0 ? getOpacity(cell.count) : 0.3
                      }}
                      title={`${format(new Date(weekDate.getTime() + dayIndex * 86400000), 'MMM d, yyyy')}: ${cell.count} contributions${cell.topContributor ? ` by ${cell.topContributor}` : ''}`}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Legend:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] bg-secondary opacity-30"></span> No Activity
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: getAuthorColor('a'), opacity: 1 }}></span> Developer Color (Intensity = Count)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
