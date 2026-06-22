import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from shops.models import Shop, PriceList, BindingOption

class Command(BaseCommand):
    help = 'Seeds the database with initial users and shops for testing.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Super Admin
        if not User.objects.filter(email='admin@printkardobhaiya.com').exists():
            admin = User.objects.create_superuser(
                email='admin@printkardobhaiya.com',
                password='adminpassword',
                username='admin',
                first_name='Super',
                last_name='Admin',
                role=User.Role.SUPER_ADMIN,
                phone_number='+910000000000',
                is_email_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created Super Admin (admin@printkardobhaiya.com / adminpassword)'))

        # 2. Sai Zerox (Shop Owner)
        if not User.objects.filter(email='saizerox@example.com').exists():
            sai_owner = User.objects.create_user(
                email='saizerox@example.com',
                password='password123',
                username='saizerox',
                first_name='Sai',
                last_name='Zerox',
                role=User.Role.SHOP_OWNER,
                phone_number='+919876543210',
                is_email_verified=True
            )
            
            shop = Shop.objects.create(
                owner=sai_owner,
                name='Sai Zerox',
                address='123 University Road, Near Main Gate',
                city='Indore',
                area='University Campus',
                contact_phone='+919876543210',
                whatsapp_number='+919876543210',
                is_approved=True,
                status=Shop.Status.OPEN
            )
            
            PriceList.objects.create(
                shop=shop,
                bw_rate_per_page=2.00,
                color_rate_per_page=10.00,
                double_sided_supported=True,
                double_sided_rate_per_page=1.50,
                minimum_order_amount=10.00
            )
            
            BindingOption.objects.create(shop=shop, name='Spiral Binding', price=30.00)
            BindingOption.objects.create(shop=shop, name='Hardbound', price=100.00)
            
            self.stdout.write(self.style.SUCCESS('Created Shop Owner Sai Zerox (saizerox@example.com / password123)'))

        # 3. Test Student
        if not User.objects.filter(email='student@example.com').exists():
            User.objects.create_user(
                email='student@example.com',
                password='password123',
                username='student',
                first_name='Test',
                last_name='Student',
                role=User.Role.STUDENT,
                phone_number='+919998887776',
                is_email_verified=True
            )
            self.stdout.write(self.style.SUCCESS('Created Test Student (student@example.com / password123)'))

        self.stdout.write(self.style.SUCCESS('Database seeding completed!'))
