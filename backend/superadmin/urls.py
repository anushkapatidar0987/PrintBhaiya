from django.urls import path
from . import views

urlpatterns = [
    path('shops/pending/', views.PendingShopsView.as_view(), name='pending-shops'),
    path('shops/all/', views.SuperAdminShopListView.as_view(), name='admin-shops-list-all'),
    path('shops/<uuid:id>/approve/', views.ApproveShopView.as_view(), name='approve-shop'),
    path('analytics/', views.PlatformAnalyticsView.as_view(), name='platform-analytics'),
    path('orders/', views.AllOrdersView.as_view(), name='all-orders'),
    
    # Broadcasts / Notices
    path('notices/', views.NoticeListCreateView.as_view(), name='notice-list-create'),
    path('notices/feed/', views.StudentNoticeListView.as_view(), name='notice-feed'),
    
    # Shop Controls & History
    path('shops/<uuid:id>/status-history/', views.ShopStatusHistoryView.as_view(), name='shop-status-history'),
    path('shops/<uuid:id>/toggle-active/', views.ToggleShopActiveView.as_view(), name='shop-toggle-active'),
    
    # Users list
    path('users/', views.UsersListView.as_view(), name='admin-users-list'),
    
    # Exports
    path('export-users/', views.ExportUsersCSVView.as_view(), name='export-users-csv'),
    
    # Support
    path('support-ticket/', views.CreateSupportTicketView.as_view(), name='create-support-ticket'),
]
