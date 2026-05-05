from django.contrib import admin

from .models import MarketplaceItem, PurchaseRequest

admin.site.register(MarketplaceItem)
admin.site.register(PurchaseRequest)
