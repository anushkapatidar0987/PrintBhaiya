from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    """Allow access only to users with STUDENT role."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'STUDENT'
        )


class IsShopOwner(BasePermission):
    """Allow access only to users with SHOP_OWNER role."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'SHOP_OWNER'
        )


class IsSuperAdmin(BasePermission):
    """Allow access only to users with SUPER_ADMIN role."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'SUPER_ADMIN'
        )


class IsStudentOrShopOwner(BasePermission):
    """Allow access to both STUDENT and SHOP_OWNER roles."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('STUDENT', 'SHOP_OWNER')
        )
