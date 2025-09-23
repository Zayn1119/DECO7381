from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import TradeShow, Booth, Exhibitor
from .serializers import TradeShowSerializer, BoothSerializer, ExhibitorSerializer
from rest_framework.permissions import AllowAny

class TradeShowViewSet(viewsets.ModelViewSet):
    queryset = TradeShow.objects.all()
    serializer_class = TradeShowSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    @action(detail=False, methods=["get"])
    def bootstrap(self, request):
        """
        GET /api/tradeshow/shows/bootstrap?meeting_id=T-...
        Create-or-get a show by meeting_id and return show+booths+exhibitors.
        """
        mid = request.query_params.get("meeting_id")
        if not mid:
            return Response({"detail": "meeting_id required"}, status=400)
        show, _ = TradeShow.objects.get_or_create(meeting_id=mid)
        booths = Booth.objects.filter(tradeshow=show).order_by("label")
        exhibitors = Exhibitor.objects.filter(tradeshow=show)
        return Response({
            "show": TradeShowSerializer(show).data,
            "booths": BoothSerializer(booths, many=True).data,
            "exhibitors": ExhibitorSerializer(exhibitors, many=True).data,
        })

    @action(detail=True, methods=["post"])
    def reset(self, request, pk=None):
        """
        POST /api/tradeshow/shows/{id}/reset
        Remove all booths/exhibitors under the given show.
        """
        show = self.get_object()
        Booth.objects.filter(tradeshow=show).delete()
        Exhibitor.objects.filter(tradeshow=show).delete()
        return Response({"ok": True})

class BoothViewSet(viewsets.ModelViewSet):
    queryset = Booth.objects.select_related("tradeshow")
    serializer_class = BoothSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        qs = super().get_queryset()
        tid = self.request.query_params.get("tradeshow")
        if tid:
            qs = qs.filter(tradeshow_id=tid)
        return qs

class ExhibitorViewSet(viewsets.ModelViewSet):
    queryset = Exhibitor.objects.select_related("tradeshow", "booth")
    serializer_class = ExhibitorSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        qs = super().get_queryset()
        tid = self.request.query_params.get("tradeshow")
        company = self.request.query_params.get("company")
        if tid:
            qs = qs.filter(tradeshow_id=tid)
        if company:
            qs = qs.filter(company=company)
        return qs
