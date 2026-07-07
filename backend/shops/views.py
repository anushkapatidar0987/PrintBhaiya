from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Shop, PriceList, BindingOption, ShopStatusLog
from .serializers import (
    ShopListSerializer, ShopDetailSerializer, ShopUpdateSerializer,
    ShopStatusSerializer, PriceListUpdateSerializer, BindingOptionSerializer
)
from core.permissions import IsShopOwner

class ShopListView(generics.ListAPIView):
    """Public listing of approved shops."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ShopListSerializer

    def get_queryset(self):
        queryset = Shop.objects.filter(is_approved=True, is_active=True)
        city = self.request.query_params.get('city')
        area = self.request.query_params.get('area')
        shop_status = self.request.query_params.get('status')
        
        if city:
            queryset = queryset.filter(city__icontains=city)
        if area:
            queryset = queryset.filter(area__icontains=area)
        if shop_status:
            queryset = queryset.filter(status=shop_status)
            
        return queryset


class ShopDetailView(generics.RetrieveAPIView):
    """Public detail view for a shop."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ShopDetailSerializer
    queryset = Shop.objects.filter(is_approved=True, is_active=True)
    lookup_field = 'id'


class MyShopView(generics.RetrieveAPIView):
    """Get the currently logged in shop owner's shop."""
    permission_classes = [IsShopOwner]
    serializer_class = ShopDetailSerializer

    def get_object(self):
        return get_object_or_404(Shop, owner=self.request.user)


class MyShopUpdateView(generics.UpdateAPIView):
    """Update shop details (name, address, etc)."""
    permission_classes = [IsShopOwner]
    serializer_class = ShopUpdateSerializer

    def get_object(self):
        return get_object_or_404(Shop, owner=self.request.user)


class MyShopStatusView(generics.UpdateAPIView):
    """Toggle shop status (OPEN/CLOSED/HOLIDAY)."""
    permission_classes = [IsShopOwner]
    serializer_class = ShopStatusSerializer

    def get_object(self):
        return get_object_or_404(Shop, owner=self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        shop = self.get_object()
        new_status = serializer.validated_data.get('status')
        if not shop.is_active and new_status == Shop.Status.OPEN:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Your shop is currently unlisted by the administrator. You cannot set the status to Open.")
            
        shop = serializer.save()
        # Log the status change
        ShopStatusLog.objects.create(
            shop=shop,
            status=shop.status,
            changed_by=self.request.user
        )


class MyShopPriceListView(generics.UpdateAPIView):
    """Update pricing for the shop."""
    permission_classes = [IsShopOwner]
    serializer_class = PriceListUpdateSerializer

    def get_object(self):
        shop = get_object_or_404(Shop, owner=self.request.user)
        return get_object_or_404(PriceList, shop=shop)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        # Update PriceList
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Update Binding Options if provided in request
        binding_options_data = request.data.get('binding_options')
        shop = instance.shop
        if binding_options_data is not None:
            # For simplicity, update existing by ID, or create new ones
            for opt_data in binding_options_data:
                opt_id = opt_data.get('id')
                if opt_id:
                    # Update existing
                    BindingOption.objects.filter(id=opt_id, shop=shop).update(
                        name=opt_data.get('name', 'Binding'),
                        price=opt_data.get('price', 0),
                        is_active=opt_data.get('is_active', True)
                    )
                else:
                    # Create new
                    BindingOption.objects.create(
                        shop=shop,
                        name=opt_data.get('name', 'New Binding'),
                        price=opt_data.get('price', 0)
                    )

        # Update Discount campaign if provided
        discount_percentage = request.data.get('discount_percentage')
        discount_hours = request.data.get('discount_hours')
        if discount_percentage is not None:
            from decimal import Decimal
            try:
                shop.discount_percentage = Decimal(str(discount_percentage))
                if discount_hours and float(discount_hours) > 0:
                    from datetime import timedelta
                    shop.discount_ends_at = timezone.now() + timedelta(hours=float(discount_hours))
                else:
                    shop.discount_ends_at = None
                shop.save()
            except Exception as e:
                print("Failed to save discount campaign info", e)

        # Re-fetch full shop details to return
        return Response(ShopDetailSerializer(shop).data)
