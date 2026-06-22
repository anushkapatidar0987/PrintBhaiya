from django.urls import path
from . import views

urlpatterns = [
    path('create-razorpay-order/', views.create_razorpay_order, name='create-razorpay-order'),
    path('verify/', views.verify_payment, name='verify-payment'),
    path('webhook/razorpay/', views.razorpay_webhook, name='razorpay-webhook'),
    path('<uuid:order_id>/status/', views.check_payment_status, name='check-payment-status'),
]
