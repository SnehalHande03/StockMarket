import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import api from "../services/api";

const STORAGE_KEY = "manualStocks";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getSeriesPrices = (series = []) =>
  series
    .map((point) => toNumber(point?.price))
    .filter((value) => value !== null);

const formatPrice = (value) => `${(value ?? 0).toFixed(2)}`;
const formatValue = (value) => (value ?? 0).toFixed(2);
const OPPORTUNITY_CHART_HEIGHT = 240;
const REGRESSION_CHART_HEIGHT = 260;

// Regression helpers (windowed to focus around current price)
const WINDOW_POINTS = 60; // use last N points; falls back to all if shorter
const linReg = (xs, ys) => {
  const n = xs.length;
  if (n === 0) return { a: 0, b: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) { const x = xs[i], y = ys[i]; sumX += x; sumY += y; sumXY += x*y; sumXX += x*x; }
  const denom = n * sumXX - sumX * sumX || 1;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
};
const clamp01 = (v) => Math.min(0.999, Math.max(0.001, v));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const logit = (p) => Math.log(p / (1 - p));
const logisticFit = (xs, ys) => {
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const ysNorm = ys.map((y) => clamp01((y - minY) / range));
  const zs = ysNorm.map((p) => logit(p));
  const { a, b } = linReg(xs, zs);
  return { a, b, minY, maxY };
};
const buildRegressionSeries = (series) => {
  const all = getSeriesPrices(series);
  const prices = all.slice(-WINDOW_POINTS);
  const xs = Array.from({ length: prices.length }, (_, i) => i);
  const { a, b } = linReg(xs, prices);
  const L = logisticFit(xs, prices);
  return xs.map((x, i) => {
    const lin = a + b * x;
    const sig = sigmoid(L.a + L.b * x);
    const logistic = L.minY + sig * (L.maxY - L.minY);
    return { t: i + 1, price: prices[i], linear: lin, logistic };
  });
};

const predictNext = (series) => {
  const p = getSeriesPrices(series);
  if (p.length === 0) return { lin: 0, log: 0, ts: 0, rnn: 0 };
  if (p.length === 1) { const v = p[0]; return { lin: v, log: v, ts: v, rnn: v }; }
  const xs = Array.from({ length: p.length }, (_, i) => i);
  const { a, b } = linReg(xs, p);
  const lin = a + b * p.length;
  const L = logisticFit(xs, p);
  const sig = sigmoid(L.a + L.b * p.length);
  const log = L.minY + sig * (L.maxY - L.minY);
  const alpha = 0.3;
  let s = p[0];
  for (let i = 1; i < p.length; i++) s = alpha * p[i] + (1 - alpha) * s;
  const ts = s;
  const last = p[p.length - 1];
  const prev = p[p.length - 2];
  const momentum = last + (last - prev);
  const rnn = 0.5 * ts + 0.5 * momentum;
  return { lin, log, ts, rnn };
};

export default function Analysis() {
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
  const summaryRows = useMemo(
    () =>
      rows.map(({ entry, data }) => {
        const prices = getSeriesPrices(data?.series);
        const todayPrice = prices.length ? prices[prices.length - 1] : (toNumber(data?.price) ?? 0);
        const currentPrice = toNumber(data?.price) ?? todayPrice ?? 0;
        const minPrice = prices.length ? Math.min(...prices) : currentPrice ?? 0;
        const maxPrice = prices.length ? Math.max(...prices) : currentPrice ?? 0;

        const preds = predictNext(data?.series || []);
        return {
          id: entry.id,
          stockName: data?.symbol || entry.ticker,
          companyName: data?.company_name || "N/A",
          currentPrice,
          minPrice,
          maxPrice,
          lin1d: preds.lin,
          log1d: preds.log,
          ts1d: preds.ts,
          rnn1d: preds.rnn,
          peRatio: toNumber(data?.pe_ratio) ?? 0,
          discount: toNumber(data?.discount_percent) ?? 0,
        };
      }),
    [rows]
  );
  const opportunityData = useMemo(
    () => summaryRows.map((row) => ({ name: row.stockName, peRatio: row.peRatio })),
    [summaryRows]
  );
  const regressionRows = useMemo(
    () => rows.filter((r) => (r.data?.series?.length || 0) >= 3),
    [rows]
  );

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Stock Analysis</h1>

      {err && <div className="text-overvalued mb-4">{err}</div>}
      {loading && <div className="glass-card p-5 text-slate-300 mb-4">Analyzing stocks...</div>}

      {rows.length === 0 && (
        <div className="glass-card p-6 text-slate-300">No manual stocks found. Add stocks in the Manual Entry page.</div>
      )}

      {summaryRows.length > 0 && (
        <div className="glass-card mb-6 overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-300">
                <th className="px-4 py-3">Stock Name</th>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Current Price</th>
                <th className="px-4 py-3">Min Price</th>
                <th className="px-4 py-3">Max Price</th>
                <th className="px-4 py-3">Linear +1D</th>
                <th className="px-4 py-3">Logistic +1D</th>
                <th className="px-4 py-3">TS +1D</th>
                <th className="px-4 py-3">RNN +1D</th>
                <th className="px-4 py-3">PE Ratio</th>
                <th className="px-4 py-3">Discount %</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-4 py-3 font-semibold text-white">{row.stockName}</td>
                  <td className="px-4 py-3 text-slate-200">{row.companyName}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.currentPrice)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.minPrice)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.maxPrice)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.lin1d)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.log1d)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.ts1d)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatPrice(row.rnn1d)}</td>
                  <td className="px-4 py-3 text-slate-200">{formatValue(row.peRatio)}</td>
                  <td className="px-4 py-3 text-opportunity">{formatValue(row.discount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {opportunityData.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <div className="text-lg font-semibold mb-3">Opportunity Graph (PE Ratio)</div>
          <div style={{ height: OPPORTUNITY_CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={opportunityData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" name="Stock" interval={0} angle={-18} textAnchor="end" height={56} />
                <YAxis name="PE Ratio" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value) => [formatValue(value), "PE Ratio"]} labelFormatter={(_, p) => p?.[0]?.payload?.name || ""} />
                <Line type="monotone" dataKey="peRatio" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {regressionRows.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {regressionRows.map(({ entry, data }) => {
            const regData = buildRegressionSeries(data.series || []);
            const current = regData[regData.length - 1]?.price ?? 0;
            const predLin = regData[regData.length - 1]?.linear ?? 0;
            const predLog = regData[regData.length - 1]?.logistic ?? 0;
            const title = `${data?.symbol || entry.ticker} - Regression (last ${Math.min(regData.length, WINDOW_POINTS)} pts)`;
            return (
              <div key={entry.id} className="glass-card p-4 h-full">
                <div className="text-lg font-semibold mb-2">{title}</div>
                <div style={{ height: REGRESSION_CHART_HEIGHT }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="t" name="Index" />
                      <YAxis name="Price" />
                      <Tooltip formatter={(v, k) => [formatPrice(v), k]} />
                      <Line type="monotone" dataKey="price" name="Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="linear" name="Linear Reg" stroke="#60a5fa" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="logistic" name="Logistic Reg" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-slate-300 text-sm mt-2">
                  Current: {formatPrice(current)} | Linear now: {formatPrice(predLin)} | Logistic now: {formatPrice(predLog)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
