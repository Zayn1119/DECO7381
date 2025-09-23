# from django.db import models
# from django.conf import settings
# from datetime import date
# from random import randint

# # class Meeting(models.Model):
# #     code = models.CharField(max_length=20, unique=True, db_index=True, editable=False)
# #     created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
# #     created_at = models.DateTimeField(auto_now_add=True)
# #     def __str__(self): return self.code
# #     @staticmethod
# #     def make_code(): return f"C-{date.today().strftime('%Y%m%d')}-{randint(1000,9999)}"
# #     def save(self, *args, **kwargs):
# #         if not self.code:
# #             c = Meeting.make_code()
# #             while Meeting.objects.filter(code=c).exists():
# #                 c = Meeting.make_code()
# #             self.code = c
# #         return super().save(*args, **kwargs)
# # conference/models.py 里 Meeting 模型
# class Meeting(models.Model):
#     code = models.CharField(max_length=32, unique=True, blank=True, default="")

#     @staticmethod
#     def make_code():
#         from datetime import date
#         from random import randint
#         return f"C-{date.today().strftime('%Y%m%d')}-{randint(1000,9999)}"

#     def save(self, *args, **kwargs):
#         if not self.code:
#             self.code = Meeting.make_code()
#         super().save(*args, **kwargs)




# class Attendee(models.Model):
#     full_name = models.CharField(max_length=120)
#     email = models.EmailField(blank=True)
#     company_name = models.CharField(max_length=120, blank=True)
#     department = models.CharField(max_length=120, blank=True)
#     position = models.CharField(max_length=120, blank=True)
#     note = models.CharField(max_length=120, blank=True)
#     meeting = models.ForeignKey(Meeting, null=True, blank=True, on_delete=models.CASCADE, related_name="attendees")
#     def __str__(self): return self.full_name

# class Checkin(models.Model):
#     meeting = models.ForeignKey(Meeting, null=True, blank=True, on_delete=models.CASCADE, related_name="checkins")
#     attendee = models.ForeignKey(Attendee, null=True, blank=True, on_delete=models.SET_NULL, related_name="checkins")
#     method = models.CharField(max_length=20, blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     def __str__(self):
#         who = self.attendee.full_name if self.attendee_id else "anonymous"
#         return f"{who} @ {self.meeting.code if self.meeting_id else 'N/A'}"

# # 桌子（左侧 Type/Seats，加完后可保存坐标）
# class Table(models.Model):
#     class Type(models.TextChoices):
#         CIRCULAR = "circular", "Circular"
#         SQUARE   = "square",   "Square"
#         ROW      = "row",      "Row"

#     meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="tables")
#     label = models.CharField(max_length=16)                               # 如 T1
#     type = models.CharField(max_length=10, choices=Type.choices, default=Type.CIRCULAR)
#     seat_count = models.PositiveSmallIntegerField(default=6)
#     x = models.IntegerField(default=40)                                   # 画布坐标
#     y = models.IntegerField(default=40)

#     class Meta:
#         unique_together = ("meeting", "label")

#     def __str__(self):
#         return f"{self.label}@{self.meeting.code}"


# # 占座（不单独建 Seat 表，用 seat_index 表示第几个座位）
# class Assignment(models.Model):
#     table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name="assignments")
#     seat_index = models.PositiveSmallIntegerField()                        # 0..seat_count-1
#     attendee = models.ForeignKey(Attendee, on_delete=models.CASCADE, related_name="assignments")
#     status = models.CharField(max_length=12, default="assigned")
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         unique_together = ("table", "seat_index")                          # 1个座位只能坐1人

#     def __str__(self):
#         return f"{self.attendee.full_name} -> {self.table.label}[{self.seat_index}]"
# conference/models.py
from django.db import models

class Meeting(models.Model):
    code  = models.CharField(max_length=32, unique=True)  # 例如 C-20250908-6927
    title = models.CharField(max_length=128, blank=True)
    date  = models.DateField(null=True, blank=True)
    def __str__(self): return self.code

class Table(models.Model):
    CIRCLE, SQUARE, ROW = "C", "S", "R"
    TYPE_CHOICES = [(CIRCLE, "circle"), (SQUARE, "square"), (ROW, "row")]

    meeting    = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="tables")
    label      = models.CharField(max_length=16)
    table_type = models.CharField(max_length=1, choices=TYPE_CHOICES)
    seats      = models.PositiveIntegerField(default=6)
    x          = models.IntegerField(default=20)
    y          = models.IntegerField(default=20)

    class Meta:
        unique_together = [("meeting", "label")]  # 同一会议内不重名

    def __str__(self): return f"{self.meeting.code}-{self.label}"

class Attendee(models.Model):
    meeting    = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="attendees",
        null=True, blank=True,      # ← 这两项先加上
    )
    full_name  = models.CharField(max_length=64)
    department = models.CharField(max_length=64, blank=True)
    position   = models.CharField(max_length=64, blank=True)
    note       = models.TextField(blank=True)


class Assignment(models.Model):
    # 这条可选：有它，查询更方便；没有也行（靠 table.meeting 也能关联）
    meeting    = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="assignments", null=True, blank=True)

    table      = models.ForeignKey(Table, on_delete=models.CASCADE, related_name="assignments")
    attendee   = models.ForeignKey(Attendee, on_delete=models.CASCADE, related_name="assignments")
    seat_index = models.PositiveIntegerField()   # ⭐ 前端要发 seat_index
    status     = models.CharField(max_length=16, default="assigned")

    class Meta:
        unique_together = [("table", "seat_index")]  # 一个座位只坐一个人

    def __str__(self): return f"{self.table}-{self.seat_index}"
