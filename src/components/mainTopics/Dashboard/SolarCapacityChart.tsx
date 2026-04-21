import React, { useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { BAR_CAPACITY_COLORS, BAR_COUNT_COLORS } from "./constants";
import { useInView } from "./hooks/useInView";

interface SolarCapacityChartProps {
  data: { netType: string; capacity: number; count: number }[];
  formatCompact: (n: number) => string;
  formatKW: (n: number) => string;
  formatInteger: (n: number) => string;
}

const SolarCapacityChart: React.FC<SolarCapacityChartProps> = ({
  data,
  formatCompact,
  formatKW,
  formatInteger,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { inView } = useInView(ref as React.RefObject<Element>, { threshold: 0.2 });

  return (
    <div ref={ref} className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="netType" tick={{ fontSize: 11 }} interval={0} tickMargin={8} />
          <YAxis
            yAxisId="kw"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatCompact(Number(value))}
            width={44}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatCompact(Number(value))}
            width={44}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              const n = Number(value) || 0;
              if (name === "Capacity (kW)") return [formatKW(n), name];
              if (name === "Accounts") return [formatInteger(n), name];
              return [String(value), String(name)];
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend />

          <Bar
            yAxisId="kw"
            dataKey="capacity"
            name="Capacity (kW)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={inView}
            animationDuration={900}
            animationEasing="ease-out"
            animationBegin={0}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={BAR_CAPACITY_COLORS[index % BAR_CAPACITY_COLORS.length]} />
            ))}
            <LabelList
              dataKey="capacity"
              position="top"
              formatter={(value: number) => formatCompact(Number(value) || 0)}
              style={{ fontSize: 10, fill: "#6b7280" }}
            />
          </Bar>

          <Bar
            yAxisId="count"
            dataKey="count"
            name="Accounts"
            radius={[6, 6, 0, 0]}
            isAnimationActive={inView}
            animationDuration={900}
            animationEasing="ease-out"
            animationBegin={250}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={BAR_COUNT_COLORS[index % BAR_COUNT_COLORS.length]} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              formatter={(value: number) => formatCompact(Number(value) || 0)}
              style={{ fontSize: 10, fill: "#6b7280" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SolarCapacityChart;
