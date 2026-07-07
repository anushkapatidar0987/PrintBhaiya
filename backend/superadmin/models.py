from django.db import models
from django.conf import settings
from core.models import BaseModel

class Notice(BaseModel):
    class Audience(models.TextChoices):
        ALL = 'ALL', 'Everyone'
        STUDENTS = 'STUDENTS', 'Students Only'
        SHOPKEEPERS = 'SHOPKEEPERS', 'Shopkeepers Only'
        SPECIFIC = 'SPECIFIC', 'Specific Users'
        
    title = models.CharField(max_length=200)
    message = models.TextField()  # Markdown supported
    audience_type = models.CharField(max_length=15, choices=Audience.choices, default=Audience.ALL)
    recipients = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='notices')

    class Meta:
        db_table = 'notices'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class SupportTicket(BaseModel):
    class Category(models.TextChoices):
        PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
        PRINT_QUALITY = 'PRINT_QUALITY', 'Print Quality Issue'
        BEHAVIOR = 'BEHAVIOR', 'Shopkeeper Behavior'
        DELAY = 'DELAY', 'Delay'
        OTHER = 'OTHER', 'Other'

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    category = models.CharField(max_length=25, choices=Category.choices)
    email = models.EmailField()
    phone_number = models.CharField(max_length=15)
    details = models.TextField()
    attachment = models.FileField(upload_to='support_attachments/', null=True, blank=True)

    class Meta:
        db_table = 'support_tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.category} - {self.student.email}'
