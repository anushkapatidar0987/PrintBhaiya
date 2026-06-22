from django.db import models
from django.conf import settings
from core.models import BaseModel


class NotificationLog(BaseModel):
    """Log of all notifications sent across channels."""

    class Channel(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        WHATSAPP = 'WHATSAPP', 'WhatsApp'
        IN_APP = 'IN_APP', 'In-App'

    class NotifStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_logs'
    )
    order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True
    )
    channel = models.CharField(max_length=10, choices=Channel.choices)
    event_type = models.CharField(max_length=50, help_text='e.g. ORDER_PLACED, ORDER_READY')
    status = models.CharField(max_length=10, choices=NotifStatus.choices, default=NotifStatus.PENDING)
    provider_response = models.JSONField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notification_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'created_at']),
        ]

    def __str__(self):
        return f'{self.event_type} → {self.recipient} via {self.channel}'


class InAppNotification(BaseModel):
    """In-app notification for the user's notification feed."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='in_app_notifications'
    )
    order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True
    )
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = 'in_app_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{"✓" if self.is_read else "●"} {self.message[:50]}'
