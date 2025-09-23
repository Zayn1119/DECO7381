from django.db import models

class TradeShow(models.Model):
    """A single tradeshow instance (group booths & exhibitors by meeting_id)."""
    meeting_id = models.CharField(max_length=32, unique=True)  # e.g. "T-20250906-1234"
    name = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tradeshow_show"
        ordering = ["-created_at"]

    def __str__(self):
        return self.meeting_id


class Booth(models.Model):
    """A physical/visual booth on canvas, rendered by (x,y,w,h)."""
    tradeshow = models.ForeignKey(TradeShow, on_delete=models.CASCADE, related_name="booths")
    label = models.CharField(max_length=20)       # e.g., "B1"
    x = models.IntegerField(default=20)
    y = models.IntegerField(default=20)
    width = models.IntegerField(default=140)
    height = models.IntegerField(default=90)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tradeshow_booth"
        constraints = [
            models.UniqueConstraint(fields=["tradeshow", "label"], name="uniq_booth_per_show")
        ]
        ordering = ["label"]

    def __str__(self):
        return f"{self.tradeshow.meeting_id}-{self.label}"


class Exhibitor(models.Model):
    """An exhibitor card that can be assigned to a booth."""
    tradeshow = models.ForeignKey(TradeShow, on_delete=models.CASCADE, related_name="exhibitors")
    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    tags = models.JSONField(default=list, blank=True)  # ["AI","Robotics"]
    booth = models.ForeignKey(Booth, null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="exhibitors")
    x = models.IntegerField(null=True, blank=True)
    y = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "tradeshow_exhibitor"
        indexes = [
            models.Index(fields=["tradeshow", "company"]),
            models.Index(fields=["booth"]),
        ]
        ordering = ["company", "name"]

    def __str__(self):
        return self.name
