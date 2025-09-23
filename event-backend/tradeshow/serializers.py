from rest_framework import serializers
from .models import TradeShow, Booth, Exhibitor

class TradeShowSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeShow
        fields = ["id", "meeting_id", "name", "created_at"]

class BoothSerializer(serializers.ModelSerializer):
    # Map model width/height <-> frontend w/h
    w = serializers.IntegerField(source="width")
    h = serializers.IntegerField(source="height")

    class Meta:
        model = Booth
        fields = ["id", "tradeshow", "label", "x", "y", "w", "h", "is_active"]

class ExhibitorSerializer(serializers.ModelSerializer):
    # Map FK booth <-> frontend boothId
    boothId = serializers.PrimaryKeyRelatedField(
        source="booth", queryset=Booth.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = Exhibitor
        fields = ["id", "tradeshow", "name", "company", "tags", "boothId", "x", "y"]
