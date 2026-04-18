import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { demandSeries } from "@/lib/whiskData";

export const DemandChart = () => {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={demandSeries} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="hour"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              boxShadow: "var(--shadow-md)",
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="baseline"
            name="Baseline Monday"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="url(#baseGrad)"
          />
          <Area
            type="monotone"
            dataKey="predicted"
            name="Predicted Marathon Monday"
            stroke="hsl(var(--accent))"
            strokeWidth={2.5}
            fill="url(#predGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
