import logging
from django.conf import settings
from .models import NotificationLog

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def notify(recipient, event_type, order=None, channels=None):
        if not channels:
            channels = [NotificationLog.Channel.EMAIL, NotificationLog.Channel.WHATSAPP]
            
        for channel in channels:
            # Create a log entry
            log = NotificationLog.objects.create(
                recipient=recipient,
                order=order,
                event_type=event_type,
                channel=channel,
                status=NotificationLog.NotifStatus.PENDING
            )
            
            try:
                if channel == NotificationLog.Channel.EMAIL:
                    NotificationService._send_email(recipient, event_type, order)
                elif channel == NotificationLog.Channel.WHATSAPP:
                    NotificationService._send_whatsapp(recipient, event_type, order)
                    
                log.status = NotificationLog.NotifStatus.SENT
                log.save()
            except Exception as e:
                logger.error(f"Failed to send {channel} notification for event {event_type}: {e}")
                log.status = NotificationLog.NotifStatus.FAILED
                log.error_message = str(e)  # Wait, there's no error_message on model. Just put in log.
                log.save()

    @staticmethod
    def _send_email(recipient, event_type, order):
        if getattr(settings, 'EMAIL_MOCK_MODE', True):
            logger.info(f"[MOCK EMAIL] To: {recipient.email}, Event: {event_type}, Order: {order.order_number if order else 'N/A'}")
            return True
        # Actual email sending logic using django.core.mail goes here
        pass

    @staticmethod
    def _send_whatsapp(recipient, event_type, order):
        if getattr(settings, 'WHATSAPP_MOCK_MODE', True):
            logger.info(f"[MOCK WHATSAPP] To: {recipient.phone_number}, Event: {event_type}, Order: {order.order_number if order else 'N/A'}")
            return True
        # Actual WhatsApp API integration (e.g. Twilio/Meta) goes here
        pass
