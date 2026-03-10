from rest_framework import serializers
from .models import Portfolio, Stock

class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'sector', 'performance_percent']

class StockSerializer(serializers.ModelSerializer):
    portfolio_name = serializers.CharField(source='portfolio.name', read_only=True)
    portfolio_sector = serializers.CharField(source='portfolio.sector', read_only=True)

    class Meta:
        model = Stock
        fields = [
            'id', 'portfolio', 'symbol', 'company_name', 'price',
            'pe_ratio', 'discount_percent', 'fair_value', 'discount_level',
            'portfolio_name', 'portfolio_sector'
        ]
