from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TradeShowViewSet, BoothViewSet, ExhibitorViewSet

app_name = "tradeshow"

router = DefaultRouter()
router.register(r"shows", TradeShowViewSet, basename="tradeshow-shows")
router.register(r"booths", BoothViewSet, basename="tradeshow-booths")
router.register(r"exhibitors", ExhibitorViewSet, basename="tradeshow-exhibitors")

urlpatterns = [path("", include(router.urls))]
