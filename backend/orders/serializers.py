from rest_framework import serializers
from django.db import transaction

from .models import Order, OrderFile, OrderStatusHistory
from shops.models import Shop
from .services import calculate_order_price, generate_order_number


class PricePreviewSerializer(serializers.Serializer):
    shop_id = serializers.UUIDField()
    color_mode = serializers.ChoiceField(choices=Order.ColorMode.choices)
    page_count = serializers.IntegerField(min_value=1)
    copies = serializers.IntegerField(min_value=1, default=1)
    double_sided = serializers.BooleanField(default=False)
    binding_option_id = serializers.UUIDField(required=False, allow_null=True)


class PricePreviewResponseSerializer(serializers.Serializer):
    base_cost = serializers.FloatField()
    binding_cost = serializers.FloatField()
    platform_fee = serializers.FloatField()
    total = serializers.FloatField()
    rate_per_page = serializers.FloatField()


class OrderFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderFile
        fields = ('id', 'original_filename', 'file_type', 'file_size_bytes', 'file', 'file_url', 'created_at')


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = ('from_status', 'to_status', 'changed_by_name', 'note', 'created_at')


class OrderCreateSerializer(serializers.ModelSerializer):
    shop_id = serializers.UUIDField(write_only=True)
    files = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Order
        fields = (
            'id', 'order_number', 'status', 'shop_id', 'color_mode', 
            'page_count', 'copies', 'double_sided',
            'binding_option', 'student_comment', 'files'
        )
        read_only_fields = ('id', 'order_number', 'status')

    @transaction.atomic
    def create(self, validated_data):
        shop_id = validated_data.pop('shop_id')
        files = validated_data.pop('files', [])
        student = self.context['request'].user
        
        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            raise serializers.ValidationError({"shop_id": "Shop not found"})

        if not shop.can_receive_orders:
            raise serializers.ValidationError({"shop_id": "Shop is currently closed or not approved"})

        # Calculate price
        binding_opt_id = validated_data.get('binding_option').id if validated_data.get('binding_option') else None
        price_dict = calculate_order_price(
            shop=shop,
            color_mode=validated_data['color_mode'],
            page_count=validated_data['page_count'],
            copies=validated_data.get('copies', 1),
            double_sided=validated_data.get('double_sided', False),
            binding_option_id=binding_opt_id
        )

        order_number = generate_order_number()

        order = Order.objects.create(
            student=student,
            shop=shop,
            order_number=order_number,
            status=Order.Status.PENDING_PAYMENT,
            price_breakdown=price_dict,
            total_amount=price_dict['total'],
            platform_fee=price_dict['platform_fee'],
            **validated_data
        )

        # Handle file uploads (local for now)
        for f in files:
            OrderFile.objects.create(
                order=order,
                file=f,
                original_filename=f.name,
                file_type=f.name.split('.')[-1].lower() if '.' in f.name else 'unknown',
                file_size_bytes=f.size,
                file_url='' # Would be populated if using cloud storage
            )

        OrderStatusHistory.objects.create(
            order=order,
            to_status=Order.Status.PENDING_PAYMENT,
            note='Order created, awaiting payment'
        )

        return order


class OrderListSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    files = OrderFileSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'order_number', 'shop_name', 'student_name', 'status', 'color_mode', 
                  'page_count', 'copies', 'total_amount', 'created_at', 'files')


class OrderDetailSerializer(OrderListSerializer):
    files = OrderFileSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    shop_address = serializers.CharField(source='shop.address', read_only=True)
    student_phone = serializers.CharField(source='student.phone_number', read_only=True)

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + (
            'double_sided', 'binding_option', 'student_comment', 'shop_rejection_reason',
            'price_breakdown', 'platform_fee', 'collected_at', 'files', 'status_history',
            'shop_address', 'student_phone'
        )
