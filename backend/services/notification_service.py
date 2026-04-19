import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from database import Notification, NotificationType


async def create_notification(
    db: AsyncSession,
    user_id: str,
    type: NotificationType,
    title: str,
    message: str,
    data: dict = None,
) -> Notification:
    """Crée une notification pour un utilisateur. Le commit est géré par l'appelant."""
    notif = Notification(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id),
        type=type,
        title=title,
        message=message,
        data=data or {},
    )
    db.add(notif)
    print(f"[NOTIF] Créée: {type} pour user {user_id}")
    return notif
