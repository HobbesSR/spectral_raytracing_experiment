import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LineConfig {
  key: string;
  color: string;
  name: string;
}

interface SpectralChartProps {
  data: any[];
  lines: LineConfig[];
  yAxisLabel?: string;
}

export function SpectralChart({
  data,
  lines,
  yAxisLabel = "Intensity",
}: SpectralChartProps) {
  return (
    <div className="h-72 w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis
            dataKey="wavelength"
            stroke="#888"
            tick={{ fill: "#888", fontSize: 12 }}
            domain={[380, 780]}
            type="number"
            ticks={[400, 500, 600, 700]}
            label={{
              value: "Wavelength (nm)",
              position: "bottom",
              fill: "#888",
              fontSize: 12,
              offset: 0,
            }}
          />
          <YAxis
            stroke="#888"
            tick={{ fill: "#888", fontSize: 12 }}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: "insideLeft",
              fill: "#888",
              fontSize: 12,
              offset: -10,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            itemStyle={{ color: "#fff" }}
            labelFormatter={(val) => `${val} nm`}
          />
          {lines.map((line, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
