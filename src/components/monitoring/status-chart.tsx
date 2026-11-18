"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface StatusDatum { label: string; count: number; color: string }

export function StatusChart({ data }: { data: StatusDatum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`Meetings by status: ${data.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--color-slate-100)" }} contentStyle={{ background: "var(--color-white)", border: "1px solid var(--color-slate-200)", borderRadius: 12, color: "var(--color-slate-900)" }} />
          <Bar dataKey="count" name="Meetings" radius={[4, 4, 0, 0]}>
            {data.map((d) => <Cell key={d.label} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
