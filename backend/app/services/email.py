"""Transactional email service (SMTP). Degrades to console logging in dev."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("voxa.email")


class EmailService:
    @property
    def enabled(self) -> bool:
        host = (settings.SMTP_HOST or "").strip().lower()
        # Treat empty or obvious placeholder hosts as "not configured" so local
        # dev doesn't attempt (and fail) real SMTP connections.
        if not host or not settings.SMTP_USER or "example.com" in host:
            return False
        return True

    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> None:
        if not self.enabled:
            logger.info("[EMAIL:dev] to=%s subject=%s\n%s", to, subject, text or html)
            return
        msg = EmailMessage()
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(text or "Please view this email in an HTML client.")
        msg.add_alternative(html, subtype="html")
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to send email to %s: %s", to, exc)

    def send_verification(self, *, to: str, name: str, link: str) -> None:
        self.send(
            to=to,
            subject=f"Verify your {settings.PROJECT_NAME} account",
            html=_template(
                title="Verify your email",
                body=f"Hi {name}, welcome to {settings.PROJECT_NAME}! "
                "Confirm your email address to activate your account.",
                cta_text="Verify Email",
                cta_link=link,
            ),
            text=f"Verify your email: {link}",
        )

    def send_password_reset(self, *, to: str, name: str, link: str) -> None:
        self.send(
            to=to,
            subject=f"Reset your {settings.PROJECT_NAME} password",
            html=_template(
                title="Reset your password",
                body=f"Hi {name}, we received a request to reset your password. "
                "This link expires in 1 hour.",
                cta_text="Reset Password",
                cta_link=link,
            ),
            text=f"Reset your password: {link}",
        )


def _template(*, title: str, body: str, cta_text: str, cta_link: str) -> str:
    return f"""\
<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px">
  <h1 style="font-size:20px;color:#0f172a">{title}</h1>
  <p style="color:#475569;line-height:1.6">{body}</p>
  <a href="{cta_link}" style="display:inline-block;margin-top:16px;padding:12px 20px;
     background:#6366f1;color:#fff;border-radius:8px;text-decoration:none">{cta_text}</a>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">
     If the button doesn't work, copy this link:<br>{cta_link}</p>
</div>"""


email_service = EmailService()
