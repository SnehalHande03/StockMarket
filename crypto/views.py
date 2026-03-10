from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.core.cache import cache
import yfinance as yf


def _history_to_series(hist):
    if hist is None or hist.empty:
        return []

    hist = hist.reset_index()
    ts_col = "Date" if "Date" in hist.columns else "Datetime" if "Datetime" in hist.columns else None
    if ts_col is None:
        return []

    out = []
    for _, row in hist.iterrows():
        dt = row[ts_col]
        close = row.get("Close")
        if close is None:
            continue
        dstr = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)
        out.append({"date": dstr, "price": float(close), "close": float(close)})
    return out


def _get_live_price(ticker):
    # Prefer yfinance fast_info for near-real-time quote, then fallback to latest 1m candle.
    try:
        fast = getattr(ticker, "fast_info", None)
        if fast:
            for key in ("lastPrice", "last_price", "regularMarketPrice"):
                val = fast.get(key)
                if val is not None:
                    return float(val)
    except Exception:
        pass

    try:
        intraday = ticker.history(period="1d", interval="1m")
        if intraday is not None and not intraday.empty:
            last_close = intraday["Close"].iloc[-1]
            if last_close is not None:
                return float(last_close)
    except Exception:
        pass

    return None


@require_GET
def btc_series(request):
    rng = request.GET.get("range", "1y")
    interval = request.GET.get("interval", "1d")
    key = f"btc:{rng}:{interval}"
    cached = cache.get(key)
    if cached:
        return JsonResponse({"series": cached})
    try:
        hist = yf.Ticker("BTC-USD").history(period=rng, interval=interval)
        out = _history_to_series(hist)
        if not out:
            return JsonResponse({"detail": "no data"}, status=502)
        cache.set(key, out, 300)  # 5 minutes
        return JsonResponse({"series": out})
    except Exception:
        return JsonResponse({"detail": "BTC data fetch failed from yfinance, try later"}, status=502)


@require_GET
def gold_silver_series(request):
    asset = str(request.GET.get("asset", "gold")).strip().lower()
    rng = request.GET.get("range", "6mo")
    interval = request.GET.get("interval", "1d")

    symbols = {
        "gold": "GC=F",
        "silver": "SI=F",
    }
    symbol = symbols.get(asset)
    if symbol is None:
        return JsonResponse({"detail": "asset must be 'gold' or 'silver'"}, status=400)

    if interval not in {"1d", "1wk"}:
        return JsonResponse({"detail": "interval must be '1d' or '1wk'"}, status=400)

    key = f"commodity:{asset}:{rng}:{interval}"
    try:
        ticker = yf.Ticker(symbol)

        cached = cache.get(key)
        out = cached
        if not out:
            hist = ticker.history(period=rng, interval=interval)
            out = _history_to_series(hist)
            if not out:
                return JsonResponse({"detail": f"no data for {asset}"}, status=502)
            cache.set(key, out, 300)

        live_price = _get_live_price(ticker)
        if live_price is None and out:
            live_price = out[-1]["price"]

        return JsonResponse({"asset": asset, "series": out, "current_price": live_price})
    except Exception:
        return JsonResponse({"detail": f"{asset} data fetch failed from yfinance, try later"}, status=502)
