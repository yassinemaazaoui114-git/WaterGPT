from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db, ReferentielPlante


# ─────────────────────────────────────────
# ROUTER — Référentiel des plantes (route publique)
# ─────────────────────────────────────────

router = APIRouter(prefix="/plantes", tags=["Référentiel Plantes"])


# ─────────────────────────────────────────
# SCHÉMA PYDANTIC
# ─────────────────────────────────────────

class PlanteResponse(BaseModel):
    id: str
    nom: str
    besoin_l_m2_jour: float
    description: Optional[str]


# ─────────────────────────────────────────
# ROUTE — GET /plantes (publique)
# ─────────────────────────────────────────

@router.get("/", response_model=list[PlanteResponse])
async def get_plantes(db: AsyncSession = Depends(get_db)):
    """
    Retourne toutes les plantes du référentiel agronomique.
    Route publique — utilisée pour alimenter les menus déroulants du frontend.
    """
    result = await db.execute(select(ReferentielPlante).order_by(ReferentielPlante.nom))
    plantes = result.scalars().all()

    print(f"[PLANTES] {len(plantes)} plante(s) retournée(s)")

    return [
        PlanteResponse(
            id=str(p.id),
            nom=p.nom,
            besoin_l_m2_jour=float(p.besoin_l_m2_jour),
            description=p.description,
        )
        for p in plantes
    ]
