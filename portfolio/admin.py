from django.contrib import admin
from .models import Portfolio, Stock

@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('name', 'sector', 'performance_percent')
    list_filter = ('sector',)
    search_fields = ('name',)

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'company_name', 'portfolio', 'price', 'pe_ratio', 'discount_percent', 'discount_level')
    list_filter = ('discount_level', 'portfolio__sector')
    search_fields = ('symbol', 'company_name')