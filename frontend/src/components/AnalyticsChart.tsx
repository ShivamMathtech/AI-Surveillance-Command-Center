import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Sample } from "../types/domain";
export function AnalyticsChart({
  data,
  field = "tracks",
}: {
  data: Sample[];
  field?: string;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient
              id={"gradient-" + field}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#22c8db" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c8db" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#18313d" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(v) => new Date(v).toLocaleTimeString("en-GB")}
            minTickGap={60}
            tick={{ fill: "#668797", fontSize: 9 }}
          />
          <YAxis width={28} tick={{ fill: "#668797", fontSize: 9 }} />
          <Tooltip
            contentStyle={{
              background: "#0d202d",
              border: "1px solid #26414f",
              color: "#c7dfed",
            }}
            labelFormatter={(v) => new Date(v).toLocaleTimeString()}
          />
          <Area
            type="monotone"
            dataKey={field}
            stroke="#24c5d9"
            strokeWidth={2}
            fill={"url(#gradient-" + field + ")"}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
