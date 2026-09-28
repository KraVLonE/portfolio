import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_notification_email(name: str, sender_email: str, message: str):
    if not settings.SMTP_SERVER or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD or not settings.NOTIFICATION_EMAIL:
        logger.warning("Email settings are not fully configured. Skipping email notification.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USERNAME
        msg['To'] = settings.NOTIFICATION_EMAIL
        msg['Subject'] = f"New Portfolio Contact from {name}"

        body = f"""
You have received a new message from your portfolio website!

Name: {name}
Email: {sender_email}

Message:
{message}
"""
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        try:
            server.starttls()
            pwd = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
            server.login(settings.SMTP_USERNAME, pwd)
            server.send_message(msg)
        finally:
            server.quit()
        logger.info(f"Successfully sent contact notification for {name}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")
        return False
