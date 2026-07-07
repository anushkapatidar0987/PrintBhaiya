from django.utils import timezone
from rest_framework import serializers
from .models import Notice, SupportTicket
from shops.models import ShopStatusLog
from orders.models import OrderStatusHistory

class NoticeSerializer(serializers.ModelSerializer):
    recipient_details = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = ('id', 'title', 'message', 'audience_type', 'recipients', 'recipient_details', 'created_at')

    def get_recipient_details(self, obj):
        return [{'id': u.id, 'email': u.email, 'name': u.get_full_name()} for u in obj.recipients.all()]


class SupportTicketSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)

    class Meta:
        model = SupportTicket
        fields = ('id', 'student', 'student_name', 'category', 'email', 'phone_number', 'details', 'attachment', 'created_at')
        read_only_fields = ('student',)


class ShopStatusLogSerializer(serializers.ModelSerializer):
    accepted_orders_count = serializers.SerializerMethodField()
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ShopStatusLog
        fields = ('id', 'status', 'changed_by', 'changed_by_name', 'created_at', 'accepted_orders_count')

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return 'System'

    def get_accepted_orders_count(self, obj):
        start_time = obj.created_at
        next_log = ShopStatusLog.objects.filter(
            shop=obj.shop,
            created_at__gt=obj.created_at
        ).order_by('created_at').first()
        
        end_time = next_log.created_at if next_log else timezone.now()
        
        return OrderStatusHistory.objects.filter(
            order__shop=obj.shop,
            to_status='ACCEPTED',
            created_at__range=(start_time, end_time)
        ).count()
