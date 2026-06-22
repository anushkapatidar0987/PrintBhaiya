from django.contrib import admin
from .models import Order, OrderFile, OrderStatusHistory

class OrderFileInline(admin.TabularInline):
    model = OrderFile
    extra = 0
    readonly_fields = ('file_size_bytes', 'created_at')

class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ('from_status', 'to_status', 'changed_by', 'note', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'student', 'shop', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'color_mode', 'shop')
    search_fields = ('order_number', 'student__email', 'shop__name')
    readonly_fields = ('order_number', 'price_breakdown', 'created_at', 'updated_at', 'collected_at')
    inlines = [OrderFileInline, OrderStatusHistoryInline]

@admin.register(OrderFile)
class OrderFileAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'order', 'file_type', 'is_deleted', 'created_at')
    list_filter = ('file_type', 'is_deleted')
    search_fields = ('original_filename', 'order__order_number')

@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('order', 'from_status', 'to_status', 'changed_by', 'created_at')
    list_filter = ('to_status', 'created_at')
    search_fields = ('order__order_number',)
