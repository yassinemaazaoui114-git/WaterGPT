from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import get_db, User, TokenTransaction, TransactionType
from auth import get_current_user
from services.token_service import (
    calculate_quota,
    calculate_consommation_reelle,
    calculate_tokens,
    calculate_trust_score,
    mint_tokens,
    generate_fake_tx_hash,
)
from services.notification_service import create_notification
from database import NotificationType


# ─────────────────────────────────────────
# ROUTER — Calcul et gestion des tokens AquaToken
# ─────────────────────────────────────────

router = APIRouter(prefix="/tokens", tags=["Tokens"])


# ─────────────────────────────────────────
# SCHÉMAS PYDANTIC
# ─────────────────────────────────────────

class MintRequest(BaseModel):
    parcelle_id: str    # UUID de la parcelle pour laquelle minter
    mois: int           # Mois concerné (1-12)
    annee: int          # Année concernée


class TransferRequest(BaseModel):
    receiver_code: str
    amount: float
    reason: Optional[str] = "Transfert de tokens"


class TransactionResponse(BaseModel):
    id: str
    montant_aqua: float
    tx_hash: str
    quota_theorique: float
    consommation_reelle: float
    ratio_economie: float
    created_at: str


# ─────────────────────────────────────────
# ROUTE — GET /tokens/quota/{parcelle_id}
# ─────────────────────────────────────────

@router.get("/quota/{parcelle_id}")
async def get_quota(
    parcelle_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Calcule le quota théorique, la consommation réelle et les tokens potentiels
    pour le mois courant. Utile pour afficher la situation en temps réel.
    """
    try:
        now = datetime.now()
        mois = now.month
        annee = now.year

        # Calculer le quota théorique mensuel
        quota_result = await calculate_quota(parcelle_id, mois, annee, db)

        # Calculer la consommation réelle enregistrée ce mois-ci
        reel = await calculate_consommation_reelle(parcelle_id, mois, annee, db)

        # Simuler les tokens qui pourraient être mintés maintenant
        token_result = calculate_tokens(quota_result["quota_theorique"], reel)

        return {
            **quota_result,
            "consommation_reelle": reel,
            **token_result,
        }

    except Exception as e:
        print(f"[TOKEN] Erreur dans GET /quota: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ─────────────────────────────────────────
# ROUTE — POST /tokens/mint
# ─────────────────────────────────────────

@router.post("/mint")
async def mint(
    request: MintRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Déclenche le pipeline complet de mint pour un mois donné :
    calcul quota → consommation réelle → tokens → enregistrement en base.
    """
    try:
        result = await mint_tokens(
            user_id=str(current_user.id),
            parcelle_id=request.parcelle_id,
            mois=request.mois,
            annee=request.annee,
            db=db,
        )
        return result

    except Exception as e:
        print(f"[TOKEN] Erreur dans POST /mint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ─────────────────────────────────────────
# ROUTE — GET /tokens/balance
# ─────────────────────────────────────────

@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne le solde total de tokens AquaToken et le nombre de transactions
    pour l'utilisateur authentifié.
    """
    try:
        result = await db.execute(
            select(
                func.coalesce(func.sum(TokenTransaction.montant_aqua), 0).label("balance"),
                func.count(TokenTransaction.id).label("transactions"),
            ).where(TokenTransaction.user_id == current_user.id)
        )
        row = result.one()

        return {
            "balance": float(row.balance),
            "transactions": row.transactions,
        }

    except Exception as e:
        print(f"[TOKEN] Erreur dans GET /balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ─────────────────────────────────────────
# ROUTE — GET /tokens/trust-score
# ─────────────────────────────────────────

@router.get("/trust-score")
async def get_trust_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne le Trust Score actuel de l'utilisateur (valeur entre 0 et 1).
    Basé sur son historique de transactions et son ratio moyen d'économie.
    """
    try:
        trust_score = await calculate_trust_score(str(current_user.id), db)
        return {"trust_score": trust_score}

    except Exception as e:
        print(f"[TOKEN] Erreur dans GET /trust-score: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ─────────────────────────────────────────
# ROUTE — GET /tokens/transactions
# ─────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionResponse])
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne les 20 dernières transactions de tokens pour l'utilisateur authentifié.
    Ordonnées par date décroissante.
    """
    try:
        result = await db.execute(
            select(TokenTransaction)
            .where(TokenTransaction.user_id == current_user.id)
            .order_by(TokenTransaction.created_at.desc())
            .limit(20)
        )
        transactions = result.scalars().all()

        return [
            TransactionResponse(
                id=str(tx.id),
                montant_aqua=float(tx.montant_aqua or 0),
                tx_hash=tx.tx_hash or "",
                quota_theorique=float(tx.quota_theorique or 0),
                consommation_reelle=float(tx.consommation_reelle or 0),
                ratio_economie=float(tx.ratio_economie or 0),
                created_at=tx.created_at.isoformat() if tx.created_at else "",
            )
            for tx in transactions
        ]

    except Exception as e:
        print(f"[TOKEN] Erreur dans GET /transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ─────────────────────────────────────────
# ROUTE — POST /tokens/transfer
# ─────────────────────────────────────────

@router.post("/transfer")
async def transfer_tokens(
    request: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not (len(request.receiver_code) == 6 and request.receiver_code.isdigit()):
        raise HTTPException(status_code=400, detail="Le code destinataire doit contenir exactement 6 chiffres")

    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à zéro")

    receiver_result = await db.execute(select(User).where(User.user_code == request.receiver_code))
    receiver = receiver_result.scalar_one_or_none()
    if not receiver:
        raise HTTPException(status_code=404, detail=f"Aucun utilisateur avec le code {request.receiver_code}")

    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous envoyer des tokens")

    balance_result = await db.execute(
        select(func.coalesce(func.sum(TokenTransaction.montant_aqua), 0)).where(
            TokenTransaction.user_id == current_user.id
        )
    )
    balance = float(balance_result.scalar())
    if balance < request.amount:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. Vous avez {balance:.2f} tokens")

    tx_hash = generate_fake_tx_hash(str(current_user.id), request.amount)

    debit = TokenTransaction(
        user_id=current_user.id,
        type=TransactionType.mint,
        montant_aqua=-request.amount,
        tx_hash=tx_hash,
        quota_theorique=0,
        consommation_reelle=0,
        ratio_economie=0,
    )
    credit = TokenTransaction(
        user_id=receiver.id,
        type=TransactionType.mint,
        montant_aqua=request.amount,
        tx_hash=tx_hash,
        quota_theorique=0,
        consommation_reelle=0,
        ratio_economie=0,
    )
    db.add(debit)
    db.add(credit)

    await create_notification(
        db=db,
        user_id=str(receiver.id),
        type=NotificationType.transfer_received,
        title="Tokens reçus 🪙",
        message=f"{current_user.prenom} {current_user.nom} vous a envoyé {request.amount:.2f} tokens",
        data={
            "sender_code": current_user.user_code,
            "sender_name": f"{current_user.prenom} {current_user.nom}",
            "amount": request.amount,
            "reason": request.reason or "Transfert de tokens",
        },
    )
    await create_notification(
        db=db,
        user_id=str(current_user.id),
        type=NotificationType.transfer_sent,
        title="Tokens envoyés ✅",
        message=f"Vous avez envoyé {request.amount:.2f} tokens à {receiver.prenom} {receiver.nom}",
        data={
            "receiver_code": request.receiver_code,
            "receiver_name": f"{receiver.prenom} {receiver.nom}",
            "amount": request.amount,
        },
    )

    await db.commit()

    print(f"[TOKEN] Transfert: {request.amount} tokens de {current_user.user_code} → {request.receiver_code}")

    return {
        "success": True,
        "message": f"{request.amount} tokens envoyés à {receiver.prenom} {receiver.nom}",
        "receiver_name": f"{receiver.prenom} {receiver.nom}",
        "receiver_code": request.receiver_code,
        "amount": request.amount,
        "tx_hash": tx_hash,
    }
