from django.conf import settings
from django.db import models

class Portfolio(models.Model):
    SECTOR_CHOICES = (
        ('BANK', 'Bank'),
        ('IT', 'IT'),
        ('FINANCE', 'Finance'),
        ('HEALTHCARE', 'Healthcare'),
    )
    name = models.CharField(max_length=100)
    sector = models.CharField(max_length=20, choices=SECTOR_CHOICES)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    performance_percent = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.name} ({self.get_sector_display()})"

class Stock(models.Model):
    portfolio = models.ForeignKey(Portfolio, related_name='stocks', on_delete=models.CASCADE)
    symbol = models.CharField(max_length=20)
    company_name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    pe_ratio = models.FloatField(null=True, blank=True)
    discount_percent = models.FloatField(default=0.0)
    fair_value = models.FloatField(null=True, blank=True)

    DISCOUNT_LEVEL_CHOICES = (
        ('STRONG', 'Strong Opportunity'),
        ('MODERATE', 'Moderate Opportunity'),
        ('LOW', 'Low Opportunity'),
    )
    discount_level = models.CharField(max_length=10, choices=DISCOUNT_LEVEL_CHOICES, default='LOW')

    def classify_discount(self):
        d = self.discount_percent or 0
        if d >= 20:
            return 'STRONG'
        elif 10 <= d < 20:
            return 'MODERATE'
        else:
            return 'LOW'

    def save(self, *args, **kwargs):
        self.discount_level = self.classify_discount()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.symbol} - {self.company_name}"