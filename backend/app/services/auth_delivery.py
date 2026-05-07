import json
import smtplib
from email.message import EmailMessage

import httpx
from fastapi import HTTPException

from app.core.config import settings


def _send_email_via_gmail(account: str, code: str, expire_in_seconds: int) -> None:
    if not settings.EMAIL_GMAIL_USER or not settings.EMAIL_GMAIL_APP_PASSWORD:
        raise RuntimeError("gmail credentials not configured")
    msg = EmailMessage()
    msg["Subject"] = f"[{settings.EMAIL_FROM_NAME}] 登录验证码"
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_GMAIL_USER}>"
    msg["To"] = account
    msg.set_content(
        f"你的验证码是：{code}\n"
        f"有效期：{expire_in_seconds // 60} 分钟\n\n"
        "请勿将验证码透露给他人。"
    )
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
        server.login(settings.EMAIL_GMAIL_USER, settings.EMAIL_GMAIL_APP_PASSWORD)
        server.send_message(msg)


def _send_sms_via_aliyun(account: str, code: str) -> None:
    if (
        not settings.SMS_ALIYUN_ACCESS_KEY_ID
        or not settings.SMS_ALIYUN_ACCESS_KEY_SECRET
        or not settings.SMS_ALIYUN_SIGN_NAME
        or not settings.SMS_ALIYUN_TEMPLATE_CODE
    ):
        raise RuntimeError("aliyun sms credentials not configured")

    try:
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkdysmsapi.request.v20170525.SendSmsRequest import SendSmsRequest
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"aliyun sms sdk unavailable: {exc}")

    client = AcsClient(
        settings.SMS_ALIYUN_ACCESS_KEY_ID,
        settings.SMS_ALIYUN_ACCESS_KEY_SECRET,
        "cn-hangzhou",
    )
    request = SendSmsRequest()
    request.set_accept_format("json")
    request.set_PhoneNumbers(account)
    request.set_SignName(settings.SMS_ALIYUN_SIGN_NAME)
    request.set_TemplateCode(settings.SMS_ALIYUN_TEMPLATE_CODE)
    request.set_TemplateParam(json.dumps({"code": code}, ensure_ascii=False))
    raw = client.do_action_with_exception(request)
    payload = json.loads(raw)
    if payload.get("Code") != "OK":
        raise RuntimeError(f"aliyun sms failed: {payload.get('Message', 'unknown')}")


def _send_via_webhook(account: str, is_email: bool, code: str, expire_in_seconds: int) -> None:
    webhook_url = settings.EMAIL_CODE_WEBHOOK_URL if is_email else settings.SMS_CODE_WEBHOOK_URL
    if not webhook_url:
        raise RuntimeError("webhook url not configured")
    with httpx.Client(timeout=4.0) as client:
        client.post(
            webhook_url,
            json={
                "account": account,
                "channel": "email" if is_email else "sms",
                "code": code,
                "expire_in_seconds": expire_in_seconds,
            },
        ).raise_for_status()


def deliver_login_code(account: str, is_email: bool, code: str, expire_in_seconds: int) -> str:
    if is_email:
        provider = settings.EMAIL_PROVIDER.strip().lower()
        try:
            if provider == "gmail":
                _send_email_via_gmail(account, code, expire_in_seconds)
                return "gmail"
            if provider == "webhook":
                _send_via_webhook(account, True, code, expire_in_seconds)
                return "webhook"
            if provider == "mock":
                return "mock"
            raise RuntimeError(f"unsupported email provider: {provider}")
        except Exception as exc:
            if settings.LOGIN_CODE_MODE.strip().lower() == "strict":
                raise HTTPException(status_code=502, detail=f"email delivery failed: {exc}")
            return "mock"

    provider = settings.SMS_PROVIDER.strip().lower()
    try:
        if provider == "aliyun":
            _send_sms_via_aliyun(account, code)
            return "aliyun"
        if provider == "webhook":
            _send_via_webhook(account, False, code, expire_in_seconds)
            return "webhook"
        if provider == "mock":
            return "mock"
        raise RuntimeError(f"unsupported sms provider: {provider}")
    except Exception as exc:
        if settings.LOGIN_CODE_MODE.strip().lower() == "strict":
            raise HTTPException(status_code=502, detail=f"sms delivery failed: {exc}")
        return "mock"
