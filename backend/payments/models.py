from django.db import models
from core.models import BaseModel


class Payment(BaseModel):
    """Razorpay payment linked to an order."""

    class Status(models.TextChoices):
        CREATED = 'CREATED', 'Created'
        PAID = 'PAID', 'Paid'
        FAILED = 'FAILED', 'Failed'
        REFUND_INITIATED = 'REFUND_INITIATED', 'Refund Initiated'
        REFUNDED = 'REFUNDED', 'Refunded'

    order = models.OneToOneField(
        'orders.Order', on_delete=models.PROTECT, related_name='payment'
    )
    razorpay_order_id = models.CharField(max_length=100, blank=True, default='')
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    amount_paise = models.PositiveIntegerField(help_text='Amount in paise (INR × 100)')
    currency = models.CharField(max_length=3, default='INR')
    raw_webhook_payload = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f'Payment {self.razorpay_order_id} - {self.get_status_display()}'
