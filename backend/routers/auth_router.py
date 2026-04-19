from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid
import re

from database import get_db, User, UserType
from auth import hash_password, verify_password, create_access_token, generate_unique_aqua_id


router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    prenom: str
    nom: str
    gsm: str
    password: str
    type: UserType
    localisation: Optional[str] = None


class LoginRequest(BaseModel):
    gsm: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    aqua_id: str
    prenom: str
    nom: str
    gsm: str
    type: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Valider format GSM tunisien (8 chiffres)
        if not re.fullmatch(r"\d{8}", request.gsm):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Numéro GSM invalide (8 chiffres requis)",
            )

        # Vérifier unicité du GSM
        result = await db.execute(select(User).where(User.gsm == request.gsm))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce numéro GSM est déjà enregistré",
            )

        aqua_id = await generate_unique_aqua_id(db)

        new_user = User(
            id=uuid.uuid4(),
            prenom=request.prenom,
            nom=request.nom,
            gsm=request.gsm,
            aqua_id=aqua_id,
            password_hash=hash_password(request.password),
            type=request.type,
            localisation=request.localisation,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        token = create_access_token({"sub": new_user.gsm})

        print(f"[AUTH] Nouvel utilisateur: {request.prenom} {request.nom} | GSM: {request.gsm} | AQ-ID: {aqua_id}")

        return AuthResponse(
            access_token=token,
            user_id=str(new_user.id),
            aqua_id=new_user.aqua_id,
            prenom=new_user.prenom,
            nom=new_user.nom,
            gsm=new_user.gsm,
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
        result = await db.execute(select(User).where(User.gsm == request.gsm))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Numéro GSM non trouvé",
            )

        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mot de passe incorrect",
            )

        token = create_access_token({"sub": user.gsm})

        print(f"[AUTH] Connexion: {user.prenom} {user.nom} ({user.aqua_id})")

        return AuthResponse(
            access_token=token,
            user_id=str(user.id),
            aqua_id=user.aqua_id,
            prenom=user.prenom,
            nom=user.nom,
            gsm=user.gsm,
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
