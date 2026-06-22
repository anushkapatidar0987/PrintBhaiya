from django.urls import path
from . import views

urlpatterns = [
    path('shops/pending/', views.PendingShopsView.as_view(), name='pending-shops'),
    path('shops/<uuid:id>/approve/', views.ApproveShopView.as_view(), name='approve-shop'),
    path('analytics/', views.PlatformAnalyticsView.as_view(), name='platform-analytics'),
    path('orders/', views.AllOrdersView.as_view(), name='all-orders'),
]
