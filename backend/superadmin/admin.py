from django.contrib import admin
from .models import Notice, SupportTicket

@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'audience_type', 'created_at')
    list_filter = ('audience_type', 'created_at')
    search_fields = ('title', 'message')

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('category', 'email', 'phone_number', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('email', 'details')
