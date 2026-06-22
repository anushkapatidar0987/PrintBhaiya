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

    class Meta:
        model = Shop
        fields = ('id', 'name', 'slug', 'address', 'city', 'area', 'status', 
                  'is_approved', 'price_list', 'binding_options')

    def get_binding_options(self, obj):
        active_options = obj.binding_options.filter(is_active=True)
        return BindingOptionSerializer(active_options, many=True).data


class ShopDetailSerializer(ShopListSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta(ShopListSerializer.Meta):
        fields = ShopListSerializer.Meta.fields + ('contact_phone', 'whatsapp_number', 'owner_name')


class ShopUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ('name', 'address', 'contact_phone', 'whatsapp_number')


class ShopStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ('status',)
