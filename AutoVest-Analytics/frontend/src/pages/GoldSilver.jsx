import { useEffect, useMemo, useState, useRef } from "react";
import api from "../services/api";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis
} from "recharts";
import "./GoldSilver.css";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const movingAverage = (arr, k = 3) => {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    const s = Math.max(0, i - k + 1);
    const slice = arr.slice(s, i + 1);
    res.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return res;
};

const linReg = (xs, ys) => {
  const n = xs.length || 1;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { const x = xs[i], y = ys[i]; sx+=x; sy+=y; sxy+=x*y; sxx+=x*x; }
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

const WINDOW = 180;
const GS_CACHE_KEY = "gs_cache_v1";
const cacheKey = (a, r, i) => `${a}|${r}|${i}`;
const readCache = (a, r, i) => {
  try { const all = JSON.parse(localStorage.getItem(GS_CACHE_KEY) || "{}"); return all[cacheKey(a,r,i)] || null; } catch { return null; }
};
const writeCache = (a, r, i, series) => {
  try { const all = JSON.parse(localStorage.getItem(GS_CACHE_KEY) || "{}"); all[cacheKey(a,r,i)] = { ts: Date.now(), series }; localStorage.setItem(GS_CACHE_KEY, JSON.stringify(all)); } catch {}
};
const age = (ts) => { const s = Math.floor((Date.now()-ts)/1000); if (s<60) return `${s}s ago`; const m=Math.floor(s/60); if (m<60) return `${m}m ago`; const h=Math.floor(m/60); return `${h}h ago`; };
const FRESH_MS = 300000; // 5 minutes

// Manual 1W fallback data (deterministic sample around a baseline)
const manualWeekData = (asset) => {
  const base = asset === "silver" ? 28 : 2350;
  const deltas = asset === "silver" ? [0.1, -0.05, 0.2, -0.1, 0.15, -0.08, 0.05] : [5, -8, 12, -6, 9, -4, 7];
  const today = new Date();
  const days = [];
  let d = new Date(today);
  while (days.length < 7) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // weekdays only
      days.push(new Date(d));
    }
    d.setDate(d.getDate() - 1);
  }
  days.reverse();
  return days.map((dt, idx) => ({
    date: dt.toISOString().slice(0,10),
    price: Number((base + deltas[idx]).toFixed(2))
  })).map((p, i) => ({ t: i, date: p.date, price: p.price }));
};

export default function GoldSilver() {
  const [asset, setAsset] = useState("gold"); // gold | silver
  const [range, setRange] = useState("6mo");
  const [interval, setInterval] = useState("1d");
  const [series, setSeries] = useState([]);
  const [cleaned, setCleaned] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [k, setK] = useState(3);
  const [note, setNote] = useState("");
  const [goldSer, setGoldSer] = useState([]);
  const [silverSer, setSilverSer] = useState([]);
  const [quick, setQuick] = useState(true);
  const [liveCurrent, setLiveCurrent] = useState(null);
  const reqCtrl = useRef(null);

  useEffect(() => {
    return () => { if (reqCtrl.current) reqCtrl.current.abort(); };
  }, []);

  const fetchData = async ({ force } = {}) => {
    setLoading(true); setErr("");
    const cached = !force ? readCache(asset, range, interval) : null;
    if (cached?.series?.length && (Date.now() - cached.ts) < FRESH_MS) {
      setSeries(cached.series);
      setCleaned(cached.series);
      setLiveCurrent(cached.series[cached.series.length - 1]?.price ?? null);
      if (asset === "gold") setGoldSer(cached.series);
      if (asset === "silver") setSilverSer(cached.series);
      setNote(`Using cached data (${age(cached.ts)})`);
      setLoading(false);
      return;
    }
    if (reqCtrl.current) reqCtrl.current.abort();
    const ctrl = new AbortController(); reqCtrl.current = ctrl;
    try {
      const res = await api.get("/commodities/gold-silver/", { params: { asset, range, interval }, timeout: 6000, signal: ctrl.signal });
      let mapped = (res?.data?.series || [])
        .map((p, idx) => ({ t: idx, date: p.date || p.timestamp || idx, price: toNum(p.price) }))
        .filter(p => p.price !== null)
        .sort((a,b) => (a.date > b.date ? 1 : -1));
      const currentFromApi = toNum(res?.data?.current_price);
      const limit = quick ? 120 : 800;
      if (mapped.length > limit) mapped = mapped.slice(-limit);
      setSeries(mapped);
      setCleaned(mapped);
      setLiveCurrent(currentFromApi ?? mapped[mapped.length - 1]?.price ?? null);
      if (asset === "gold") setGoldSer(mapped);
      if (asset === "silver") setSilverSer(mapped);
      writeCache(asset, range, interval, mapped);
      setNote("Live data loaded");
    } catch (e) {
      if (!cached) setErr("Unable to fetch live data. Check backend or try Quick mode/shorter range.");
      else setNote(prev => prev || "Using cached data");
    } finally {
      setLoading(false);
    }
  };

  const fetchBoth = async () => {
    setLoading(true); setErr("");
    if (reqCtrl.current) reqCtrl.current.abort();
    const ctrl = new AbortController(); reqCtrl.current = ctrl;
    try {
      const [g, s] = await Promise.all([
        api.get("/commodities/gold-silver/", { params: { asset: "gold", range, interval }, timeout: 6000, signal: ctrl.signal }),
        api.get("/commodities/gold-silver/", { params: { asset: "silver", range, interval }, timeout: 6000, signal: ctrl.signal }),
      ]);
      const mapSort = (raw) => (raw || [])
        .map((p, idx) => ({ t: idx, date: p.date || p.timestamp || idx, price: toNum(p.price) }))
        .filter(p => p.price !== null)
        .sort((a,b) => (a.date > b.date ? 1 : -1));
      const limit = quick ? 120 : 800;
      const gSer = mapSort(g?.data?.series).slice(-limit);
      const sSer = mapSort(s?.data?.series).slice(-limit);
      setGoldSer(gSer);
      setSilverSer(sSer);
      if (asset === "gold") setLiveCurrent(toNum(g?.data?.current_price) ?? gSer[gSer.length - 1]?.price ?? null);
      if (asset === "silver") setLiveCurrent(toNum(s?.data?.current_price) ?? sSer[sSer.length - 1]?.price ?? null);
      setNote("Loaded both assets");
    } catch (e) {
      setErr("Failed to fetch both assets. Try Quick mode or manual week.");
    } finally {
      setLoading(false);
    }
  };

  const runCleaning = () => {
    if (!series.length) return;
    const dedup = new Map();
    series.forEach(p => { if (!dedup.has(p.date)) dedup.set(p.date, p); });
    const arr = Array.from(dedup.values()).sort((a,b) => (a.date > b.date ? 1 : -1));
    const prices = arr.map(p => p.price);
    const smoothed = movingAverage(prices, 5);
    const cleanedArr = arr.map((p, i) => ({ ...p, price: smoothed[i] ?? p.price }));
    setCleaned(cleanedArr);
  };

  const regressionData = useMemo(() => {
    const src = cleaned.length ? cleaned : series;
    const pts = src.slice(-WINDOW);
    const xs = pts.map((_, i) => i);
    const ys = pts.map(p => p.price);
    if (pts.length < 3) return [];
    const { a, b } = linReg(xs, ys);
    const L = logisticFit(xs, ys);
    return pts.map((p, i) => {
      const lin = a + b * i;
      const z = L.a + L.b * i;
      const sig = sigmoid(z);
      const logi = L.minY + sig * (L.maxY - L.minY);
      return { ...p, idx: i, linear: lin, logistic: logi };
    });
  }, [cleaned, series]);

  // Simple 2D k-means on [idx, normalized price]
  const clusters = useMemo(() => {
    const data = regressionData;
    if (data.length < k || k < 1) return [];
    const xs = data.map(d => d.idx);
    const ps = data.map(d => d.price);
    const nx = (x) => (x - Math.min(...xs)) / ((Math.max(...xs) - Math.min(...xs)) || 1);
    const np = (p) => (p - Math.min(...ps)) / ((Math.max(...ps) - Math.min(...ps)) || 1);
    let pts = data.map(d => ({ ...d, fx: nx(d.idx), fp: np(d.price), c: 0 }));
    let cents = Array.from({ length: k }, (_, i) => ({ x: i / (k - 1 || 1), y: i / (k - 1 || 1) }));
    for (let iter = 0; iter < 15; iter++) {
      // assign
      pts = pts.map(p => {
        let best = 0, bestd = Infinity;
        cents.forEach((c, ci) => {
          const d = (p.fx - c.x) ** 2 + (p.fp - c.y) ** 2;
          if (d < bestd) { bestd = d; best = ci; }
        });
        return { ...p, c: best };
      });
      // update
      cents = cents.map((c, ci) => {
        const group = pts.filter(p => p.c === ci);
        if (!group.length) return c;
        const mx = group.reduce((s,p) => s + p.fx, 0) / group.length;
        const my = group.reduce((s,p) => s + p.fp, 0) / group.length;
        return { x: mx, y: my };
      });
    }
    return pts;
  }, [regressionData, k]);

  const current = regressionData[regressionData.length - 1];

  const alignedPairs = useMemo(() => {
    if (!goldSer.length || !silverSer.length) return [];
    const g = new Map(goldSer.map(p => [String(p.date), p.price]));
    const s = new Map(silverSer.map(p => [String(p.date), p.price]));
    const dates = [...g.keys()].filter(d => s.has(d)).sort();
    return dates.map(d => ({ date: d, gold: g.get(d), silver: s.get(d) })).slice(-WINDOW);
  }, [goldSer, silverSer]);

  const corr = useMemo(() => {
    const n = alignedPairs.length;
    if (!n) return 0;
    let sx=0, sy=0, sxx=0, syy=0, sxy=0;
    for (const p of alignedPairs) { const x=p.gold, y=p.silver; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; }
    const num = n*sxy - sx*sy;
    const den = Math.sqrt((n*sxx - sx*sx) * (n*syy - sy*sy)) || 1;
    return num/den;
  }, [alignedPairs]);

  return (
    <main className="gs container">
      <header className="gs-header">
        <h1>Gold / Silver</h1>
        <div className="gs-controls">
          <select value={asset} onChange={(e)=>setAsset(e.target.value)}>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
          </select>
          <select value={range} onChange={(e)=>setRange(e.target.value)}>
            <option value="1mo">1M</option>
            <option value="3mo">3M</option>
            <option value="6mo">6M</option>
            <option value="1y">1Y</option>
            <option value="5y">5Y</option>
          </select>
          <select value={interval} onChange={(e)=>setInterval(e.target.value)}>
            <option value="1d">1D</option>
            <option value="1wk">1W</option>
          </select>
          <label className="gs-inline" title="Trim to fewer points for faster charts"><input type="checkbox" checked={quick} onChange={(e)=>setQuick(e.target.checked)} /> Quick mode</label>
          <button className="btn-primary" onClick={() => fetchData({ force: true })} disabled={loading}>Fetch</button>
          <button className="btn-ghost" onClick={runCleaning} disabled={!series.length}>Clean & Smooth</button>
          <button className="btn-ghost" onClick={fetchBoth} disabled={loading}>Fetch Both</button>
          <button className="btn-ghost" onClick={() => { const m = manualWeekData(asset); setSeries(m); setCleaned(m); setLiveCurrent(m[m.length - 1]?.price ?? null); if (asset === "gold") setGoldSer(m); if (asset === "silver") setSilverSer(m); setErr(""); }} disabled={loading}>Manual 1W</button>
        </div>
      </header>

      {note && <div className="gs-note">{note}</div>}
      {err && <div className="gs-error">{err}</div>}

      <section className="gs-card">
        <div className="gs-card-title">Price with Linear & Logistic Regression</div>
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={regressionData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v, k) => [typeof v === "number" ? v.toFixed(2) : v, k]} />
              <Line type="monotone" dataKey="price" name="Price" stroke="#e2e8f0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="linear" name="Linear" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="logistic" name="Logistic" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {current && (
          <div className="gs-note">Current: {(liveCurrent ?? current.price)?.toFixed(2)} • Linear now: {current.linear?.toFixed(2)} • Logistic now: {current.logistic?.toFixed(2)}</div>
        )}
      </section>

      <section className="gs-card">
        <div className="gs-card-title">Clustering (k = {k})</div>
        <div className="gs-inline">
          <label>Clusters</label>
          <input type="number" min={2} max={6} value={k} onChange={(e)=>setK(Math.max(2, Math.min(6, Number(e.target.value)||3)))} />
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="idx" name="Index" />
              <YAxis dataKey="price" name="Price" />
              <ZAxis range={[60, 60]} />
              <Tooltip formatter={(v, k) => [typeof v === "number" ? v.toFixed(2) : v, k]} />
              <Scatter data={clusters} fill="#60a5fa" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="gs-card">
        <div className="gs-card-title">Gold vs Silver Correlation {alignedPairs.length ? `(r = ${corr.toFixed(3)})` : ""}</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="gold" name="Gold" />
              <YAxis dataKey="silver" name="Silver" />
              <ZAxis range={[60,60]} />
              <Tooltip formatter={(v,k)=>[typeof v === 'number' ? v.toFixed(2):v, k]} labelFormatter={() => "Pair"} />
              <Scatter data={alignedPairs} fill="#34d399" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

    </main>
  );
}
