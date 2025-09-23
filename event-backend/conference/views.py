from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Meeting, Table, Attendee, Assignment
from .serializers import (
    MeetingSerializer, TableSerializer, AttendeeSerializer, AssignmentSerializer
   
)


def get_meeting_or_404(request):
    code = request.query_params.get("code") or request.data.get("code")
    mid  = request.query_params.get("meeting") or request.query_params.get("meeting_id")

    from django.shortcuts import get_object_or_404
    from .models import Meeting

    if code:
        # 关键：带 code 时自动创建
        m, _ = Meeting.objects.get_or_create(code=code, defaults={"title": code})
        return m
    if mid:
        return get_object_or_404(Meeting, pk=mid)

    # 没给参数时，回退到最近的一场（也可改成 404）
    return Meeting.objects.order_by("-id").first() or Meeting.objects.create(title="Quick Start")


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer

class BaseMeetingViewSet(viewsets.ModelViewSet):
    """把 ?code=xxx 映射到 meeting，上下文所有列表/创建都局限于该会议。"""
    def get_meeting(self):
        return get_meeting_or_404(self.request)

    def get_queryset(self):
        qs = super().get_queryset()
        m = self.get_meeting()
        # 下游模型都带 meeting 外键；Table/Attendee/Assignment 都有 meeting 字段
        return qs.filter(meeting=m)

    def perform_create(self, serializer):
        serializer.save(meeting=self.get_meeting())

class TableViewSet(BaseMeetingViewSet):
    queryset = Table.objects.all()
    serializer_class = TableSerializer

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        m = self.get_meeting()
        items = request.data.get("tables") or []
        created_or_updated = []
        for item in items:
            pk = item.get("id")
            payload = {
                "meeting": m.id,
                "label": item["label"],
                "table_type": item["table_type"],  # "C"/"S"/"R"
                "seats": item["seats"],
                "x": item.get("x", 20),
                "y": item.get("y", 20),
            }
            if pk:
                obj = get_object_or_404(Table, pk=pk, meeting=m)
                for k, v in payload.items():
                    setattr(obj, k, v)
                obj.save()
            else:
                obj, _ = Table.objects.update_or_create(
                    meeting=m, label=payload["label"],
                    defaults=payload
                )
            created_or_updated.append(obj.id)
        return Response({"ids": created_or_updated})

class AttendeeViewSet(BaseMeetingViewSet):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer

class AssignmentViewSet(BaseMeetingViewSet):
    queryset = Assignment.objects.select_related("table","attendee","meeting")
    serializer_class = AssignmentSerializer

    def perform_create(self, serializer):
        m = self.get_meeting()
        table_id    = self.request.data.get("table")
        attendee_id = self.request.data.get("attendee")
        # 校验跨会议引用
        table = get_object_or_404(Table, pk=table_id, meeting=m)
        attendee = get_object_or_404(Attendee, pk=attendee_id, meeting=m)
        serializer.save(meeting=m, table=table, attendee=attendee)

    @action(detail=False, methods=["delete"])
    def clear(self, request):
        m = self.get_meeting()
        Assignment.objects.filter(meeting=m).delete()
        return Response({"ok": True})

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        m = self.get_meeting()
        items = request.data.get("assignments") or []
        created = []
        for a in items:
            # 前端必须发 seat_index / table(int) / attendee(int)
            table    = get_object_or_404(Table, pk=a["table"], meeting=m)
            attendee = get_object_or_404(Attendee, pk=a["attendee"], meeting=m)
            obj = Assignment.objects.create(
                meeting=m, table=table, attendee=attendee, seat_index=int(a["seat_index"]),
                status=a.get("status","assigned")
            )
            created.append(obj.id)
        return Response({"ids": created}, status=status.HTTP_201_CREATED)

# 可选：一次性读取 bootstrap
from rest_framework.views import APIView
class BootstrapView(APIView):
    def get(self, request):
        m = get_meeting_or_404(request)
        return Response({
            "attendees": AttendeeSerializer(Attendee.objects.filter(meeting=m), many=True).data,
            "tables": TableSerializer(Table.objects.filter(meeting=m), many=True).data,
            "assignments": AssignmentSerializer(Assignment.objects.filter(meeting=m), many=True).data,
        })
