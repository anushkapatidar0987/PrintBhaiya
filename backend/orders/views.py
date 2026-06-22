from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction

from shops.models import Shop
from .models import Order, OrderStatusHistory
from .serializers import (
    PricePreviewSerializer, PricePreviewResponseSerializer,
    OrderCreateSerializer, OrderListSerializer, OrderDetailSerializer
)
from .services import calculate_order_price, validate_status_transition
from core.permissions import IsStudent, IsShopOwner, IsStudentOrShopOwner


class PricePreviewView(APIView):
    """Preview price before order creation."""
    permission_classes = [IsStudent]

    def post(self, request, *args, **kwargs):
        serializer = PricePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        shop = get_object_or_404(Shop, id=data['shop_id'])
        
        price_dict = calculate_order_price(
            shop=shop,
            color_mode=data['color_mode'],
            page_count=data['page_count'],
            copies=data['copies'],
            double_sided=data['double_sided'],
            binding_option_id=data.get('binding_option_id')
        )
        
        response_serializer = PricePreviewResponseSerializer(data=price_dict)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.data)


class OrderCreateView(generics.CreateAPIView):
    """Create a new order (PENDING_PAYMENT)."""
    permission_classes = [IsStudent]
    serializer_class = OrderCreateSerializer


class StudentOrderListView(generics.ListAPIView):
    """List orders for the logged-in student."""
    permission_classes = [IsStudent]
    serializer_class = OrderListSerializer

    def get_queryset(self):
        return Order.objects.filter(student=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    """Get order details (for student or shop owner)."""
    permission_classes = [IsStudentOrShopOwner]
    serializer_class = OrderDetailSerializer
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if user.is_student:
            return Order.objects.filter(student=user)
        elif user.is_shop_owner:
            return Order.objects.filter(shop__owner=user)
        return Order.objects.none()


class ShopOrderListView(generics.ListAPIView):
    """List orders for the logged-in shop owner."""
    permission_classes = [IsShopOwner]
    serializer_class = OrderListSerializer

    def get_queryset(self):
        queryset = Order.objects.filter(shop__owner=self.request.user)
        status_param = self.request.query_params.get('status')
        if status_param:
            # Handle multiple statuses like ?status=ACCEPTED,PRINTING
            statuses = status_param.split(',')
            queryset = queryset.filter(status__in=statuses)
        return queryset


class BaseStatusChangeView(APIView):
    permission_classes = [IsShopOwner]

    def perform_status_change(self, order, new_status, note='', extra_updates=None):
        if order.shop.owner != self.request.user:
            return Response({"error": "You do not own this order's shop"}, status=status.HTTP_403_FORBIDDEN)
            
        if not validate_status_transition(order.status, new_status):
            return Response(
                {"error": f"Invalid transition from {order.status} to {new_status}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            old_status = order.status
            order.status = new_status
            if extra_updates:
                for k, v in extra_updates.items():
                    setattr(order, k, v)
            order.save()

            OrderStatusHistory.objects.create(
                order=order,
                from_status=old_status,
                to_status=new_status,
                changed_by=self.request.user,
                note=note
            )
            
        serializer = OrderDetailSerializer(order)
        return Response(serializer.data)


class AcceptOrderView(BaseStatusChangeView):
    def patch(self, request, id):
        order = get_object_or_404(Order, id=id)
        return self.perform_status_change(order, Order.Status.ACCEPTED, note="Order accepted by shop")


class RejectOrderView(BaseStatusChangeView):
    def patch(self, request, id):
        order = get_object_or_404(Order, id=id)
        reason = request.data.get('reason', '')
        if not reason:
            return Response({"error": "Rejection reason is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        return self.perform_status_change(
            order, 
            Order.Status.REJECTED, 
            note=f"Rejected: {reason}",
            extra_updates={'shop_rejection_reason': reason}
        )


class MarkReadyView(BaseStatusChangeView):
    def patch(self, request, id):
        order = get_object_or_404(Order, id=id)
        return self.perform_status_change(order, Order.Status.READY, note="Order is ready for collection")


class MarkCollectedView(BaseStatusChangeView):
    def patch(self, request, id):
        order = get_object_or_404(Order, id=id)
        return self.perform_status_change(
            order, 
            Order.Status.COLLECTED, 
            note="Order collected by student",
            extra_updates={'collected_at': timezone.now()}
        )
