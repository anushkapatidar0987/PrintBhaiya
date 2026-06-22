from django.contrib import admin
from .models import Shop, PriceList, BindingOption, ShopStatusLog

class PriceListInline(admin.StackedInline):
    model = PriceList
    can_delete = False

class BindingOptionInline(admin.TabularInline):
    model = BindingOption
    extra = 1

@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'city', 'status', 'is_approved', 'is_active', 'created_at')
    list_filter = ('status', 'is_approved', 'is_active', 'city')
    search_fields = ('name', 'owner__email', 'city', 'area')
    inlines = [PriceListInline, BindingOptionInline]
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('status_updated_at',)

@admin.register(ShopStatusLog)
class ShopStatusLogAdmin(admin.ModelAdmin):
    list_display = ('shop', 'status', 'changed_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('shop__name',)
    readonly_fields = ('created_at',)
