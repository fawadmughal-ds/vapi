#!/usr/bin/env python3
"""Send a one-off test email to verify SMTP delivery (e.g. Hostinger mailbox).

Two ways to provide credentials (real env vars always win over the .env file):

1) Fill a .env file (copy .env.example -> .env, set the SMTP_* values), then:

       python backend/scripts/send_test_email.py

2) Or pass them inline for a one-off run:

       SMTP_HOST=smtp.hostinger.com SMTP_PORT=465 \
       SMTP_USER=info@nextcall.online SMTP_PASSWORD='your-mailbox-password' \
       MAIL_TO=info@nextcall.online python backend/scripts/send_test_email.py

Port 465 uses implicit SSL; port 587 uses STARTTLS. Both are supported below.
The same SMTP_* variables configure NextCall's transactional emails on Render.
"""

from __future__ import annotations

import os
import smtplib
import ssl
import sys
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path


def load_dotenv() -> None:
    """Load KEY=VALUE lines from the first .env found (backend/.env, then ../.env).

    Real environment variables always take precedence, so exporting inline
    (or Render's dashboard vars) overrides file values.
    """
    here = Path(__file__).resolve()
    candidates = [
        here.parent.parent / ".env",  # backend/.env
        here.parent.parent.parent / ".env",  # project-root/.env
    ]
    for path in candidates:
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)
        break


def env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


LOGO_URL = "https://www.nextcall.online/nextcall-logo.png"
SITE_URL = "https://www.nextcall.online"
SUPPORT_EMAIL = "info@nextcall.online"


def _html(*, now: str, host: str, port: int, mail_from: str, mail_to: str) -> str:
    """Branded, email-client-safe HTML matching NextCall's transactional emails."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>NextCall SMTP test</title></head>
<body style="margin:0;padding:0;background-color:#eef2f7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f7;font-size:1px;">Your NextCall mailbox is receiving email correctly.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(2,6,23,0.08);border:1px solid #e2e8f0;">
          <tr>
            <td style="background-color:#04060f;background-image:linear-gradient(135deg,#04060f 0%,#0b1b2e 55%,#0a1420 100%);padding:28px 40px;">
              <img src="{LOGO_URL}" width="40" height="40" alt="NextCall" style="display:inline-block;vertical-align:middle;border:0;width:40px;height:40px;">
              <span style="display:inline-block;vertical-align:middle;margin-left:10px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;">NextCall</span>
            </td>
          </tr>
          <tr><td style="height:3px;background-image:linear-gradient(90deg,#22d3ee 0%,#8b5cf6 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:40px 40px 8px;">
              <span style="display:inline-block;background-color:#ecfeff;color:#0891b2;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;border-radius:999px;">Mail delivery test</span>
              <h1 style="margin:18px 0 12px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;">Your mailbox is working</h1>
              <p style="margin:0 0 24px;color:#475569;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;">
                If you're reading this, SMTP is configured correctly and
                <strong>{mail_to}</strong> can receive email from NextCall.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr><td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#475569;line-height:1.9;">
                  <strong style="color:#0f172a;">Delivery details</strong><br>
                  Sent at: {now}<br>
                  SMTP host: {host}:{port}<br>
                  From: {mail_from}<br>
                  To: {mail_to}
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#e2e8f0;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr>
            <td style="padding:24px 40px 36px;">
              <img src="{LOGO_URL}" width="28" height="28" alt="NextCall" style="display:inline-block;vertical-align:middle;border:0;width:28px;height:28px;">
              <span style="display:inline-block;vertical-align:middle;margin-left:8px;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">NextCall</span>
              <p style="margin:16px 0 0;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;">
                NextCall — AI Voice Agent Platform.
                <a href="{SITE_URL}" style="color:#0891b2;text-decoration:none;">nextcall.online</a>
                &middot; <a href="mailto:{SUPPORT_EMAIL}" style="color:#0891b2;text-decoration:none;">{SUPPORT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def main() -> int:
    load_dotenv()
    host = env("SMTP_HOST", "smtp.hostinger.com")
    port = int(env("SMTP_PORT", "465"))
    user = env("SMTP_USER")
    password = env("SMTP_PASSWORD")
    # Default: send from and to the same mailbox (self-test proves send + receive).
    mail_from = env("EMAIL_FROM", user)
    mail_to = env("MAIL_TO", user or "info@nextcall.online")
    from_name = env("EMAIL_FROM_NAME", "NextCall")

    if not user or not password:
        print(
            "ERROR: SMTP_USER and SMTP_PASSWORD must be set.\n"
            "Example:\n"
            "  SMTP_USER=info@nextcall.online SMTP_PASSWORD='***' "
            "python backend/scripts/send_test_email.py",
            file=sys.stderr,
        )
        return 2

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    msg = EmailMessage()
    msg["From"] = f"{from_name} <{mail_from}>"
    msg["To"] = mail_to
    msg["Subject"] = f"NextCall SMTP test — {now}"
    msg.set_content(
        f"This is a test email from the NextCall mail setup.\n\n"
        f"Sent at: {now}\nHost: {host}:{port}\nFrom: {mail_from}\nTo: {mail_to}\n\n"
        "If you received this, your mailbox is working."
    )
    msg.add_alternative(
        _html(now=now, host=host, port=port, mail_from=mail_from, mail_to=mail_to),
        subtype="html",
    )

    print(f"Connecting to {host}:{port} as {user} ...")
    try:
        if port == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=30) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.login(user, password)
                server.send_message(msg)
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED to send: {exc}", file=sys.stderr)
        return 1

    print(f"OK — test email sent to {mail_to}. Check the inbox (and spam).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
