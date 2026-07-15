"""Transactional email service (SMTP). Degrades to console logging in dev."""

from __future__ import annotations

import contextlib
import logging
import smtplib
import socket
import ssl
from email.message import EmailMessage
from html import escape as html_escape

import httpx

from app.core.config import settings

logger = logging.getLogger("voxa.email")


@contextlib.contextmanager
def _force_ipv4():
    """Temporarily force DNS resolution to IPv4 only.

    Many container hosts (Render, Railway, Fly, etc.) have no IPv6 egress route.
    When the SMTP host resolves to an AAAA record first, ``smtplib`` tries the
    IPv6 address and fails with ``[Errno 101] Network is unreachable`` instead of
    falling back to IPv4. Restricting getaddrinfo to ``AF_INET`` avoids this while
    keeping the hostname intact for TLS/SNI verification.
    """
    original = socket.getaddrinfo

    def ipv4_only(host, port, family=0, type=0, proto=0, flags=0):  # noqa: A002
        return original(host, port, socket.AF_INET, type, proto, flags)

    socket.getaddrinfo = ipv4_only
    try:
        yield
    finally:
        socket.getaddrinfo = original

# ── Brand constants used to render professional, on-brand emails ──────────────
BRAND_NAME = "NextCall"
BRAND_TAGLINE = "AI Voice Agent Platform"
SITE_URL = "https://www.nextcall.online"
LOGO_URL = f"{SITE_URL}/nextcall-logo.png"
SUPPORT_EMAIL = "info@nextcall.online"
CURRENT_YEAR = "2026"


class EmailService:
    @property
    def _resend_enabled(self) -> bool:
        return bool((settings.RESEND_API_KEY or "").strip())

    @property
    def _smtp_enabled(self) -> bool:
        host = (settings.SMTP_HOST or "").strip().lower()
        # Treat empty or obvious placeholder hosts as "not configured" so local
        # dev doesn't attempt (and fail) real SMTP connections.
        if not host or not settings.SMTP_USER or "example.com" in host:
            return False
        return True

    @property
    def enabled(self) -> bool:
        return self._resend_enabled or self._smtp_enabled

    def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str | None = None,
        reply_to: str | None = None,
        raise_on_error: bool = False,
    ) -> bool:
        """Send an email. Returns True on success.

        Prefers the Resend HTTPS API when ``RESEND_API_KEY`` is set (works on
        hosts that block SMTP ports, e.g. Render's free tier). Otherwise falls
        back to SMTP, supporting both implicit SSL (465) and STARTTLS (587).
        Errors are logged; set ``raise_on_error`` to propagate them (used by the
        contact form so the user gets real feedback).
        """
        if not self.enabled:
            logger.info("[EMAIL:dev] to=%s subject=%s\n%s", to, subject, text or html)
            return True

        from_addr = (settings.EMAIL_FROM or "").strip() or settings.SMTP_USER
        from_header = f"{settings.EMAIL_FROM_NAME} <{from_addr}>"
        try:
            if self._resend_enabled:
                self._send_via_resend(
                    from_header=from_header, to=to, subject=subject,
                    html=html, text=text, reply_to=reply_to,
                )
            else:
                self._send_via_smtp(
                    from_header=from_header, to=to, subject=subject,
                    html=html, text=text, reply_to=reply_to,
                )
            logger.info("Email sent to %s (subject=%s)", to, subject)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send email to %s (subject=%s): %s", to, subject, exc)
            if raise_on_error:
                raise
            return False

    def _send_via_resend(
        self, *, from_header: str, to: str, subject: str,
        html: str, text: str | None, reply_to: str | None,
    ) -> None:
        payload: dict = {
            "from": from_header,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text
        if reply_to:
            payload["reply_to"] = reply_to
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Resend API error {resp.status_code}: {resp.text}")

    def _send_via_smtp(
        self, *, from_header: str, to: str, subject: str,
        html: str, text: str | None, reply_to: str | None,
    ) -> None:
        msg = EmailMessage()
        msg["From"] = from_header
        msg["To"] = to
        msg["Subject"] = subject
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.set_content(text or "Please view this email in an HTML client.")
        msg.add_alternative(html, subtype="html")
        port = int(settings.SMTP_PORT or 587)
        with _force_ipv4():
            if port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings.SMTP_HOST, port, context=context, timeout=30) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=ssl.create_default_context())
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)

    def send_verification(self, *, to: str, name: str, link: str) -> None:
        self.send(
            to=to,
            subject=f"Verify your {BRAND_NAME} account",
            html=_template(
                preheader="Confirm your email to activate your NextCall workspace.",
                title="Verify your email address",
                body=(
                    f"Hi {name}, welcome to {BRAND_NAME}! You're one step away from "
                    "deploying AI voice agents. Confirm your email address to "
                    "activate your workspace."
                ),
                cta_text="Verify email address",
                cta_link=link,
                footnote="This link is unique to your account. If you didn't create "
                "a NextCall account, you can safely ignore this email.",
            ),
            text=(
                f"Hi {name}, welcome to {BRAND_NAME}!\n\n"
                f"Verify your email to activate your workspace:\n{link}\n\n"
                "If you didn't create an account, ignore this email."
            ),
        )

    def send_verification_otp(self, *, to: str, name: str, code: str) -> None:
        self.send(
            to=to,
            subject=f"{code} is your {BRAND_NAME} verification code",
            html=_template(
                preheader=f"Your {BRAND_NAME} verification code is {code} (expires in 15 minutes).",
                title="Confirm your email",
                body=(
                    f"Hi {name}, welcome to {BRAND_NAME}! Use the verification code "
                    "below to confirm your email address and activate your workspace."
                ),
                code=code,
                footnote="For your security, never share this code. NextCall will "
                "never ask you for it. If you didn't create an account, ignore this email.",
            ),
            text=(
                f"Hi {name}, welcome to {BRAND_NAME}!\n\n"
                f"Your verification code is: {code}\n"
                "It expires in 15 minutes.\n\n"
                "If you didn't create an account, ignore this email."
            ),
        )

    def send_password_reset(self, *, to: str, name: str, link: str) -> None:
        self.send(
            to=to,
            subject=f"Reset your {BRAND_NAME} password",
            html=_template(
                preheader="Reset your NextCall password — link expires in 1 hour.",
                title="Reset your password",
                body=(
                    f"Hi {name}, we received a request to reset the password for "
                    "your NextCall workspace. Click the button below to choose a new "
                    "password. For your security, this link expires in 1 hour."
                ),
                cta_text="Reset password",
                cta_link=link,
                footnote="If you didn't request a password reset, no action is "
                "needed — your password will stay the same.",
            ),
            text=(
                f"Hi {name},\n\nReset your {BRAND_NAME} password (expires in 1 hour):\n"
                f"{link}\n\nIf you didn't request this, ignore this email."
            ),
        )

    def send_welcome(self, *, to: str, name: str) -> None:
        dashboard = f"{settings.FRONTEND_URL}/dashboard"
        self.send(
            to=to,
            subject=f"Welcome to {BRAND_NAME} 🎉",
            html=_template(
                preheader="Your NextCall workspace is ready — deploy your first AI voice agent.",
                title=f"Welcome to {BRAND_NAME}, {name.split(' ')[0]}!",
                body=(
                    "Your workspace is ready. You can now create AI voice agents, "
                    "connect phone numbers, launch calling campaigns, and track every "
                    "conversation from one dashboard. Here's how to get your first "
                    "agent live in minutes:"
                ),
                details=[
                    ("1. Connect a provider", "Twilio, SIP, or TelephonyX"),
                    ("2. Create an AI agent", "Voice, prompt, and tools"),
                    ("3. Assign a number", "Route inbound & outbound calls"),
                    ("4. Go live", "Launch and review analytics"),
                ],
                cta_text="Go to your workspace",
                cta_link=dashboard,
                footnote="Need a hand getting started? Just reply to this email or "
                f"reach us at {SUPPORT_EMAIL}.",
            ),
            text=(
                f"Welcome to {BRAND_NAME}, {name}!\n\n"
                "Your workspace is ready. Create AI voice agents, connect numbers, "
                "and launch campaigns.\n\n"
                f"Open your dashboard: {dashboard}\n\n"
                f"Questions? Email {SUPPORT_EMAIL}."
            ),
        )

    def send_payment_receipt(
        self,
        *,
        to: str,
        name: str,
        amount: str,
        plan: str | None = None,
        invoice_number: str | None = None,
        payment_date: str | None = None,
        payment_method: str | None = None,
    ) -> None:
        billing = f"{settings.FRONTEND_URL}/billing"
        details: list[tuple[str, str]] = []
        if plan:
            details.append(("Plan", plan))
        if invoice_number:
            details.append(("Invoice", invoice_number))
        if payment_date:
            details.append(("Date", payment_date))
        if payment_method:
            details.append(("Payment method", payment_method))
        details.append(("Amount paid", amount))
        self.send(
            to=to,
            subject=f"Your {BRAND_NAME} payment receipt — {amount}",
            html=_template(
                preheader=f"We received your payment of {amount}. Thank you!",
                title="Payment received",
                body=(
                    f"Hi {name}, thank you for your payment. This email confirms we've "
                    "received it and your subscription is active. A summary is below."
                ),
                highlight=("Amount paid", amount),
                details=details,
                cta_text="View billing & invoices",
                cta_link=billing,
                footnote="This receipt was generated automatically. For billing "
                f"questions, contact us at {SUPPORT_EMAIL}.",
            ),
            text=(
                f"Hi {name}, thank you for your payment.\n\n"
                f"Amount paid: {amount}\n"
                + (f"Plan: {plan}\n" if plan else "")
                + (f"Invoice: {invoice_number}\n" if invoice_number else "")
                + (f"Date: {payment_date}\n" if payment_date else "")
                + f"\nView billing: {billing}"
            ),
        )

    def send_credits_added(
        self,
        *,
        to: str,
        name: str,
        credits: str,
        new_balance: str | None = None,
        reason: str | None = None,
    ) -> None:
        dashboard = f"{settings.FRONTEND_URL}/dashboard"
        details: list[tuple[str, str]] = [("Credits added", credits)]
        if new_balance:
            details.append(("New balance", new_balance))
        if reason:
            details.append(("Note", reason))
        self.send(
            to=to,
            subject=f"{credits} credits added to your {BRAND_NAME} workspace",
            html=_template(
                preheader=f"{credits} credits were just added to your workspace.",
                title="Credits added to your workspace",
                body=(
                    f"Hi {name}, good news — {credits} credits have been added to your "
                    f"{BRAND_NAME} workspace and are ready to use for calls and agents."
                ),
                highlight=("Credits added", credits),
                details=details,
                cta_text="Go to your dashboard",
                cta_link=dashboard,
                footnote="Credits are consumed as your agents handle calls. Track "
                "usage anytime from your dashboard.",
            ),
            text=(
                f"Hi {name}, {credits} credits have been added to your {BRAND_NAME} "
                "workspace."
                + (f"\nNew balance: {new_balance}" if new_balance else "")
                + f"\n\nDashboard: {dashboard}"
            ),
        )

    def send_contact_inquiry(
        self,
        *,
        name: str,
        email: str,
        message: str,
        details: list[tuple[str, str]] | None = None,
    ) -> bool:
        """Deliver a contact-form submission to the support inbox.

        Raises on SMTP failure so the API can report it to the user. Reply-To is
        set to the sender so support can reply directly.
        """
        rows = list(details or [])
        rows = [("Name", name), ("Email", email), *rows]
        safe_message = html_escape(message).replace("\n", "<br>")
        return self.send(
            to=SUPPORT_EMAIL,
            reply_to=email,
            raise_on_error=True,
            subject=f"New inquiry from {name} — {BRAND_NAME}",
            html=_template(
                preheader=f"New contact inquiry from {name} ({email}).",
                title="New contact inquiry",
                body=(
                    "A new message was submitted through the NextCall contact form."
                    "<br><br><strong>Message:</strong><br>"
                    f"{safe_message}"
                ),
                details=rows,
                footnote=f"Reply directly to this email to reach {name}.",
            ),
            text=(
                f"New contact inquiry\n\nName: {name}\nEmail: {email}\n"
                + "".join(f"{k}: {v}\n" for k, v in (details or []))
                + f"\nMessage:\n{message}\n"
            ),
        )

    def send_contact_ack(self, *, to: str, name: str) -> None:
        """Auto-acknowledgement to the person who submitted the contact form."""
        self.send(
            to=to,
            subject=f"We received your message — {BRAND_NAME}",
            html=_template(
                preheader="Thanks for contacting NextCall — we'll be in touch soon.",
                title="Thanks for reaching out",
                body=(
                    f"Hi {name}, thanks for contacting {BRAND_NAME}. We've received your "
                    "message and a member of our team will get back to you within one "
                    "business day. If it's urgent, just reply to this email."
                ),
                cta_text="Explore the platform",
                cta_link=SITE_URL,
                footnote=f"You can always reach us at {SUPPORT_EMAIL}.",
            ),
            text=(
                f"Hi {name}, thanks for contacting {BRAND_NAME}. We'll get back to you "
                f"within one business day. Reach us anytime at {SUPPORT_EMAIL}."
            ),
        )


def _template(
    *,
    title: str,
    body: str,
    cta_text: str = "",
    cta_link: str = "",
    code: str = "",
    details: list[tuple[str, str]] | None = None,
    highlight: tuple[str, str] | None = None,
    preheader: str = "",
    footnote: str = "",
) -> str:
    """Render a professional, email-client-safe HTML message (tables + inline CSS).

    Renders a large one-time-code block when ``code`` is given, otherwise a
    bulletproof CTA button when ``cta_link`` is given. Optionally shows a
    ``highlight`` amount box and a ``details`` key/value summary table.
    """
    highlight_html = ""
    if highlight:
        h_label, h_value = highlight
        highlight_html = f"""
          <tr>
            <td style="padding:0 40px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdff;border:1px solid #a5f3fc;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:24px;">
                    <p style="margin:0 0 6px;color:#0891b2;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">{h_label}</p>
                    <p style="margin:0;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;">{h_value}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""

    details_html = ""
    if details:
        rows = "".join(
            f"""
                <tr>
                  <td style="padding:10px 20px;border-top:1px solid #eef2f7;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:13px;">{label}</td>
                  <td align="right" style="padding:10px 20px;border-top:1px solid #eef2f7;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;">{value}</td>
                </tr>"""
            for label, value in details
        )
        details_html = f"""
          <tr>
            <td style="padding:0 40px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">{rows}
              </table>
            </td>
          </tr>"""

    if code:
        spaced = "&nbsp;".join(list(code))
        action_html = f"""
          <!-- OTP code block -->
          <tr>
            <td style="padding:0 40px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdff;border:1px solid #a5f3fc;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:22px;">
                    <p style="margin:0 0 8px;color:#0891b2;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Your verification code</p>
                    <p style="margin:0;color:#0f172a;font-family:'Courier New',Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:6px;">{spaced}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
                Enter this code to verify your email. It expires in 15 minutes.
              </p>
            </td>
          </tr>"""
    elif cta_link:
        action_html = f"""
          <!-- CTA button (bulletproof) -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#0891b2" style="border-radius:10px;background-color:#0891b2;background-image:linear-gradient(135deg,#0891b2 0%,#0e7490 100%);">
                    <a href="{cta_link}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">{cta_text}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Fallback link -->
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{cta_link}" target="_blank" style="color:#0891b2;word-break:break-all;">{cta_link}</a>
              </p>
            </td>
          </tr>"""
    else:
        action_html = ""

    footnote_html = (
        f"""
              <tr>
                <td style="padding:0 40px 8px">
                  <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6">{footnote}</p>
                </td>
              </tr>"""
        if footnote
        else ""
    )

    return f"""\
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f7;font-size:1px;line-height:1px;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(2,6,23,0.08);border:1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="background-color:#04060f;background-image:linear-gradient(135deg,#04060f 0%,#0b1b2e 55%,#0a1420 100%);padding:28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="{LOGO_URL}" width="40" height="40" alt="{BRAND_NAME}" style="display:inline-block;vertical-align:middle;border:0;width:40px;height:40px;">
                    <span style="display:inline-block;vertical-align:middle;margin-left:10px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.2px;">{BRAND_NAME}</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="color:#67e8f9;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">{BRAND_TAGLINE}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent line -->
          <tr><td style="height:3px;background-color:#22d3ee;background-image:linear-gradient(90deg,#22d3ee 0%,#8b5cf6 100%);font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 8px;">
              <h1 style="margin:0 0 16px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:1.3;">{title}</h1>
              <p style="margin:0 0 28px;color:#475569;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;">{body}</p>
            </td>
          </tr>
{highlight_html}
{details_html}
{action_html}
{footnote_html}

          <!-- Divider -->
          <tr><td style="padding:24px 40px 0;"><div style="height:1px;background-color:#e2e8f0;font-size:0;line-height:0;">&nbsp;</div></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="{LOGO_URL}" width="28" height="28" alt="{BRAND_NAME}" style="display:inline-block;vertical-align:middle;border:0;width:28px;height:28px;">
                    <span style="display:inline-block;vertical-align:middle;margin-left:8px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">{BRAND_NAME}</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="{SITE_URL}" target="_blank" style="color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:13px;text-decoration:none;">Website</a>
                    <span style="color:#cbd5e1;">&nbsp;&middot;&nbsp;</span>
                    <a href="{SITE_URL}/contact" target="_blank" style="color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:13px;text-decoration:none;">Contact</a>
                    <span style="color:#cbd5e1;">&nbsp;&middot;&nbsp;</span>
                    <a href="mailto:{SUPPORT_EMAIL}" style="color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:13px;text-decoration:none;">Email us</a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;">
                {BRAND_NAME} — {BRAND_TAGLINE} for inbound &amp; outbound AI phone calls.<br>
                Questions? Reach us at <a href="mailto:{SUPPORT_EMAIL}" style="color:#0891b2;text-decoration:none;">{SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:12px 0 0;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
                &copy; {CURRENT_YEAR} {BRAND_NAME}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


email_service = EmailService()
