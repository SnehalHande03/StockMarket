import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

const SECTOR_IMAGES = {
  IT: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=100",
  FINANCE: "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&q=80&w=100",
  HEALTHCARE: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=100",
  BANK: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&q=80&w=100",
};

export default function Stocks() {
  const [searchParams] = useSearchParams();
  const selectedPortfolio = searchParams.get("portfolio");

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  const addToPortfolio = (s) => {
    const qty = Number(prompt(`Quantity for ${s.symbol}`, "10"));
    const buy = Number(prompt("Buy price", "100"));
    if (!Number.isFinite(qty) || !Number.isFinite(buy) || qty <= 0 || buy <= 0) return;
    const data = JSON.parse(localStorage.getItem("portfolioHoldings") || "[]");
    const item = {
      name: s.company_name || s.symbol,
      symbol: s.symbol,
      quantity: qty,
      buyPrice: buy,
      currentPrice: Number(s.price || s.current_price || 0),
      peRatio: s.pe_ratio ?? null,
      sector: s.portfolio_sector || "UNSPECIFIED",
    };
    data.push(item);
    localStorage.setItem("portfolioHoldings", JSON.stringify(data));
    alert("Added to portfolio");
  };

  useEffect(() => {
    setLoading(true);
    setErr("");
    const params = { refresh: 1 };
    if (selectedPortfolio) {
      params.portfolio = selectedPortfolio;
    }

    api.get("/stocks/", { params })
      .then((res) => setStocks(res.data))
      .catch(() => setErr("Failed to load stocks"))
      .finally(() => setLoading(false));
  }, [selectedPortfolio]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter((s) =>
      `${s.symbol} ${s.company_name}`.toLowerCase().includes(q)
    );
  }, [stocks, query]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Stocks</h1>
        <p className="text-slate-400 mt-1">Step 2: Choose a stock for details and graph (live from yfinance).</p>
        {selectedPortfolio && stocks.length > 0 && (
          <p className="text-brand-accent mt-2">
            Portfolio: {stocks[0].portfolio_name} ({stocks[0].portfolio_sector})
          </p>
        )}
      </div>

      <div className="mb-6 flex gap-2 items-center">
        <input
          className="flex-1 max-w-2xl p-4 rounded-2xl bg-pinkdark border border-white/10 text-base"
          placeholder="Search stock by name or ticker (e.g., TCS, INFY)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-primary px-5 py-3">Search</button>
      </div>

      {err && <div className="text-overvalued mb-4">{err}</div>}

      {loading && (
        <div className="glass-card p-8 text-slate-400">Loading stocks...</div>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <Link to={`/stocks/${s.id}`} className="flex items-center gap-3 min-w-0">
                  <img
                    src={SECTOR_IMAGES[s.portfolio_sector]}
                    alt={s.portfolio_sector}
                    className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.symbol} - {s.company_name}</div>
                    <div className="text-slate-400 text-sm truncate">{s.portfolio_name} ({s.portfolio_sector})</div>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-opportunity font-semibold">{s.discount_percent ?? 0}%</div>
                  <button onClick={() => addToPortfolio(s)} className="px-3 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10">Add to Portfolio</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="glass-card p-6 text-slate-400">No stocks found.</div>
          )}
        </div>
      )}
    </main>
  );
}
