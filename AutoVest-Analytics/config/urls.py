"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter
from portfolio.views import PortfolioViewSet, StockViewSet, AnalyzeSymbolView
from staff.views import PublicTokenObtainPairView, PublicTokenRefreshView, SignupView

router = DefaultRouter()
router.register(r'portfolio', PortfolioViewSet, basename='portfolio')
router.register(r'stocks', StockViewSet, basename='stocks')

urlpatterns = [
    path('', RedirectView.as_view(url='/api/', permanent=False)),
    path('admin/', admin.site.urls),
    path('api/login/', PublicTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/signup/', SignupView.as_view(), name='signup'),
    path('api/token/refresh/', PublicTokenRefreshView.as_view(), name='token_refresh'),
    path('api/analyze/', AnalyzeSymbolView.as_view(), name='analyze_symbol'),
    path('api/crypto/', include('crypto.urls')),
    path('api/commodities/', include('crypto.urls')),
    path('api/', include(router.urls)),
    re_path(r'^.*$', RedirectView.as_view(url='/api/', permanent=False)),
]
