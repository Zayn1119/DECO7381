# from django.contrib import admin
# from .models import Meeting, Attendee, Table, Assignment

# @admin.register(Meeting)
# class MeetingAdmin(admin.ModelAdmin):
#     list_display = ("id", "code")      # 去掉 created_by / created_at
#     search_fields = ("code",)
#     ordering = ("-id",)

# @admin.register(Attendee)
# class AttendeeAdmin(admin.ModelAdmin):
#     list_display = ("id", "full_name", "company_name", "department", "position", "meeting")
#     list_filter = ("department", "position", "meeting")
#     search_fields = ("full_name", "company_name", "note")

# @admin.register(Table)
# class TableAdmin(admin.ModelAdmin):
#     list_display = ("id", "label", "type", "seat_count", "meeting")
#     list_filter = ("type", "meeting")
#     search_fields = ("label",)

# @admin.register(Assignment)
# class AssignmentAdmin(admin.ModelAdmin):
#     list_display = ("id", "table", "seat_index", "attendee", "status")
#     list_filter = ("table__meeting", "status")
#     search_fields = ("table__label", "attendee__full_name")

# conference/admin.py
from django.contrib import admin
from .models import Meeting, Table, Attendee, Assignment

@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ("code","title","date")
    search_fields = ("code","title")

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ("label","meeting","table_type","seats","x","y")
    list_filter = ("meeting","table_type")

@admin.register(Attendee)
class AttendeeAdmin(admin.ModelAdmin):
    list_display = ("full_name","meeting","department","position")
    list_filter = ("meeting","department","position")
    search_fields = ("full_name",)

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("meeting","table","seat_index","attendee","status")
    list_filter = ("meeting","table","status")
