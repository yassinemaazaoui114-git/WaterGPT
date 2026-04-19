from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import date
import uuid

from database import get_db, Parcelle, ReferentielPlante, User
from auth import get_current_user


# ─────────────────────────────────────────
# ROUTER — Gestion des parcelles agricoles
# ─────────────────────────────────────────

router = APIRouter(prefix="/parcelles", tags=["Parcelles"])


# ─────────────────────────────────────────
# SCHÉMAS PYDANTIC
# ─────────────────────────────────────────

class ParcelleCreate(BaseModel):
    type_plante_id: str          # UUID de la plante dans referentiel_plantes
    surface_m2: float            # Surface de la parcelle en m²
    date_plantation: Optional[date] = None


class ParcelleResponse(BaseModel):
    id: str
    user_id: str
    type_plante_id: str
    surface_m2: float
    date_plantation: Optional[date]
    actif: bool


# ─────────────────────────────────────────
# ROUTE — GET /parcelles
# ─────────────────────────────────────────

@router.get("/", response_model=list[ParcelleResponse])
async def get_parcelles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retourne toutes les parcelles actives de l'utilisateur authentifié."""
    result = await db.execute(
        select(Parcelle).where(
            Parcelle.user_id == current_user.id,
            Parcelle.actif == True,
        )
    )
    parcelles = result.scalars().all()

    print(f"[PARCELLES] {len(parcelles)} parcelle(s) récupérée(s) pour {current_user.user_code}")

    return [
        ParcelleResponse(
            id=str(p.id),
            user_id=str(p.user_id),
            type_plante_id=str(p.type_plante_id),
            surface_m2=float(p.surface_m2),
            date_plantation=p.date_plantation,
            actif=p.actif,
        )
        for p in parcelles
    ]


# ─────────────────────────────────────────
# ROUTE — POST /parcelles
# ─────────────────────────────────────────

@router.post("/", response_model=ParcelleResponse, status_code=status.HTTP_201_CREATED)
async def create_parcelle(
    request: ParcelleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Crée une nouvelle parcelle pour l'utilisateur authentifié.
    Vérifie que la plante référencée existe et que la surface est valide.
    """
    # Valider que la surface est positive
    if request.surface_m2 <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La surface doit être supérieure à 0 m²",
        )

    # Vérifier que la plante existe dans le référentiel
    try:
        plante_uuid = uuid.UUID(request.type_plante_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiant de plante invalide",
        )

    result = await db.execute(
        select(ReferentielPlante).where(ReferentielPlante.id == plante_uuid)
    )
    plante = result.scalar_one_or_none()

    if not plante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plante non trouvée",
        )

    # Créer la parcelle liée à l'utilisateur courant
    new_parcelle = Parcelle(
        id=uuid.uuid4(),
        user_id=current_user.id,
        type_plante_id=plante_uuid,
        surface_m2=request.surface_m2,
        date_plantation=request.date_plantation,
        actif=True,
    )

    db.add(new_parcelle)
    await db.commit()
    await db.refresh(new_parcelle)

    print(f"[PARCELLES] Nouvelle parcelle créée: {new_parcelle.id}")

    return ParcelleResponse(
        id=str(new_parcelle.id),
        user_id=str(new_parcelle.user_id),
        type_plante_id=str(new_parcelle.type_plante_id),
        surface_m2=float(new_parcelle.surface_m2),
        date_plantation=new_parcelle.date_plantation,
        actif=new_parcelle.actif,
    )


# ─────────────────────────────────────────
# ROUTE — DELETE /parcelles/{parcelle_id}
# ─────────────────────────────────────────

@router.delete("/{parcelle_id}")
async def delete_parcelle(
    parcelle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Désactive une parcelle (soft delete — actif = False).
    Un utilisateur ne peut désactiver que ses propres parcelles.
    """
    try:
        parcelle_uuid = uuid.UUID(parcelle_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiant de parcelle invalide",
        )

    # Vérifier que la parcelle appartient bien à l'utilisateur courant
    result = await db.execute(
        select(Parcelle).where(
            Parcelle.id == parcelle_uuid,
            Parcelle.user_id == current_user.id,
        )
    )
    parcelle = result.scalar_one_or_none()

    if not parcelle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parcelle non trouvée",
        )

    # Soft delete : on ne supprime pas, on désactive
    parcelle.actif = False
    await db.commit()

    print(f"[PARCELLES] Parcelle désactivée: {parcelle_id}")

    return {"message": "Parcelle désactivée"}
