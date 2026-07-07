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
from core.permissions import IsStudent, IsShopOwner, IsStudentOrShopOwner, IsStudentOrShopOwnerOrSuperAdmin


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

            # Auto-generate receipt immediately when transitioning to COLLECTED
            if new_status == Order.Status.COLLECTED:
                from .models import Receipt
                import random
                import string
                
                # Check if receipt already exists
                if not hasattr(order, 'receipt'):
                    # Generate a unique receipt number: RCP-YYYYMMDD-XXXXXX
                    today_str = timezone.now().strftime('%Y%m%d')
                    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    rcp_number = f"RCP-{today_str}-{random_suffix}"
                    
                    # Get transaction reference if payment exists
                    tx_ref = getattr(order.payment, 'razorpay_payment_id', None) if hasattr(order, 'payment') else None
                    
                    # Create data snapshot
                    receipt_data = {
                        'order_id': str(order.id),
                        'order_number': order.order_number,
                        'student_name': order.student.get_full_name() or order.student.username,
                        'student_email': order.student.email,
                        'shop_name': order.shop.name,
                        'shop_address': order.shop.address,
                        'color_mode': order.color_mode,
                        'page_count': order.page_count,
                        'copies': order.copies,
                        'double_sided': order.double_sided,
                        'binding_option': order.binding_option.name if order.binding_option else 'Loose sheets',
                        'price_breakdown': order.price_breakdown,
                        'total_amount': float(order.total_amount),
                        'timestamp': timezone.now().isoformat()
                    }
                    
                    Receipt.objects.create(
                        order=order,
                        receipt_number=rcp_number,
                        transaction_reference=tx_ref,
                        data=receipt_data
                    )
            
        serializer = OrderDetailSerializer(order)
        return Response(serializer.data)


class AcceptOrderView(BaseStatusChangeView):
    def patch(self, request, id):
        order = get_object_or_404(Order, id=id)
        return self.perform_status_change(order, Order.Status.PENDING_PAYMENT, note="Order accepted by shop, awaiting payment")


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
        
        verification_code = request.data.get('verification_code') or request.data.get('code')
        if not verification_code:
            return Response({"error": "Handover verification code is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        code_str = str(verification_code).strip()
        last_4_order_num = order.order_number[-4:] if order.order_number else ""
        uuid_str = str(order.id).replace('-', '')
        last_4_uuid = uuid_str[-4:]
        last_4_raw_uuid = str(order.id)[-4:]

        if code_str not in (last_4_order_num, last_4_uuid, last_4_raw_uuid):
            return Response({"error": "Invalid verification code. Secure handover check failed."}, status=status.HTTP_400_BAD_REQUEST)

        return self.perform_status_change(
            order, 
            Order.Status.COLLECTED, 
            note="Order collected by student (Securely verified)",
            extra_updates={'collected_at': timezone.now()}
        )


class HandleOrderTimeoutView(APIView):
    permission_classes = [IsStudent]
    
    def post(self, request, id):
        order = get_object_or_404(Order, id=id, student=request.user)
        action = request.data.get('action')
        
        if order.status != Order.Status.PLACED:
            return Response({"error": "Order is not in pending state"}, status=status.HTTP_400_BAD_REQUEST)
            
        delta = timezone.now() - order.created_at
        if delta.total_seconds() <= 720:  # 12 minutes
            return Response({"error": "Order has not timed out yet"}, status=status.HTTP_400_BAD_REQUEST)
            
        if action == 'cancel':
            with transaction.atomic():
                old_status = order.status
                order.status = Order.Status.REJECTED
                order.shop_rejection_reason = "Order timed out under SLA. Refund processed."
                order.save()
                
                OrderStatusHistory.objects.create(
                    order=order,
                    from_status=old_status,
                    to_status=Order.Status.REJECTED,
                    changed_by=request.user,
                    note="Auto-cancelled via student SLA timeout handler."
                )
            return Response({"message": "Order cancelled and refund processed.", "status": "REJECTED"})
            
        elif action == 'change_shop':
            new_shop_id = request.data.get('new_shop_id')
            if not new_shop_id:
                return Response({"error": "New shop ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            new_shop = get_object_or_404(Shop, id=new_shop_id)
            if not new_shop.can_receive_orders:
                return Response({"error": "Selected shop is not open or active"}, status=status.HTTP_400_BAD_REQUEST)
                
            with transaction.atomic():
                old_status = order.status
                order.shop = new_shop
                order.created_at = timezone.now()
                order.save()
                
                OrderStatusHistory.objects.create(
                    order=order,
                    from_status=old_status,
                    to_status=Order.Status.PLACED,
                    changed_by=request.user,
                    note=f"Transferred to new shop: {new_shop.name}"
                )
            return Response({"message": "Order transferred to new shop successfully.", "status": "PLACED"})
            
        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class DownloadReceiptView(APIView):
    """Retrieve and download receipt for a collected order."""
    permission_classes = [IsStudentOrShopOwnerOrSuperAdmin]
    
    def get(self, request, id):
        order = get_object_or_404(Order, id=id)
        
        # Check permissions
        if request.user.role == 'STUDENT' and order.student != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'SHOP_OWNER' and order.shop.owner != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            receipt = order.receipt
        except Exception:
            return Response({"error": "Receipt not generated yet. Order must be collected."}, status=status.HTTP_404_NOT_FOUND)
            
        return Response(receipt.data)
