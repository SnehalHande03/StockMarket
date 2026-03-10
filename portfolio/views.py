from django.db.models import Q
from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import Portfolio, Stock
from .serializers import PortfolioSerializer, StockSerializer
from eda.plot_data import build_opportunity_json

class PortfolioViewSet(ReadOnlyModelViewSet):
    queryset = Portfolio.objects.all().order_by('name')
    serializer_class = PortfolioSerializer

class StockViewSet(ReadOnlyModelViewSet):
    queryset = Stock.objects.select_related('portfolio').all().order_by('symbol')
    serializer_class = StockSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        portfolio_id = self.request.query_params.get('portfolio')
        sector = self.request.query_params.get('sector')

        if search:
            qs = qs.filter(Q(symbol__icontains=search) | Q(company_name__icontains=search))
        if portfolio_id:
            qs = qs.filter(portfolio_id=portfolio_id)
        if sector:
            qs = qs.filter(portfolio__sector__iexact=sector)

        return qs

    def _refresh_stock_from_yfinance(self, stock: Stock, data=None):
        data = data or build_opportunity_json(stock.symbol)
        price = data.get('price')
        pe = data.get('pe_ratio')
        fv = data.get('fair_value')
        disc = data.get('discount_percent')

        if price is not None:
            stock.price = price
        if pe is not None:
            stock.pe_ratio = pe
        if fv is not None:
            stock.fair_value = fv
        if disc is not None:
            stock.discount_percent = disc

        stock.save(update_fields=['price', 'pe_ratio', 'fair_value', 'discount_percent', 'discount_level'])

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        stocks = list(qs)

        refresh = str(request.query_params.get('refresh', '0')).lower()
        if refresh in ('1', 'true', 'yes'):
            for stock in stocks:
                try:
                    self._refresh_stock_from_yfinance(stock)
                except Exception:
                    # Keep stale DB values if live provider fails for a symbol.
                    continue

        serializer = self.get_serializer(stocks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='graph')
    def graph(self, request, pk=None):
        stock = self.get_object()
        try:
            data = build_opportunity_json(stock.symbol)
            self._refresh_stock_from_yfinance(stock, data=data)
        except Exception as exc:
            data = {
                "symbol": stock.symbol,
                "input_symbol": stock.symbol,
                "company_name": stock.company_name,
                "price": float(stock.price or 0),
                "eps": None,
                "pe_ratio": stock.pe_ratio,
                "fair_value": stock.fair_value,
                "discount_percent": stock.discount_percent,
                "discount_level": stock.discount_level,
                "series": [],
                "zones": {
                    "strong_threshold": 20,
                    "moderate_threshold": 10
                },
                "error": "market_data_unavailable",
                "detail": f"Live market data temporarily unavailable: {exc}",
            }
        return Response(data)


class AnalyzeSymbolView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        symbol = (request.query_params.get('symbol') or '').strip().upper()
        if not symbol:
            raise ValidationError({"symbol": "Query param 'symbol' is required."})

        cache_key = f"analyze:{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            data = build_opportunity_json(symbol)
            cache.set(cache_key, data, timeout=120)
        except Exception as exc:
            # Avoid surfacing provider/rate-limit errors as HTTP 500 to frontend.
            detail = str(exc)
            data = {
                "symbol": symbol,
                "input_symbol": symbol,
                "company_name": symbol,
                "price": 0.0,
                "eps": None,
                "pe_ratio": None,
                "fair_value": None,
                "discount_percent": None,
                "discount_level": "LOW",
                "series": [],
                "zones": {
                    "strong_threshold": 20,
                    "moderate_threshold": 10
                },
                "error": "market_data_unavailable",
                "detail": f"Live market data temporarily unavailable: {detail}",
            }
        return Response(data)
