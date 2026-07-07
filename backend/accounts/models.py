import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with UUID PK, email-based login, and role field."""

    class Role(models.TextChoices):
        STUDENT = 'STUDENT', 'Student'
        SHOP_OWNER = 'SHOP_OWNER', 'Shop Owner'
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, help_text='Indian format with +91 prefix')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    is_email_verified = models.BooleanField(default=False)
    campus_wing = models.CharField(max_length=100, blank=True, null=True, help_text='Campus wing / Location for filtering')

    # Use email as the login identifier instead of username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'phone_number']

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.get_full_name() or self.email} ({self.role})'

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def is_shop_owner(self):
        return self.role == self.Role.SHOP_OWNER

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN
