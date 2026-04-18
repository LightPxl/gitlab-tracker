import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Activity } from 'lucide-react';

interface IssueData {
  name: string;
  value: number;
  color: string;
}

interface IssueDistributionChartProps {
  data: IssueData[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-2))',
];

export function IssueDistributionChart({ data }: IssueDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Issue Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">By category</p>
        </div>
        <span className="text-sm font-mono font-medium">{total} Total</span>
      </div>

      <div className="h-64 flex items-center justify-center">
        {total === 0 ? (
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mx-auto">
              <Activity className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground">No issues found for this view</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.filter(d => d.value > 0).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-muted-foreground">{item.name}</span>
            <span className="text-xs font-mono font-medium ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
