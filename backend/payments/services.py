import logging
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from orders.models import Order
from .models import Payment

logger = logging.getLogger(__name__)


def _create_razorpay_order_internal(order):
    """Create a Razorpay order (or mock one in dev mode)."""
    amount_paise = int(order.total_amount * 100)

    if settings.RAZORPAY_MOCK_MODE:
        # Mock mode: generate fake Razorpay order ID
        mock_order_id = f'order_mock_{uuid.uuid4().hex[:16]}'
        return {
            'id': mock_order_id,
            'amount': amount_paise,
            'currency': 'INR',
            'status': 'created',
        }
    else:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        razorpay_order = client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': str(order.order_number),
            'notes': {
                'order_id': str(order.id),
                'student_id': str(order.student.id),
            }
        })
        return razorpay_order


def _verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """Verify Razorpay payment signature (or auto-pass in mock mode)."""
    if settings.RAZORPAY_MOCK_MODE:
        return True

    import razorpay
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
