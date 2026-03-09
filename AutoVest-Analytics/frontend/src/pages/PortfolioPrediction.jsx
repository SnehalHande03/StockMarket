import { useEffect, useMemo, useState, useRef } from "react";
import api from "../services/api";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceDot
} from "recharts";
import "./PortfolioPrediction.css";

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

const linReg = (xs, ys) => {
  const n = xs.length || 1;
  let sx=0, sy=0, sxy=0, sxx=0;
  for (let i=0;i<n;i++){ const x=xs[i], y=ys[i]; sx+=x; sy+=y; sxy+=x*y; sxx+=x*x; }
  const denom = n*sxx - sx*sx || 1;
  const b = (n*sxy - sx*sy)/denom;
  const a = (sy - b*sx)/n;
  return { a, b };
};

const clamp01 = (v) => Math.min(0.999, Math.max(0.001, v));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const logit = (p) => Math.log(p / (1 - p));
const logisticFit = (xs, ys) => {
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const ysNorm = ys.map(y => clamp01((y - minY) / range));
  const zs = ysNorm.map(p => logit(p));
  const { a, b } = linReg(xs, zs);
  return { a, b, minY, maxY };
};

const sesSeries = (arr, alpha = 0.3) => {
  if (!arr.length) return [];
  let s = arr[0];
  const out = [s];
  for (let i = 1; i < arr.length; i++) {
    s = alpha * arr[i] + (1 - alpha) * s;
    out.push(s);
  }
  return out;
};

const rnnLikeSeries = (arr, alpha = 0.5) => {
  if (arr.length < 3) return sesSeries(arr, 0.3);
  const ema = sesSeries(arr, 0.3);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const last = arr[i];
    const prev = i > 0 ? arr[i-1] : last;
    const mom = last + (last - prev);
    out.push(alpha * ema[i] + (1 - alpha) * mom);
  }
  return out;
};

const FRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = "btc_cache_v1";
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)||"{}"); } catch { return {}; } };
const writeCache = (series) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), series })); } catch {} };
const fmt2 = (v) => (v ?? 0).toFixed(2);

export default function PortfolioPrediction() {
  const [mode, setMode] = useState("linear"); // linear | logistic
  const [series, setSeries] = useState([]);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const ctrl = useRef(null);

  const fetchBTC = async () => {
    setLoading(true); setErr("");
    const cached = readCache();
    if (cached.series?.length && (Date.now() - cached.ts) < FRESH_MS) {
      setSeries(cached.series); setNote("Using cached 1Y BTC"); setLoading(false); return;
    }
    if (ctrl.current) ctrl.current.abort();
    const c = new AbortController(); ctrl.current = c;
    try {
      const res = await api.get("/crypto/btc/", { params: { range: "1y", interval: "1d" }, timeout: 7000, signal: c.signal });
      const s = (res?.data?.series || [])
        .map((p, idx) => ({ idx, date: p.date || p.timestamp || idx, price: toNum(p.close ?? p.price) }))
        .filter(p => p.price !== null)
        .sort((a,b) => (a.date > b.date ? 1 : -1));
      setSeries(s);
      writeCache(s);
      setNote("Loaded 1Y BTC");
    } catch {
      setErr("BTC endpoint not reachable. Implement /api/crypto/btc/ (yfinance) or try later.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchBTC(); return () => { if (ctrl.current) ctrl.current.abort(); }; }, []);

  const last7 = useMemo(() => {
    const arr = series.slice(-7);
    const xs = arr.map((_, i) => i);
    const ys = arr.map(p => p.price);
    if (arr.length < 2) return { predLin: 0, predLog: 0, line7: [], log7: [] };
    const { a, b } = linReg(xs, ys);
    const L = logisticFit(xs, ys);
    const line7 = arr.map((_, i) => a + b*i);
    const log7 = arr.map((_, i) => {
      const z = L.a + L.b*i; const s = sigmoid(z); return L.minY + s*(L.maxY - L.minY);
    });
    const predLin = a + b * arr.length;
    const z = L.a + L.b * arr.length; const s = sigmoid(z);
    const predLog = L.minY + s*(L.maxY - L.minY);
    return { predLin, predLog, line7, log7 };
  }, [series]);

  const current = series.length ? series[series.length - 1] : null;
  const nextX = current ? current.idx + 1 : 0;

  const chartData = useMemo(() => {
    if (!series.length) return [];
    const last90 = series.slice(-90).map(p => ({ ...p }));
    if (last7.line7?.length) {
      last90.slice(-7).forEach((p,i) => { p.linear = last7.line7[i]; p.logistic = last7.log7[i]; });
    }
    last90.push({ idx: nextX, date: "Next", price: null, linear: last7.predLin, logistic: last7.predLog });
    return last90;
  }, [series, last7, nextX]);

  const tsRnnData = useMemo(() => {
    if (!series.length) return { ts: [], rnn: [], tsPred: 0, rnnPred: 0 };
    const last90 = series.slice(-90);
    const prices = last90.map(p => p.price);
    const tsFit = sesSeries(prices, 0.3);
    const rnnFit = rnnLikeSeries(prices, 0.5);
    const tsPred = tsFit.length ? tsFit[tsFit.length-1] : 0;
    const rnnPred = rnnFit.length ? rnnFit[rnnFit.length-1] : 0;
    const tsChart = last90.map((p,i) => ({ ...p, ts: tsFit[i] }));
    const rnnChart = last90.map((p,i) => ({ ...p, rnn: rnnFit[i] }));
    tsChart.push({ idx: nextX, date: "Next", ts: tsPred, price: null });
    rnnChart.push({ idx: nextX, date: "Next", rnn: rnnPred, price: null });
    return { ts: tsChart, rnn: rnnChart, tsPred, rnnPred };
  }, [series, nextX]);

  return (
    <main className="pp container">
      <header className="pp-header">
        <h1>Portfolio Prediction (BTC)</h1>
        <div className="pp-controls">
          <button className={`pp-btn ${mode==="linear"?"active":""}`} onClick={()=>setMode("linear")}>Linear (7D)</button>
          <button className={`pp-btn ${mode==="logistic"?"active":""}`} onClick={()=>setMode("logistic")}>Logistic (7D)</button>
          <button className="pp-btn" onClick={fetchBTC} disabled={loading}>Refresh</button>
        </div>
      </header>

      {note && <div className="pp-note">{note}</div>}
      {err && <div className="pp-error">{err}</div>}

      <section className="pp-card">
        <div className="pp-card-title">BTC Price with {mode==="linear"?"Linear":"Logistic"} Fit (last 90d, 7d window)</div>
        <div style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip formatter={(v,k)=>[typeof v==="number"?v.toFixed(2):v,k]} />
              <Line type="monotone" dataKey="price" name="Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              {mode==="linear" ? (
                <Line type="monotone" dataKey="linear" name="Linear fit" stroke="#60a5fa" strokeWidth={2} dot={false} />
              ) : (
                <Line type="monotone" dataKey="logistic" name="Logistic fit" stroke="#f59e0b" strokeWidth={2} dot={false} />
              )}
              {current && (
                <ReferenceDot x={chartData[chartData.length-1]?.idx} y={mode==="linear"? last7.predLin : last7.predLog} r={5} fill={mode==="linear"?"#60a5fa":"#f59e0b"} stroke="none" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="pp-stats">
          <div className="pp-chip">Current: {current ? fmt2(current.price) : "—"}</div>
          <div className="pp-chip">Linear +1D: {fmt2(last7.predLin)}</div>
          <div className="pp-chip">Logistic +1D: {fmt2(last7.predLog)}</div>
        </div>
      </section>

      <section className="pp-card">
        <div className="pp-card-title">BTC Price with Time Series (SES) Fit</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tsRnnData.ts} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip formatter={(v,k)=>[typeof v==="number"?v.toFixed(2):v,k]} />
              <Line type="monotone" dataKey="price" name="Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ts" name="SES fit" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="pp-stats">
          <div className="pp-chip">TS +1D: {fmt2(tsRnnData.tsPred)}</div>
        </div>
      </section>

      <section className="pp-card">
        <div className="pp-card-title">BTC Price with RNN-like Fit</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tsRnnData.rnn} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip formatter={(v,k)=>[typeof v==="number"?v.toFixed(2):v,k]} />
              <Line type="monotone" dataKey="price" name="Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rnn" name="RNN-like fit" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="pp-stats">
          <div className="pp-chip">RNN +1D: {fmt2(tsRnnData.rnnPred)}</div>
        </div>
      </section>
    </main>
  );
}