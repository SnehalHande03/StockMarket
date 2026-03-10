from datetime import datetime
from .fetch_data import fetch_stock_history, get_eps, get_pe_ratio, get_company_name, resolve_symbol
from .clean_data import compute_metrics, classify_discount

def build_opportunity_json(symbol: str) -> dict:
    resolved_symbol = resolve_symbol(symbol)
    history = fetch_stock_history(resolved_symbol, period="6mo", interval="1d")
    company_name = get_company_name(resolved_symbol)

    if history.empty:
        series = []
        price = 0.0
    else:
        series = [
            {"t": row["date"].isoformat() if isinstance(row["date"], datetime) else str(row["date"]),
             "price": float(row["close"])}
            for _, row in history.iterrows()
        ]
        price = float(history["close"].iloc[-1])

    eps = get_eps(resolved_symbol)
    metrics = compute_metrics(price, eps, baseline_pe=15.0)
    market_pe = get_pe_ratio(resolved_symbol)

    pe_ratio = metrics["pe_ratio"] if metrics["pe_ratio"] is not None else market_pe
    fair_value = metrics["fair_value"]
    discount_percent = metrics["discount_percent"]

    # If EPS is unavailable but Yahoo PE exists, back-calculate an estimated fair value/discount.
    if fair_value is None and pe_ratio is not None and pe_ratio > 0 and price > 0:
        eps_est = price / pe_ratio
        fair_value = round(eps_est * 15.0, 2)
        discount_percent = round(((fair_value - price) / fair_value) * 100.0, 2)

    discount_for_level = discount_percent if discount_percent is not None else 0.0
    discount_level = classify_discount(discount_for_level)

    return {
        "symbol": resolved_symbol,
        "input_symbol": symbol,
        "company_name": company_name,
        "price": price,
        "eps": eps,
        "pe_ratio": pe_ratio,
        "fair_value": fair_value,
        "discount_percent": discount_percent,
        "discount_level": discount_level,
        "series": series,
        "zones": {
            "strong_threshold": 20,
            "moderate_threshold": 10
        }
    }
