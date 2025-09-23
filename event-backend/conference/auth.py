from django.contrib.auth.models import User
from rest_framework import serializers, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

class PingView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def get(self, request):
        return Response({"pong": True}, status=200)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    class Meta:
        model = User
        fields = ["username", "email", "password"]
    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def post(self, request):
        ser = RegisterSerializer(data=request.data)  # JSON / 表单 都会自动解析
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)
