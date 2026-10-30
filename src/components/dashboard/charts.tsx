"use client";

import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface StatusSlice {
  name: string;
  value: number;
  color: string;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--popover-foreground)" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">tasks</span>
      </div>
    </div>
  );
}

export interface ProjectBarDatum {
  name: string;
  todo: number;
  inProgress: number;
  done: number;
}

export function ProjectsBar({ data }: { data: ProjectBarDatum[] }) {
  const height = Math.max(180, data.length * 40 + 50);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }} barCategoryGap={10} maxBarSize={28}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => (v.length > 15 ? `${v.slice(0, 14)}…` : v)}
          />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} contentStyle={tooltipStyle} itemStyle={{ color: "var(--popover-foreground)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="done" name="Done" stackId="a" fill="var(--status-done)" />
          <Bar dataKey="inProgress" name="In progress" stackId="a" fill="var(--status-progress)" />
          <Bar dataKey="todo" name="To do" stackId="a" fill="var(--status-todo)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
