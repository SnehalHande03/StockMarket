import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const STORAGE_KEY = "manualStocks";
const PORTFOLIO_STORAGE_KEY = "portfolioHoldings";
const SECTORS = ["IT", "FINANCE", "BANK", "HEALTHCARE"];

export default function ManualEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const incomingSector = searchParams.get("sector");
  const defaultSector = SECTORS.includes(incomingSector) ? incomingSector : "IT";

  const [sector, setSector] = useState(defaultSector);
  const [ticker, setTicker] = useState("");
  const [msg, setMsg] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setMsg("");

    const payload = {
      id: Date.now(),
      sector,
      ticker: ticker.trim().toUpperCase(),
    };

    if (!payload.ticker) {
      setMsg("Please enter a valid stock ticker.");
      return;
    }

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (existing.some((item) => item.ticker === payload.ticker && item.sector === payload.sector)) {
      setMsg("This stock is already added for the selected sector.");
      return;
    }
    existing.push(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    // Keep Portfolio view in sync with manual entries.
    const holdings = JSON.parse(localStorage.getItem(PORTFOLIO_STORAGE_KEY) || "[]");
    const alreadyInPortfolio = holdings.some((item) => {
      const name = (item.name || item.symbol || item.ticker || "").toString().trim().toUpperCase();
      const itemSector = (item.sector || "").toString().trim().toUpperCase();
      return name === payload.ticker && itemSector === payload.sector;
    });
    if (!alreadyInPortfolio) {
      holdings.push({
        name: payload.ticker,
        quantity: 1,
        buyPrice: 0,
        currentPrice: 0,
        peRatio: null,
        sector: payload.sector,
      });
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
    }

    navigate("/analysis", { replace: true });
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Manual Stock Entry</h1>

      <form onSubmit={onSubmit} className="card-glass p-6 space-y-4">
        <div>
          <label className="block text-sm mb-2">Sector</label>
          <select
            className="w-full p-3 rounded-xl bg-pinkdark border border-white/10"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2">Stock Ticker</label>
          <input
            className="w-full p-3 rounded-xl bg-pinkdark border border-white/10"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. INFY.NS"
            required
          />
        </div>

        {msg && <div className="text-sm text-brand-accent">{msg}</div>}

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary px-5 py-3 text-sm">Add Stock</button>
          <button
            type="button"
            onClick={() => navigate("/analysis")}
            className="px-5 py-3 text-sm rounded-xl border border-white/20 text-slate-200 hover:bg-white/5 transition-colors"
          >
            Show Stocks
          </button>
        </div>
      </form>
    </main>
  );
}
