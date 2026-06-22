import json
import logging

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from orders.models import Order, OrderStatusHistory
from .models import Payment
from .services import _create_razorpay_order_internal, _verify_razorpay_signature

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    order_id = request.data.get('order_id')
    if not order_id:
        return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(id=order_id, student=request.user, status=Order.Status.PENDING_PAYMENT)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found or not pending payment'}, status=status.HTTP_404_NOT_FOUND)

    if hasattr(order, 'payment'):
        if order.payment.status == Payment.Status.CREATED:
            return Response({
                'razorpay_order_id': order.payment.razorpay_order_id,
                'amount': order.payment.amount_paise,
                'currency': order.payment.currency,
            })
        else:
             return Response({'error': 'Payment already processed'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rzp_order = _create_razorpay_order_internal(order)
        payment = Payment.objects.create(
            order=order,
            razorpay_order_id=rzp_order['id'],
            amount_paise=rzp_order['amount'],
            currency=rzp_order['currency']
        )
        return Response({
            'razorpay_order_id': payment.razorpay_order_id,
            'amount': payment.amount_paise,
            'currency': payment.currency,
        })
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {e}")
        return Response({'error': 'Failed to create payment gateway order'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_signature = request.data.get('razorpay_signature')

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response({'error': 'Missing payment parameters'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
        order = payment.order
    except Payment.DoesNotExist:
        return Response({'error': 'Payment record not found'}, status=status.HTTP_404_NOT_FOUND)

    if order.student != request.user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    if payment.status == Payment.Status.PAID:
        return Response({'message': 'Payment already verified'})

    is_valid = _verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    
    if is_valid:
        with transaction.atomic():
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature = razorpay_signature
            payment.status = Payment.Status.PAID
            payment.save()

            order.status = Order.Status.PLACED
            order.save()

            OrderStatusHistory.objects.create(
                order=order,
                from_status=Order.Status.PENDING_PAYMENT,
                to_status=Order.Status.PLACED,
                note='Payment verified successfully'
            )
        return Response({'message': 'Payment verified successfully'})
    else:
        with transaction.atomic():
            payment.status = Payment.Status.FAILED
            payment.save()
            order.status = Order.Status.PAYMENT_FAILED
            order.save()
            OrderStatusHistory.objects.create(
                order=order,
                from_status=Order.Status.PENDING_PAYMENT,
                to_status=Order.Status.PAYMENT_FAILED,
                note='Payment signature verification failed'
            )
        return Response({'error': 'Invalid payment signature'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    try:
        payload = json.loads(request.body)
        if payload.get('event') == 'payment.captured':
            payment_entity = payload['payload']['payment']['entity']
            order_id = payment_entity.get('order_id')
            payment_id = payment_entity.get('id')
            
            payment = Payment.objects.filter(razorpay_order_id=order_id).first()
            if payment and payment.status != Payment.Status.PAID:
                with transaction.atomic():
                    payment.status = Payment.Status.PAID
                    payment.razorpay_payment_id = payment_id
                    payment.raw_webhook_payload = payload
                    payment.save()

                    order = payment.order
                    order.status = Order.Status.PLACED
                    order.save()
                    
                    OrderStatusHistory.objects.create(
                        order=order,
                        to_status=Order.Status.PLACED,
                        note='Payment verified via webhook'
                    )
        return Response(status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return Response(status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_payment_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id, student=request.user)
        payment = order.payment
        return Response({
            'status': payment.status,
            'razorpay_payment_id': payment.razorpay_payment_id
        })
    except (Order.DoesNotExist, Payment.DoesNotExist):
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
