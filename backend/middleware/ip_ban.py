import ipaddress

from django.http import HttpResponse
from django.utils import timezone

from apps.accounts.models import BannedIP


class IPBanMiddleware:
    """차단된 IP 대역 또는 단일 IP의 접근을 막는다."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        remote_ip = request.META.get("REMOTE_ADDR", "")
        if remote_ip:
            current_ip = ipaddress.ip_address(remote_ip)
            active_bans = BannedIP.objects.filter(expires_at__isnull=True) | BannedIP.objects.filter(expires_at__gt=timezone.now())
            for banned_ip in active_bans:
                try:
                    if "/" in banned_ip.ip_address:
                        if current_ip in ipaddress.ip_network(banned_ip.ip_address, strict=False):
                            return HttpResponse("접근이 차단된 IP입니다.", status=403)
                    elif current_ip == ipaddress.ip_address(banned_ip.ip_address):
                        return HttpResponse("접근이 차단된 IP입니다.", status=403)
                except ValueError:
                    continue

        return self.get_response(request)
