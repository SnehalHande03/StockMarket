import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getBTCData } from "../services/api";

export default function BTCGraph() {
  const [series, setSeries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getBTCData()
      .then((res) => {
        setSeries(res.data.series);
      })
      .catch(() => {
        setError("BTC endpoint not reachable");
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">BTC Price Chart</h1>

      {error && <p>{error}</p>}

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={series}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="close" stroke="#60a5fa" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}