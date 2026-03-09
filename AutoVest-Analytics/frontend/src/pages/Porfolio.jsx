import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

const STORAGE_KEY = "portfolioHoldings";
const MANUAL_STORAGE_KEY = "manualStocks";

const formatCurrency = (value) => `\u20B9${Number(value || 0).toFixed(2)}`;

const normalizeSector = (value) => {
  const raw = (value || "").toString().trim().toUpperCase();
  if (!raw) return "UNSPECIFIED";
  if (raw === "BANKING") return "BANK";
  return raw;
};

const normalizeSymbol = (value) => (value || "").toString().trim().toUpperCase();

const candidatesForSymbol = (symbol) => {
  const sym = normalizeSymbol(symbol);
  if (!sym) return [];
  if (sym.includes(".")) return [sym];
  return [sym, `${sym}.NS`, `${sym}.BO`];
};

export default function Portfolio() {
  const [searchParams] = useSearchParams();
  const selectedSector = normalizeSector(searchParams.get("sector"));
  const [priceBySymbol, setPriceBySymbol] = useState({});

  const holdings = useMemo(() => {
    const rawHoldings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const manualStocks = JSON.parse(localStorage.getItem(MANUAL_STORAGE_KEY) || "[]");

    const base = rawHoldings.map((item) => ({
      name: item.name || item.symbol || item.ticker || "Unknown Stock",
      symbol: normalizeSymbol(item.symbol || item.ticker || item.name),
      sector: normalizeSector(item.sector || item.portfolio_sector),
      price: Number(item.currentPrice ?? item.price ?? 0),
    }));

    const seen = new Set(
      base.map((item) => `${normalizeSymbol(item.name)}::${item.sector}`)
    );

    manualStocks.forEach((item) => {
      const name = normalizeSymbol(item.ticker || item.name);
      const sector = normalizeSector(item.sector);
      if (!name) return;
      const key = `${name}::${sector}`;
      if (seen.has(key)) return;
      base.push({ name, symbol: name, sector, price: 0 });
      seen.add(key);
    });

    return base;
  }, []);

  useEffect(() => {
    const fetchMissingPrices = async () => {
      const targets = holdings.filter((h) => (!h.price || h.price <= 0) && h.symbol);
      if (!targets.length) return;

      const nextPrices = {};

      for (const stock of targets) {
        const symbolCandidates = candidatesForSymbol(stock.symbol);
        for (const candidate of symbolCandidates) {
          try {
            const res = await api.get("/analyze/", { params: { symbol: candidate } });
            const livePrice = Number(res?.data?.price ?? 0);
            if (Number.isFinite(livePrice) && livePrice > 0) {
              nextPrices[stock.symbol] = livePrice;
              break;
            }
          } catch (_) {
            continue;
          }
        }
      }

      if (Object.keys(nextPrices).length === 0) return;
      setPriceBySymbol((prev) => ({ ...prev, ...nextPrices }));

      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const updated = raw.map((item) => {
        const itemSymbol = normalizeSymbol(item.symbol || item.ticker || item.name);
        const live = nextPrices[itemSymbol];
        if (!live) return item;
        return { ...item, currentPrice: live };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    fetchMissingPrices();
  }, [holdings]);

  const filteredHoldings = useMemo(() => {
    const visible = holdings.map((stock) => ({
      ...stock,
      price: Number(priceBySymbol[stock.symbol] ?? stock.price ?? 0),
    }));
    if (!searchParams.get("sector")) return visible;
    return visible.filter((stock) => stock.sector === selectedSector);
  }, [holdings, priceBySymbol, searchParams, selectedSector]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <p className="text-slate-400 mt-1">
          {searchParams.get("sector")
            ? `Showing ${selectedSector} stocks with current price.`
            : "Added stocks with current price."}
        </p>
      </div>

      <section className="glass-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="p-3">Stock</th>
              <th className="p-3">Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map((stock, index) => (
              <tr key={`${stock.name}-${index}`} className="border-b border-white/5 last:border-b-0">
                <td className="p-3 font-medium">{stock.name}</td>
                <td className="p-3">{formatCurrency(stock.price)}</td>
              </tr>
            ))}
            {filteredHoldings.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan="2">
                  {searchParams.get("sector")
                    ? `No stocks found for ${selectedSector}.`
                    : "No stocks added yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
