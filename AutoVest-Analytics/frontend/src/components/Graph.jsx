import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from "recharts";

export default function Graph({ peRatio, symbol }) {
  const metricData = [
    { name: "PE Ratio", value: typeof peRatio === "number" ? peRatio : 0 },
  ];

  return (
    <div className="card-glass p-4 h-64">
      <div className="text-sm text-slate-300 mb-2">
        PE Ratio Graph {symbol ? `(${symbol})` : ""}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={metricData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {metricData.map((_, idx) => (
              <Cell key={idx} fill="#60a5fa" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
