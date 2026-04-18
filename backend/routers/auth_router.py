from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid

from database import get_db, User, UserType
from auth import hash_password, verify_password, create_access_token


# ─────────────────────────────────────────
# ROUTER — Préfixe /auth, tag Authentication dans la doc Swagger
# ─────────────────────────────────────────

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─────────────────────────────────────────
# SCHÉMAS PYDANTIC — Requêtes et réponses d'authentification
# ─────────────────────────────────────────

class RegisterRequest(BaseModel):
    wallet_address: str          # Adresse Ethereum (ex: 0x...)
    password: str                # Mot de passe en clair — sera haché avant stockage
    type: UserType               # "agriculteur" ou "entreprise"
    localisation: Optional[str] = None   # Région ou ville (ex: "Sfax")


class LoginRequest(BaseModel):
    wallet_address: str
    password: str


class AuthResponse(BaseModel):
    access_token: str            # JWT Bearer token
    token_type: str = "bearer"
    user_id: str                 # UUID de l'utilisateur (converti en string)
    wallet_address: str
    type: str                    # Type de compte


# ─────────────────────────────────────────
# ROUTE — POST /auth/register
# ─────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Crée un nouveau compte utilisateur.
    Vérifie que le wallet_address n'est pas déjà enregistré,
    hache le mot de passe et génère un JWT token.
    """
    try:
        # Vérifier si le wallet est déjà enregistré en base
        result = await db.execute(
            select(User).where(User.wallet_address == request.wallet_address)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Wallet déjà enregistré",
            )

        # Créer le nouvel utilisateur avec le mot de passe haché
        new_user = User(
            id=uuid.uuid4(),
            wallet_address=request.wallet_address,
            password_hash=hash_password(request.password),
            type=request.type,
            localisation=request.localisation,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        # Générer le JWT token — 'sub' = wallet_address (identifiant unique)
        token = create_access_token({"sub": new_user.wallet_address})

        print(f"[AUTH] Nouvel utilisateur enregistré: {request.wallet_address}")

        return AuthResponse(
            access_token=token,
            user_id=str(new_user.id),
            wallet_address=new_user.wallet_address,
            type=new_user.type.value,
        )

    except HTTPException:
        # Relancer les HTTPException sans les envelopper
        raise
    except Exception as e:
        print(f"[AUTH] Erreur lors de l'enregistrement: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne lors de la création du compte",
        )


# ─────────────────────────────────────────
# ROUTE — POST /auth/login
# ─────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authentifie un utilisateur existant par wallet_address + mot de passe.
    Retourne un JWT token si les identifiants sont valides.
    """
    try:
        # Rechercher l'utilisateur par son wallet_address
        result = await db.execute(
            select(User).where(User.wallet_address == request.wallet_address)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wallet non trouvé",
            )

        # Vérifier que le mot de passe correspond au hash stocké
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mot de passe incorrect",
            )

        # Générer un nouveau JWT token pour cette session
        token = create_access_token({"sub": user.wallet_address})

        print(f"[AUTH] Connexion réussie: {request.wallet_address}")

        return AuthResponse(
            access_token=token,
            user_id=str(user.id),
            wallet_address=user.wallet_address,
            type=user.type.value,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] Erreur lors de la connexion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne lors de la connexion",
        )
