import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Graph from "../components/Graph";

const STORAGE_KEY = "manualStocks";

export default function AnalysisGraph() {
  const [entries, setEntries] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setEntries(saved);
  }, []);

  useEffect(() => {
    if (!entries.length) return;
    setLoading(true);
    setErr("");

    Promise.allSettled(
      entries.map((entry) =>
        api
          .get("/analyze/", { params: { symbol: entry.ticker } })
          .then((res) => ({ id: entry.id, data: res.data }))
      )
    )
      .then((results) => {
        const map = {};
        let failed = 0;
        const failedDetails = [];

        results.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            map[r.value.id] = r.value.data;
          } else {
            failed += 1;
            map[entries[idx].id] = { company_name: entries[idx].ticker, series: [] };
            const symbol = entries[idx].ticker;
            const status = r.reason?.response?.status;
            const detail = r.reason?.response?.data?.detail;
            if (status === 401) {
              failedDetails.push(`${symbol}: session expired`);
            } else if (detail) {
              failedDetails.push(`${symbol}: ${detail}`);
            } else if (status) {
              failedDetails.push(`${symbol}: request failed (${status})`);
            } else {
              failedDetails.push(`${symbol}: network/server error`);
            }
          }
        });

        setMetrics(map);
        if (failed > 0) {
          setErr(`Could not fetch live data for ${failed} stock(s). ${failedDetails.join(" | ")}`);
        }
      })
      .finally(() => setLoading(false));
  }, [entries]);

  const rows = useMemo(() => entries.map((entry) => ({ entry, data: metrics[entry.id] })), [entries, metrics]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Opportunity Graph</h1>

      {err && <div className="text-overvalued mb-4">{err}</div>}
      {loading && <div className="glass-card p-5 text-slate-300 mb-4">Analyzing stocks...</div>}

      {rows.length === 0 && (
        <div className="glass-card p-6 text-slate-300">No manual stocks found. Add stocks in the Manual Entry page.</div>
      )}

      <div className="space-y-4">
        {rows.map(({ entry, data }) => (
          <div key={entry.id} className="glass-card">
            <div className="w-full p-5 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <div className="font-semibold text-lg">{data?.company_name || entry.ticker}</div>
                  <div className="text-sm text-slate-400">{data?.symbol || entry.ticker}</div>
                </div>
                <div className="text-brand-accent text-sm md:text-right">Opportunity graph</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                <div>PE Ratio: <span className="font-semibold">{data?.pe_ratio ?? "N/A"}</span></div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="border-t border-white/10 pt-4">
                <Graph
                  peRatio={data?.pe_ratio}
                  symbol={data?.symbol || entry.ticker}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
