import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePrediction } from "@/hooks/usePrediction";

export const DemandChart = () => {
  const { data } = usePrediction();
  const series = data?.demandSeries ?? [];
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
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
          <Area type="monotone" dataKey="predicted" name="Predicted Orders" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#predGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
