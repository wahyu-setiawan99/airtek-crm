"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatRupiah } from "@/lib/format";

export type BarSeries = { key: string; color: string };

/**
 * The only place that imports recharts. Pages load it with `next/dynamic`, so the chart
 * library is downloaded only where a chart is shown (AGENTS.md §15.6).
 */
export default function SimpleBarChart({
  data,
  xKey,
  bars,
  money = false,
  allXTicks = false,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  bars: BarSeries[];
  money?: boolean;
  allXTicks?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={allXTicks ? 0 : undefined} />
        {money ? (
          <YAxis tickFormatter={(value) => formatCompact(Number(value))} width={78} tick={{ fontSize: 11 }} />
        ) : (
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        )}
        {money ? <Tooltip formatter={(value) => formatRupiah(Number(value ?? 0))} /> : <Tooltip />}
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} fill={bar.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
