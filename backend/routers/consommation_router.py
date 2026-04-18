from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid

from database import get_db, Consommation, Parcelle, SaisonType, User
from auth import get_current_user


# ─────────────────────────────────────────
# ROUTER — Enregistrement de la consommation d'eau
# ─────────────────────────────────────────

router = APIRouter(prefix="/consommation", tags=["Consommation"])


# ─────────────────────────────────────────
# SCHÉMAS PYDANTIC
# ─────────────────────────────────────────

class ConsommationCreate(BaseModel):
    parcelle_id: str
    date: date
    litres_consommes: float
    saison: SaisonType


class ConsommationResponse(BaseModel):
    id: str
    parcelle_id: str
    date: date
    litres_consommes: float
    saison: str


class ConsommationSummary(BaseModel):
    parcelle_id: str
    total_litres: float
    nombre_entrees: int
    periode: str              # Format "YYYY-MM" du mois résumé


# ─────────────────────────────────────────
# HELPER — Vérifier qu'une parcelle appartient à l'utilisateur
# ─────────────────────────────────────────

async def _get_user_parcelle(
    parcelle_id: str,
    user_id,
    db: AsyncSession,
) -> Parcelle:
    """Retourne la parcelle si elle appartient à l'utilisateur, lève 403 sinon."""
    try:
        parcelle_uuid = uuid.UUID(parcelle_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiant de parcelle invalide",
        )

    result = await db.execute(
        select(Parcelle).where(Parcelle.id == parcelle_uuid)
    )
    parcelle = result.scalar_one_or_none()

    if not parcelle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcelle non trouvée",
        )

    # Contrôle d'accès : l'utilisateur ne peut accéder qu'à ses propres parcelles
    if parcelle.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé à cette parcelle",
        )

    return parcelle


# ─────────────────────────────────────────
# ROUTE — POST /consommation
# ─────────────────────────────────────────

@router.post("/", response_model=ConsommationResponse, status_code=status.HTTP_201_CREATED)
async def add_consommation(
    request: ConsommationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enregistre une nouvelle entrée de consommation d'eau pour une parcelle.
    Vérifie que l'accès est autorisé et que les valeurs sont réalistes.
    """
    # Vérifier l'ownership de la parcelle
    parcelle = await _get_user_parcelle(request.parcelle_id, current_user.id, db)

    # Valider que la consommation n'est pas négative
    if request.litres_consommes < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La consommation ne peut pas être négative",
        )

    # Règle de sécurité : consommation max = surface × 1000 L/m²/jour
    max_litres = float(parcelle.surface_m2) * 1000
    if request.litres_consommes > max_litres:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Consommation irréaliste pour cette surface (max {max_litres:.0f} L)",
        )

    # Créer l'entrée de consommation
    new_conso = Consommation(
        id=uuid.uuid4(),
        parcelle_id=uuid.UUID(request.parcelle_id),
        date=request.date,
        litres_consommes=request.litres_consommes,
        saison=request.saison,
    )

    db.add(new_conso)
    await db.commit()
    await db.refresh(new_conso)

    print(f"[CONSO] Nouvelle entrée: {request.litres_consommes}L pour parcelle {request.parcelle_id}")

    return ConsommationResponse(
        id=str(new_conso.id),
        parcelle_id=str(new_conso.parcelle_id),
        date=new_conso.date,
        litres_consommes=float(new_conso.litres_consommes),
        saison=new_conso.saison.value,
    )


# ─────────────────────────────────────────
# ROUTE — GET /consommation/{parcelle_id}
# ─────────────────────────────────────────

@router.get("/{parcelle_id}", response_model=list[ConsommationResponse])
async def get_consommation(
    parcelle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retourne tout l'historique de consommation d'une parcelle, du plus récent au plus ancien."""
    # Vérifier l'ownership
    await _get_user_parcelle(parcelle_id, current_user.id, db)

    result = await db.execute(
        select(Consommation)
        .where(Consommation.parcelle_id == uuid.UUID(parcelle_id))
        .order_by(Consommation.date.desc())
    )
    entries = result.scalars().all()

    print(f"[CONSO] {len(entries)} entrée(s) récupérée(s) pour parcelle {parcelle_id}")

    return [
        ConsommationResponse(
            id=str(e.id),
            parcelle_id=str(e.parcelle_id),
            date=e.date,
            litres_consommes=float(e.litres_consommes),
            saison=e.saison.value,
        )
        for e in entries
    ]


# ─────────────────────────────────────────
# ROUTE — GET /consommation/{parcelle_id}/summary
# ─────────────────────────────────────────

@router.get("/{parcelle_id}/summary", response_model=ConsommationSummary)
async def get_consommation_summary(
    parcelle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne un résumé de la consommation du mois courant pour une parcelle :
    total en litres et nombre d'entrées enregistrées.
    """
    # Vérifier l'ownership
    await _get_user_parcelle(parcelle_id, current_user.id, db)

    now = datetime.now()
    current_month = now.month
    current_year = now.year

    # Agréger les données du mois en cours avec PostgreSQL extract()
    result = await db.execute(
        select(
            func.coalesce(func.sum(Consommation.litres_consommes), 0).label("total_litres"),
            func.count(Consommation.id).label("nombre_entrees"),
        ).where(
            Consommation.parcelle_id == uuid.UUID(parcelle_id),
            extract("month", Consommation.date) == current_month,
            extract("year", Consommation.date) == current_year,
        )
    )
    row = result.one()

    periode = f"{current_year}-{current_month:02d}"
    print(f"[CONSO] Résumé calculé pour parcelle {parcelle_id}")

    return ConsommationSummary(
        parcelle_id=parcelle_id,
        total_litres=float(row.total_litres),
        nombre_entrees=row.nombre_entrees,
        periode=periode,
    )
