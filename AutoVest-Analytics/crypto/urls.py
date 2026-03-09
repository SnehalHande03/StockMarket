from django.urls import path
from .views import btc_series, gold_silver_series

urlpatterns = [
    path("btc/", btc_series),
    path("gold-silver/", gold_silver_series),
]
