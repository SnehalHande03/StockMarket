import { useMemo } from "react";

const STORAGE_KEY = "portfolioHoldings";

const formatCurrency = (value) => `\u20B9${Number(value || 0).toFixed(2)}`;

export default function Dashboard() {
  const holdings = useMemo(() => {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return raw.map((item) => ({
      name: item.name || item.symbol || item.ticker || "Unknown Stock",
      price: Number(item.currentPrice ?? item.price ?? 0),
    }));
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <p className="text-slate-400 mt-1">Added stocks with current price.</p>
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
            {holdings.map((stock, index) => (
              <tr key={`${stock.name}-${index}`} className="border-b border-white/5 last:border-b-0">
                <td className="p-3 font-medium">{stock.name}</td>
                <td className="p-3">{formatCurrency(stock.price)}</td>
              </tr>
            ))}
            {holdings.length === 0 && (
              <tr>
                <td className="p-6 text-slate-400" colSpan="2">No stocks added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
