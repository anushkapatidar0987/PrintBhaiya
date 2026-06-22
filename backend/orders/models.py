from django.db import models
from django.conf import settings
from core.models import BaseModel


class Order(BaseModel):
    """Print order placed by a student at a shop."""

    class Status(models.TextChoices):
        PENDING_PAYMENT = 'PENDING_PAYMENT', 'Pending Payment'
        PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
        PLACED = 'PLACED', 'Placed'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
        PRINTING = 'PRINTING', 'Printing'
        READY = 'READY_FOR_COLLECTION', 'Ready for Collection'
        COLLECTED = 'COLLECTED', 'Collected'

    class ColorMode(models.TextChoices):
        BW = 'BW', 'Black & White'
        COLOR = 'COLOR', 'Color'

    # Valid state transitions: current_status -> [allowed_next_statuses]
    # Simplified: shopkeeper only updates twice (Accept → Ready)
    VALID_TRANSITIONS = {
        'PENDING_PAYMENT': ['PLACED', 'PAYMENT_FAILED'],
        'PAYMENT_FAILED': ['PENDING_PAYMENT'],  # retry
        'PLACED': ['ACCEPTED', 'REJECTED'],
        'ACCEPTED': ['READY_FOR_COLLECTION'],  # no PRINTING step
        'READY_FOR_COLLECTION': ['COLLECTED'],
        # Terminal states: REJECTED, COLLECTED — no transitions out
    }

    order_number = models.CharField(max_length=30, unique=True, db_index=True)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='orders',
        limit_choices_to={'role': 'STUDENT'},
    )
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.PROTECT, related_name='orders'
    )
    status = models.CharField(
        max_length=25, choices=Status.choices, default=Status.PENDING_PAYMENT
    )
    color_mode = models.CharField(max_length=10, choices=ColorMode.choices, default=ColorMode.BW)
    page_count = models.PositiveIntegerField(default=1)
    copies = models.PositiveIntegerField(default=1)
    double_sided = models.BooleanField(default=False)
    binding_option = models.ForeignKey(
        'shops.BindingOption', on_delete=models.SET_NULL, null=True, blank=True
    )
    student_comment = models.TextField(blank=True, default='')
    shop_rejection_reason = models.TextField(blank=True, null=True)
    price_breakdown = models.JSONField(
        default=dict, blank=True,
        help_text='Snapshot of price calculation at order time'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    collected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shop', 'status']),
            models.Index(fields=['student']),
        ]

    def __str__(self):
        return f'{self.order_number} - {self.get_status_display()}'

    def can_transition_to(self, new_status):
        """Check if a status transition is valid."""
        allowed = self.VALID_TRANSITIONS.get(self.status, [])
        return new_status in allowed


class OrderFile(BaseModel):
    """Uploaded file attached to an order."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='order_files/%Y/%m/%d/')
    file_url = models.URLField(blank=True, help_text='Remote URL if using cloud storage')
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, help_text='pdf, docx, jpg, png')
    file_size_bytes = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete for retention cleanup')

    class Meta:
        db_table = 'order_files'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.order.order_number})'


class OrderStatusHistory(BaseModel):
    """Audit trail for every order status transition."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=25, blank=True, null=True)
    to_status = models.CharField(max_length=25)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    note = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'order_status_history'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order.order_number}: {self.from_status} → {self.to_status}'
