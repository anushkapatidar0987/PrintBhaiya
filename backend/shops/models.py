from django.db import models
from django.conf import settings
from django.utils.text import slugify
from core.models import BaseModel


class Shop(BaseModel):
    """Print shop profile linked to a SHOP_OWNER user."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        CLOSED = 'CLOSED', 'Closed'
        HOLIDAY = 'HOLIDAY', 'Holiday'

    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='shop',
        limit_choices_to={'role': 'SHOP_OWNER'},
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100, default='Indore', db_index=True)
    area = models.CharField(max_length=100, default='Vijay Nagar')
    contact_phone = models.CharField(max_length=15, blank=True)
    whatsapp_number = models.CharField(max_length=15, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CLOSED)
    status_updated_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False, help_text='Super Admin must approve before shop is visible')
    is_active = models.BooleanField(default=True, help_text='Soft-disable by admin')

    class Meta:
        db_table = 'shops'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['city', 'status', 'is_approved']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Shop.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'

    @property
    def can_receive_orders(self):
        return self.status == self.Status.OPEN and self.is_approved and self.is_active


class PriceList(BaseModel):
    """Pricing configuration for a shop."""
    shop = models.OneToOneField(Shop, on_delete=models.CASCADE, related_name='price_list')
    bw_rate_per_page = models.DecimalField(max_digits=8, decimal_places=2, help_text='Rate in INR per page for B&W')
    color_rate_per_page = models.DecimalField(max_digits=8, decimal_places=2, help_text='Rate in INR per page for Color')
    double_sided_supported = models.BooleanField(default=True)
    double_sided_rate_per_page = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text='If different from single-sided, otherwise uses same rate'
    )
    minimum_order_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'price_lists'

    def __str__(self):
        return f'Pricing for {self.shop.name}'


class BindingOption(BaseModel):
    """Binding options available at a shop."""
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='binding_options')
    name = models.CharField(max_length=100, help_text='e.g., Spiral Binding, Stapled, Hardcover')
    price = models.DecimalField(max_digits=8, decimal_places=2, help_text='Flat charge in INR')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'binding_options'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} @ ₹{self.price} ({self.shop.name})'


class ShopStatusLog(BaseModel):
    """Audit log for shop status changes."""
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='status_logs')
    status = models.CharField(max_length=10, choices=Shop.Status.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = 'shop_status_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.shop.name} → {self.status} at {self.created_at}'
