from django.urls import path
from . import views

urlpatterns = [
    path('calculate-price/', views.PricePreviewView.as_view(), name='price-preview'),
    path('', views.OrderCreateView.as_view(), name='order-create'),
    path('student/', views.StudentOrderListView.as_view(), name='student-order-list'),
    path('shop-orders/', views.ShopOrderListView.as_view(), name='shop-order-list'),
    path('<uuid:id>/', views.OrderDetailView.as_view(), name='order-detail'),
    
    # Status changes
    path('<uuid:id>/accept/', views.AcceptOrderView.as_view(), name='order-accept'),
    path('<uuid:id>/reject/', views.RejectOrderView.as_view(), name='order-reject'),
    path('<uuid:id>/mark-ready/', views.MarkReadyView.as_view(), name='order-mark-ready'),
    path('<uuid:id>/mark-collected/', views.MarkCollectedView.as_view(), name='order-mark-collected'),
]
