from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid

from database import get_db, User, UserType
from auth import hash_password, verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    prenom: str
    nom: str
    user_code: str
    password: str
    type: UserType
    localisation: Optional[str] = None


class LoginRequest(BaseModel):
    user_code: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    user_code: str
    prenom: str
    nom: str
    type: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Valider le format du code : exactement 6 chiffres
        if not (len(request.user_code) == 6 and request.user_code.isdigit()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le code doit contenir exactement 6 chiffres",
            )

        # Vérifier unicité du code
        result = await db.execute(select(User).where(User.user_code == request.user_code))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce code est déjà utilisé. Choisissez un autre.",
            )

        new_user = User(
            id=uuid.uuid4(),
            prenom=request.prenom,
            nom=request.nom,
            user_code=request.user_code,
            password_hash=hash_password(request.password),
            type=request.type,
            localisation=request.localisation,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        token = create_access_token({"sub": new_user.user_code})

        print(f"[AUTH] Nouvel utilisateur: {request.prenom} {request.nom} | Code: {request.user_code}")

        return AuthResponse(
            access_token=token,
            user_id=str(new_user.id),
            user_code=new_user.user_code,
            prenom=new_user.prenom,
            nom=new_user.nom,
            type=new_user.type.value,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] Erreur lors de l'enregistrement: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne lors de la création du compte",
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(User).where(User.user_code == request.user_code))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Code utilisateur non trouvé",
            )

        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mot de passe incorrect",
            )

        token = create_access_token({"sub": user.user_code})

        print(f"[AUTH] Connexion: {user.prenom} {user.nom} ({user.user_code})")

        return AuthResponse(
            access_token=token,
            user_id=str(user.id),
            user_code=user.user_code,
            prenom=user.prenom,
            nom=user.nom,
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
