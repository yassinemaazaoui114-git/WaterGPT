from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from database import get_db, User, TokenTransaction
from auth import get_current_user


router = APIRouter(prefix="/users", tags=["Users"])


class UserProfile(BaseModel):
    id: str
    aqua_id: str
    prenom: str
    nom: str
    gsm: str
    type: str
    localisation: Optional[str]
    created_at: str


class UserStats(BaseModel):
    total_tokens: float
    total_transactions: int
    profile: UserProfile


@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    print(f"[USERS] Profil récupéré: {current_user.aqua_id}")
    return UserProfile(
        id=str(current_user.id),
        aqua_id=current_user.aqua_id,
        prenom=current_user.prenom,
        nom=current_user.nom,
        gsm=current_user.gsm,
        type=current_user.type.value,
        localisation=current_user.localisation,
        created_at=current_user.created_at.isoformat(),
    )


@router.get("/me/stats", response_model=UserStats)
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            func.coalesce(func.sum(TokenTransaction.montant_aqua), 0).label("total_tokens"),
            func.count(TokenTransaction.id).label("total_transactions"),
        ).where(TokenTransaction.user_id == current_user.id)
    )
    row = result.one()

    print(f"[USERS] Stats récupérées pour: {current_user.aqua_id}")

    profile = UserProfile(
        id=str(current_user.id),
        aqua_id=current_user.aqua_id,
        prenom=current_user.prenom,
        nom=current_user.nom,
        gsm=current_user.gsm,
        type=current_user.type.value,
        localisation=current_user.localisation,
        created_at=current_user.created_at.isoformat(),
    )

    return UserStats(
        total_tokens=float(row.total_tokens),
        total_transactions=row.total_transactions,
        profile=profile,
    )
