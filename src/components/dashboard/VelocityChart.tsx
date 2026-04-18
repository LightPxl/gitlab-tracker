import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VelocityData {
  sprint: string;
  velocity: number;
  capacity: number;
}

interface VelocityChartProps {
  data: VelocityData[];
}

export function VelocityChart({ data }: VelocityChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Team Velocity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Story points per sprint</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 group relative">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground cursor-help">Velocity</span>
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground p-2 rounded shadow-lg border border-border w-48 z-10">
              Points actually completed during the sprint.
            </div>
          </div>
          <div className="flex items-center gap-2 group relative">
            <div className="w-3 h-3 rounded bg-accent/50" />
            <span className="text-muted-foreground cursor-help">Capacity</span>
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground p-2 rounded shadow-lg border border-border w-48 z-10">
              Total points planned/available for the sprint.
            </div>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="sprint"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            />
            <Bar
              dataKey="capacity"
              fill="hsl(var(--accent) / 0.3)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="velocity"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
