from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User
from shops.models import Shop, PriceList, BindingOption


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'role', 'campus_wing', 'date_joined')
        read_only_fields = fields


class StudentRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number', 'campus_wing', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.get('email')
        # Simple username logic since email is the real login identifier
        username = email.split('@')[0]
        
        user = User(
            **validated_data,
            username=username,
            role=User.Role.STUDENT
        )
        user.set_password(password)
        user.save()
        return user


class ShopRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    shop_name = serializers.CharField(write_only=True)
    shop_address = serializers.CharField(write_only=True)
    price_per_bw = serializers.DecimalField(max_digits=8, decimal_places=2, write_only=True)
    price_per_color = serializers.DecimalField(max_digits=8, decimal_places=2, write_only=True)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number', 'password', 
                  'shop_name', 'shop_address', 'price_per_bw', 'price_per_color')

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')
        shop_name = validated_data.pop('shop_name')
        shop_address = validated_data.pop('shop_address')
        price_per_bw = validated_data.pop('price_per_bw')
        price_per_color = validated_data.pop('price_per_color')
        
        email = validated_data.get('email')
        username = email.split('@')[0]

        # 1. Create User
        user = User(
            email=email,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            username=username,
            role=User.Role.SHOP_OWNER
        )
        user.set_password(password)
        user.save()

        # 2. Create Shop
        shop = Shop.objects.create(
            owner=user,
            name=shop_name,
            address=shop_address,
            contact_phone=user.phone_number
        )

        # 3. Create PriceList
        PriceList.objects.create(
            shop=shop,
            bw_rate_per_page=price_per_bw,
            color_rate_per_page=price_per_color
        )

        # 4. Create default Binding Options
        BindingOption.objects.create(shop=shop, name='Spiral Binding', price=30.00)
        BindingOption.objects.create(shop=shop, name='Stapled', price=5.00)

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
