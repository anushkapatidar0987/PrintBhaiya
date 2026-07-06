from accounts.models import User
from shops.models import Shop, PriceList, BindingOption

def create_user(email, name, role, password='password123'):
    if not User.objects.filter(email=email).exists():
        username = email.split('@')[0]
        user = User.objects.create_user(username=username, email=email, password=password)
        user.name = name
        user.role = role
        user.save()
        return user
    return User.objects.get(email=email)

# Super Admin
admin = create_user('admin@test.com', 'Admin User', 'admin')
admin.is_staff = True
admin.is_superuser = True
admin.save()

# Student
student = create_user('student@test.com', 'Student User', 'student')

# Shop Owner
shop_owner = create_user('shop@test.com', 'Shop User', 'shopkeeper')
if not hasattr(shop_owner, 'shop'):
    shop = Shop.objects.create(
        owner=shop_owner,
        name='Test Shop',
        slug='test-shop',
        address='123 Test St',
        city='Test City',
        area='Test Area',
        contact_phone='1234567890',
        status='OPEN',
        is_approved=True
    )
    PriceList.objects.create(
        shop=shop,
        bw_rate_per_page=1.5,
        color_rate_per_page=5.0,
        double_sided_supported=True,
        double_sided_rate_per_page=2.0
    )
    BindingOption.objects.create(shop=shop, name='Spiral', price=30.0)

print("Test users created successfully!")
