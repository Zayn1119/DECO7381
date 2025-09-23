from django.contrib import admin
from .models import TradeShow, Booth, Exhibitor

@admin.register(TradeShow)
class TradeShowAdmin(admin.ModelAdmin):
    list_display = ("meeting_id", "name", "created_at")
    search_fields = ("meeting_id", "name")

@admin.register(Booth)
class BoothAdmin(admin.ModelAdmin):
    list_display = ("label", "tradeshow", "x", "y", "width", "height", "is_active")
    list_filter = ("tradeshow", "is_active")
    search_fields = ("label",)

@admin.register(Exhibitor)
class ExhibitorAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "tradeshow", "booth","tags")
    list_filter = ("company", "tradeshow")
    search_fields = ("name", "company")
