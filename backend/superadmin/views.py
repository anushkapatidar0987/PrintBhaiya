from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Sum

from core.permissions import IsSuperAdmin
from shops.models import Shop
from orders.models import Order
from accounts.models import User
from shops.serializers import ShopListSerializer
from orders.serializers import OrderListSerializer


class PendingShopsView(generics.ListAPIView):
    """List all shops pending approval."""
    permission_classes = [IsSuperAdmin]
    serializer_class = ShopListSerializer

    def get_queryset(self):
        return Shop.objects.filter(is_approved=False)


class ApproveShopView(APIView):
    """Approve a pending shop."""
    permission_classes = [IsSuperAdmin]

    def patch(self, request, id):
        shop = get_object_or_404(Shop, id=id)
        if shop.is_approved:
            return Response({'message': 'Shop is already approved'})
            
        shop.is_approved = True
        shop.save()
        return Response({'message': f'Shop {shop.name} approved successfully'})


class PlatformAnalyticsView(APIView):
    """Basic platform analytics for the dashboard."""
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_students = User.objects.filter(role=User.Role.STUDENT).count()
        total_shops = Shop.objects.filter(is_approved=True).count()
        
        order_stats = Order.objects.aggregate(
            total_orders=Count('id'),
            total_revenue=Sum('total_amount'),
            total_platform_fee=Sum('platform_fee')
        )
        
        # Pending action items
        pending_shops = Shop.objects.filter(is_approved=False).count()
        
        return Response({
            'users': {
                'total_students': total_students,
                'approved_shops': total_shops,
                'pending_shop_approvals': pending_shops
            },
            'orders': {
                'total_orders': order_stats['total_orders'] or 0,
                'total_revenue': float(order_stats['total_revenue'] or 0),
                'total_platform_fee': float(order_stats['total_platform_fee'] or 0)
            }
        })


class AllOrdersView(generics.ListAPIView):
    """List all platform orders for the admin."""
    permission_classes = [IsSuperAdmin]
    serializer_class = OrderListSerializer
    queryset = Order.objects.all().order_by('-created_at')
