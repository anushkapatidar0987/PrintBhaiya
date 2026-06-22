from django.urls import path
from . import views

urlpatterns = [
    path('', views.ShopListView.as_view(), name='shop-list'),
    path('<uuid:id>/', views.ShopDetailView.as_view(), name='shop-detail'),
    path('me', views.MyShopView.as_view(), name='my-shop'),
    path('me/', views.MyShopUpdateView.as_view(), name='my-shop-update'),
    path('me/status/', views.MyShopStatusView.as_view(), name='my-shop-status'),
    path('me/price-list/', views.MyShopPriceListView.as_view(), name='my-shop-price-list'),
]
