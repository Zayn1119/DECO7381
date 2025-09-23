# from django.urls import path, include, re_path
# from rest_framework.routers import DefaultRouter
# from .views import (
#     MeetingViewSet, AttendeeViewSet, TableViewSet, AssignmentViewSet,
#     BootstrapView, PingView, DebugEchoView,
# )

# class OptionalSlashRouter(DefaultRouter):
#     trailing_slash = '/?'

# router = OptionalSlashRouter()

# router.register("meetings", MeetingViewSet)
# router.register("attendees", AttendeeViewSet)
# router.register("tables", TableViewSet)
# router.register("assignments", AssignmentViewSet)

# router.register("rooms", TableViewSet, basename="rooms")
# router.register("seats", AssignmentViewSet, basename="seats")
# router.register("seat-assignments", AssignmentViewSet, basename="sa")
# router.register("seatassignments", AssignmentViewSet, basename="sa2")

# urlpatterns = [
#     path("", include(router.urls)),
#     re_path(r"^bootstrap/?$", BootstrapView.as_view()),
#     re_path(r"^ping/?$", PingView.as_view()),
# ]

# # 兜底（务必在最后）
# urlpatterns += [
#     re_path(r"^(?P<path>.*)$", DebugEchoView.as_view()),
# ]

# event-backend/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MeetingViewSet, TableViewSet, AttendeeViewSet, AssignmentViewSet, BootstrapView
)

router = DefaultRouter()
router.register(r"meetings", MeetingViewSet)
router.register(r"tables", TableViewSet, basename="tables")
router.register(r"attendees", AttendeeViewSet, basename="attendees")
router.register(r"assignments", AssignmentViewSet, basename="assignments")

urlpatterns = [
    # 这里不要再加 "api/" 前缀！
    path("", include(router.urls)),
    # 建议加斜杠，也可以同时兼容不带斜杠（见下行可选写法）
    path("bootstrap/", BootstrapView.as_view()),
    # 如需兼容不带斜杠可再加一行（可选）：
    # path("bootstrap", BootstrapView.as_view()),
]
