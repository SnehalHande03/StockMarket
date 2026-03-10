from django.contrib import admin
from django.contrib.auth import get_user_model

Staff = get_user_model()

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')