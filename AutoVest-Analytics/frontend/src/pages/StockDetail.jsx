import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Graph from "../components/Graph";
import StatsCard from "../components/StatsCard";

export default function StockDetail() {
  const { id } = useParams();
  const [stock, setStock] = useState(null);
  const [graph, setGraph] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    api.get(`/stocks/${id}/`)
      .then(res => setStock(res.data))
      .catch(() => setErr("Failed to load stock"));
    api.get(`/stocks/${id}/graph/`)
      .then(res => setGraph(res.data))
      .catch(() => setErr("Failed to load graph"));
  }, [id]);

  const insight = () => {
    if (!graph) return "";
    const level = graph.discount_level;
    if (level === "STRONG") return "Strong Opportunity: Price significantly below fair value.";
    if (level === "MODERATE") return "Moderate Opportunity: Consider accumulating.";
    return "Low Opportunity: Closer to fair value; monitor for better entry.";
  };

  return (
    <div className="p-8">
      {err && <div className="text-overvalued mb-3">{err}</div>}
      {graph && (
        <>
          <div className="card-glass p-6 mb-6">
            <div className="text-2xl font-semibold">{graph.company_name} ({graph.symbol})</div>
            <div className="text-neutral">EPS: {graph.eps ?? "N/A"} • PE: {graph.pe_ratio ?? "N/A"} • Fair Value: {graph.fair_value ?? "N/A"} • Discount: {graph.discount_percent ?? 0}% ({graph.discount_level})</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatsCard title="Price" value={graph.price || 0} accent="neutral" />
            <StatsCard title="Fair Value" value={graph.fair_value || 0} accent="opportunity" />
            <StatsCard title="Discount %" value={graph.discount_percent || 0} suffix="%" accent="opportunity" />
            <StatsCard title="PE Ratio" value={graph.pe_ratio || 0} accent="neutral" />
          </div>

          <Graph series={graph.series || []} fairValue={graph.fair_value} />

          <div className="card-glass p-4 mt-6">
            <div className="font-semibold">Insight</div>
            <div className="text-neutral">{insight()}</div>
          </div>
        </>
      )}
    </div>
  );
}