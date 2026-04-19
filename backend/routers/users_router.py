from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, date

from database import get_db, User, TokenTransaction, Consommation, Parcelle
from auth import get_current_user


router = APIRouter(prefix="/users", tags=["Users"])


class UserProfile(BaseModel):
    id: str
    user_code: str
    prenom: str
    nom: str
    type: str
    localisation: Optional[str]
    created_at: str


class UserStats(BaseModel):
    total_tokens: float
    total_transactions: int
    total_consommation_litres: float
    profile: UserProfile


@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    print(f"[USERS] Profil récupéré: {current_user.user_code}")
    return UserProfile(
        id=str(current_user.id),
        user_code=current_user.user_code,
        prenom=current_user.prenom,
        nom=current_user.nom,
        type=current_user.type.value,
        localisation=current_user.localisation,
        created_at=current_user.created_at.isoformat(),
    )


@router.get("/me/stats", response_model=UserStats)
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    period: int = Query(default=30, ge=7, le=30),
):
    cutoff_date = datetime.now() - timedelta(days=period)

    result = await db.execute(
        select(
            func.coalesce(func.sum(TokenTransaction.montant_aqua), 0).label("total_tokens"),
            func.count(TokenTransaction.id).label("total_transactions"),
        ).where(
            TokenTransaction.user_id == current_user.id,
            TokenTransaction.created_at >= cutoff_date,
        )
    )
    row = result.one()

    conso_result = await db.execute(
        select(func.coalesce(func.sum(Consommation.litres_consommes), 0))
        .join(Parcelle, Consommation.parcelle_id == Parcelle.id)
        .where(
            Parcelle.user_id == current_user.id,
            Consommation.date >= cutoff_date.date(),
        )
    )
    total_consommation = float(conso_result.scalar() or 0)

    print(f"[USERS] Stats récupérées pour: {current_user.user_code}")

    profile = UserProfile(
        id=str(current_user.id),
        user_code=current_user.user_code,
        prenom=current_user.prenom,
        nom=current_user.nom,
        type=current_user.type.value,
        localisation=current_user.localisation,
        created_at=current_user.created_at.isoformat(),
    )

    return UserStats(
        total_tokens=float(row.total_tokens),
        total_transactions=row.total_transactions,
        total_consommation_litres=total_consommation,
        profile=profile,
    )


@router.get("/me/chart-data")
async def get_chart_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    period: int = Query(default=30, ge=7, le=30),
):
    parcelles_result = await db.execute(
        select(Parcelle.id).where(
            Parcelle.user_id == current_user.id,
            Parcelle.actif == True,
        )
    )
    parcelle_ids = [row[0] for row in parcelles_result.fetchall()]

    if not parcelle_ids:
        return {"data": [], "labels": [], "max": 1}

    cutoff = date.today() - timedelta(days=period)

    result = await db.execute(
        select(
            Consommation.date,
            func.sum(Consommation.litres_consommes).label("total"),
        )
        .where(
            Consommation.parcelle_id.in_(parcelle_ids),
            Consommation.date >= cutoff,
        )
        .group_by(Consommation.date)
        .order_by(Consommation.date)
    )
    rows = result.fetchall()

    date_map = {row.date: float(row.total) for row in rows}
    labels = []
    data = []
    for i in range(period):
        d = cutoff + timedelta(days=i + 1)
        labels.append(d.strftime("%d/%m"))
        data.append(date_map.get(d, 0))

    max_val = max(data) if data and max(data) > 0 else 1

    print(f"[USERS] Chart data: {sum(1 for v in data if v > 0)} jours avec données")
    return {"labels": labels, "data": data, "max": max_val}
