# from rest_framework import serializers
# from .models import Meeting, Attendee

# class MeetingSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Meeting
#         fields = "__all__"

# class AttendeeSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Attendee
#         fields = "__all__"
# from .models import Table, Assignment

# class TableSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Table
#         fields = "__all__"

# class AssignmentSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Assignment
#         fields = "__all__"

# conference/serializers.py
from rest_framework import serializers
from .models import Meeting, Table, Attendee, Assignment

class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = ["id", "code", "title", "date"]

class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Table
        fields = ["id", "meeting", "label", "table_type", "seats", "x", "y"]
        read_only_fields = ["meeting"]  # meeting 由视图层按 code 自动注入

class AttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Attendee
        fields = ["id", "meeting", "full_name", "department", "position", "note"]
        read_only_fields = ["meeting"]

class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Assignment
        fields = ["id", "meeting", "table", "attendee", "seat_index", "status"]
        read_only_fields = ["meeting"]
