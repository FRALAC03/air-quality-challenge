"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line
} from "recharts";
import type { StationTimeSeriesPoint } from "@/lib/domain/air-quality.types";
import { transformToRechartsPayload } from "@/lib/frontend/chart-utils";
import { formatChartXAxis, formatChartTooltipLabel, formatMeasurementValue } from "@/lib/frontend/display-formatters";

interface AirQualityChartProps {
  timeseries: StationTimeSeriesPoint[];
  unit: string;
}

const LINE_COLORS = [
  "#0ea5e9", // Sky 500
  "#8b5cf6", // Violet 500
  "#f59e0b", // Amber 500
  "#10b981", // Emerald 500
  "#f43f5e", // Rose 500
  "#64748b", // Slate 500
  "#06b6d4"  // Cyan 500
];

export default function AirQualityChart({ timeseries, unit }: AirQualityChartProps) {
  
  const payload = useMemo(() => transformToRechartsPayload(timeseries), [timeseries]);

  if (payload.data.length === 0) return null;

  return (
    <div className="w-full h-[300px] sm:h-[340px] md:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={payload.data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          
          <XAxis
  dataKey="recordedAt"
  tickFormatter={formatChartXAxis}
  tick={{
    fontSize: 11,
    fill: "#64748b",
  }}
  tickMargin={12}
  interval="preserveStartEnd"
  minTickGap={32}
  axisLine={{
    stroke: "#cbd5e1",
  }}
  tickLine={{
    stroke: "#cbd5e1",
  }}
/>
          
          <YAxis 
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickMargin={10}
            unit={` ${unit}`}
            width={75}
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip 
            labelFormatter={(label) =>
  formatChartTooltipLabel(
    String(label ?? ""),
  )
}
            formatter={(value, name) => [
  typeof value === "number"
    ? `${formatMeasurementValue(value)} ${unit}`
    : `${String(value)} ${unit}`,
  String(name),
]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
            labelStyle={{ fontWeight: '600', color: '#334155', marginBottom: '8px' }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px', fontSize: '13px', color: '#475569' }}
            iconType="circle"
          />

          {payload.metadata.map((station, index) => (
            <Line
              key={station.key}
              type="linear"
              dataKey={station.key}
              name={station.stationName}
              stroke={LINE_COLORS[index % LINE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false} // Punto vitale
            />
          ))}

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}