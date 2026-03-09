import pandas as pd
import json
from urllib.parse import urlencode
from urllib.request import urlopen, Request

COMMON_SYMBOL_ALIASES = {
    "INFOSYS": "INFY.NS",
    "INFOSIS": "INFY.NS",
    "TCS": "TCS.NS",
    "CIPLA": "CIPLA.NS",
    "HCL": "HCLTECH.NS",
    "ICIC": "ICICIBANK.NS",
    "ICICI": "ICICIBANK.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "RELIANCE": "RELIANCE.NS",
    "SBIN": "SBIN.NS",
}

def _yf():
    try:
        import yfinance as yf  # lazy import to avoid breaking management commands
        return yf
    except Exception as e:
        raise ImportError("yfinance is required to fetch market data. Install it with 'pip install yfinance pandas numpy'") from e


def _has_history(symbol: str) -> bool:
    yf = _yf()
    ticker = yf.Ticker(symbol)
    df = ticker.history(period="1mo", interval="1d")
    return not df.empty


def _search_yahoo_symbol(query: str) -> str | None:
    try:
        params = urlencode({"q": query, "quotesCount": 10, "newsCount": 0})
        url = f"https://query2.finance.yahoo.com/v1/finance/search?{params}"
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        quotes = payload.get("quotes", []) or []
        for q in quotes:
            sym = q.get("symbol")
            qtype = (q.get("quoteType") or "").upper()
            if sym and qtype in {"EQUITY", "ETF"}:
                return sym.upper()
    except Exception:
        return None
    return None


def resolve_symbol(query: str) -> str:
    raw = (query or "").strip().upper()
    if not raw:
        return raw

    if raw in COMMON_SYMBOL_ALIASES:
        return COMMON_SYMBOL_ALIASES[raw]

    candidates = [raw]
    if "." not in raw:
        candidates.extend([f"{raw}.NS", f"{raw}.BO"])

    for cand in candidates:
        try:
            if _has_history(cand):
                return cand
        except Exception:
            continue

    searched = _search_yahoo_symbol(raw)
    if searched:
        return searched

    return raw

def fetch_stock_history(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    yf = _yf()
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval)
    if df.empty:
        # Fallback path for symbols where Ticker.history intermittently returns empty.
        df = yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=False)
    if df.empty:
        return pd.DataFrame(columns=["date", "close"])
    df = df.reset_index()
    df = df.rename(columns={"Date": "date", "Datetime": "date", "Close": "close", "close": "close"})
    if "date" not in df.columns or "close" not in df.columns:
        return pd.DataFrame(columns=["date", "close"])
    return df[["date", "close"]]

def get_eps(symbol: str) -> float | None:
    yf = _yf()
    ticker = yf.Ticker(symbol)
    info = ticker.info or {}
    eps = info.get("trailingEps") or info.get("forwardEps")
    if eps is None:
        return None
    try:
        return float(eps)
    except Exception:
        return None


def get_pe_ratio(symbol: str) -> float | None:
    yf = _yf()
    ticker = yf.Ticker(symbol)
    info = ticker.info or {}
    pe = info.get("trailingPE") or info.get("forwardPE")
    if pe is None:
        return None
    try:
        return float(pe)
    except Exception:
        return None

def get_company_name(symbol: str) -> str:
    yf = _yf()
    ticker = yf.Ticker(symbol)
    info = ticker.info or {}
    return info.get("longName") or symbol
