from rest_framework import serializers
from .models import Shop, PriceList, BindingOption


class BindingOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BindingOption
        fields = ('id', 'name', 'price', 'is_active')


class PriceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceList
        fields = ('bw_rate_per_page', 'color_rate_per_page', 'double_sided_supported',
                  'double_sided_rate_per_page', 'minimum_order_amount')


class PriceListUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceList
        fields = ('bw_rate_per_page', 'color_rate_per_page', 'double_sided_supported',
                  'double_sided_rate_per_page', 'minimum_order_amount')


class ShopListSerializer(serializers.ModelSerializer):
    price_list = PriceListSerializer(read_only=True)
    binding_options = serializers.SerializerMethodField()
    is_discount_active = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = ('id', 'name', 'slug', 'address', 'city', 'area', 'status', 
                  'is_approved', 'is_active', 'price_list', 'binding_options',
                  'discount_percentage', 'discount_ends_at', 'is_discount_active')

    def get_binding_options(self, obj):
        active_options = obj.binding_options.filter(is_active=True)
        return BindingOptionSerializer(active_options, many=True).data

    def get_is_discount_active(self, obj):
        from django.utils import timezone
        return bool(obj.discount_ends_at and obj.discount_ends_at > timezone.now())


class ShopDetailSerializer(ShopListSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta(ShopListSerializer.Meta):
        fields = ShopListSerializer.Meta.fields + ('contact_phone', 'whatsapp_number', 'owner_name')


import re

class ShopUpdateSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(write_only=True, required=True, allow_blank=False)
    name = serializers.CharField(required=True, allow_blank=False)
    contact_phone = serializers.CharField(required=True, allow_blank=False)

    is_active = serializers.BooleanField(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Shop
        fields = ('name', 'address', 'contact_phone', 'whatsapp_number', 'owner_name', 'is_active', 'is_approved', 'status')

    def validate_owner_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Owner name is required.")
        if not re.match(r'^[a-zA-Z\s]+$', value):
            raise serializers.ValidationError("Owner name can only contain letters and spaces.")
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Owner name must be at least 3 characters long.")
        return value

    def validate_contact_phone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Contact phone number is required.")
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Contact number must be exactly 10 digits.")
        return value

    def validate_whatsapp_number(self, value):
        if value:
            if not re.match(r'^\d{10}$', value):
                raise serializers.ValidationError("WhatsApp number must be exactly 10 digits.")
        return value

    def update(self, instance, validated_data):
        owner_name = validated_data.pop('owner_name', None)
        if owner_name:
            name_parts = owner_name.strip().split(' ', 1)
            instance.owner.first_name = name_parts[0]
            instance.owner.last_name = name_parts[1] if len(name_parts) > 1 else ''
            instance.owner.save()
        return super().update(instance, validated_data)


class ShopStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ('status',)
