import datetime
from decimal import Decimal
from .models import Order
from shops.models import BindingOption


def generate_order_number():
    """Format: PKB-YYYYMMDD-NNNN"""
    today = datetime.date.today()
    date_str = today.strftime('%Y%m%d')
    prefix = f'PKB-{date_str}-'
    
    # Get the latest order for today
    latest_order = Order.objects.filter(order_number__startswith=prefix).order_by('-order_number').first()
    
    if latest_order:
        last_num = int(latest_order.order_number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
        
    return f"{prefix}{new_num:04d}"


def calculate_order_price(shop, color_mode, page_count, copies, double_sided, binding_option_id=None):
    """
    Computes price server-side.
    Returns dict: base_cost, binding_cost, platform_fee, total, rate_per_page
    """
    price_list = shop.price_list
    
    # 1. Determine rate per page
    rate_per_page = price_list.color_rate_per_page if color_mode == Order.ColorMode.COLOR else price_list.bw_rate_per_page
    
    if double_sided and price_list.double_sided_supported:
        if price_list.double_sided_rate_per_page:
            rate_per_page = price_list.double_sided_rate_per_page
        else:
            rate_per_page = rate_per_page * Decimal('0.85')
            
    # 2. Base cost
    base_cost = Decimal(str(page_count)) * rate_per_page * Decimal(str(copies))
    
    # 3. Binding cost
    binding_cost = Decimal('0.00')
    if binding_option_id:
        try:
            binding_opt = BindingOption.objects.get(id=binding_option_id, shop=shop, is_active=True)
            binding_cost = binding_opt.price * Decimal(str(copies))
        except BindingOption.DoesNotExist:
            pass
            
    # 4. Platform fee (0 for now)
    platform_fee = Decimal('0.00')
    
    # 5. Total
    total = base_cost + binding_cost + platform_fee
    original_total = total
    discount_applied = Decimal('0.00')
    
    # Check if discount campaign is active
    from django.utils import timezone
    if getattr(shop, 'discount_ends_at', None) and shop.discount_ends_at > timezone.now() and getattr(shop, 'discount_percentage', 0) > 0:
        pct = Decimal(str(shop.discount_percentage))
        discount_factor = (Decimal('100') - pct) / Decimal('100')
        discount_applied = (base_cost + binding_cost) * (pct / Decimal('100'))
        
        base_cost = base_cost * discount_factor
        binding_cost = binding_cost * discount_factor
        total = base_cost + binding_cost + platform_fee
    
    # Check minimum order amount
    if price_list.minimum_order_amount and total < price_list.minimum_order_amount:
        total = price_list.minimum_order_amount
        
    return {
        'base_cost': float(base_cost),
        'binding_cost': float(binding_cost),
        'platform_fee': float(platform_fee),
        'total': float(total),
        'rate_per_page': float(rate_per_page),
        'original_total': float(original_total),
        'discount_applied': float(discount_applied)
    }


def validate_status_transition(current_status, new_status):
    """Check if a status transition is valid."""
    allowed = Order.VALID_TRANSITIONS.get(current_status, [])
    return new_status in allowed
