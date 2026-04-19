from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, User
from dotenv import load_dotenv
import os
import random
import string


# ─────────────────────────────────────────
# CONFIGURATION — Variables JWT et bcrypt
# ─────────────────────────────────────────

# Charger les variables d'environnement depuis backend/.env
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", 7))

# Contexte bcrypt pour le hachage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Schéma de sécurité HTTP Bearer — extrait le token de l'en-tête Authorization
security = HTTPBearer()


# ─────────────────────────────────────────
# FONCTIONS UTILITAIRES — Hachage et JWT
# ─────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hache le mot de passe avec bcrypt avant de le stocker en base."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Vérifie si le mot de passe en clair correspond au hash bcrypt stocké."""
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    """
    Crée un JWT signé avec une expiration de ACCESS_TOKEN_EXPIRE_DAYS jours.
    Le champ 'sub' (subject) doit contenir le wallet_address de l'utilisateur.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_aqua_id() -> str:
    """Génère un identifiant AquaToken format AQ-XXXX (sans O, 0, I, 1)."""
    chars = (string.ascii_uppercase + string.digits).replace('O','').replace('0','').replace('I','').replace('1','')
    code = ''.join(random.choices(chars, k=4))
    return f"AQ-{code}"


async def generate_unique_aqua_id(db: AsyncSession) -> str:
    """Génère un AQ-ID unique en vérifiant l'absence de doublon en base."""
    while True:
        aqua_id = generate_aqua_id()
        result = await db.execute(select(User).where(User.aqua_id == aqua_id))
        if not result.scalar_one_or_none():
            return aqua_id


def decode_token(token: str) -> dict:
    """
    Décode et valide la signature du JWT.
    Lève HTTPException 401 si le token est invalide ou expiré.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─────────────────────────────────────────
# MIDDLEWARE — Récupération de l'utilisateur connecté
# ─────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dépendance FastAPI : valide le Bearer token et retourne l'objet User correspondant.
    À injecter dans les routes protégées via Depends(get_current_user).
    """
    # Décoder le token pour récupérer le gsm (champ 'sub')
    payload = decode_token(credentials.credentials)
    gsm = payload.get("sub")

    if not gsm:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide : champ 'sub' manquant",
        )

    # Chercher l'utilisateur en base par son gsm
    result = await db.execute(
        select(User).where(User.gsm == gsm)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé",
        )

    return user
