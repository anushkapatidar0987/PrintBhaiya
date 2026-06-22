from django.contrib import admin
from .models import NotificationLog, InAppNotification

@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'event_type', 'channel', 'status', 'created_at')
    list_filter = ('event_type', 'channel', 'status', 'created_at')
    search_fields = ('recipient__email', 'recipient__phone_number', 'order__order_number')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(InAppNotification)
class InAppNotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'order', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__email', 'message')
    readonly_fields = ('created_at', 'updated_at')
