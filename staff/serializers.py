from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from staff.models import Staff

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Optional: add custom claims
        token['username'] = user.username
        token['role'] = getattr(user, 'role', 'USER')
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        return data


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=3)

    class Meta:
        model = Staff
        fields = ['username', 'password']

    def validate_username(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        if Staff.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def create(self, validated_data):
        return Staff.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
