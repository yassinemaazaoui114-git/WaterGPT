import calendar
import hashlib
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract

from database import (
    Parcelle, Consommation, ReferentielPlante,
    TokenTransaction, TransactionType, User,
)


# ─────────────────────────────────────────
# HELPER — Génération d'un hash de transaction réaliste
# ─────────────────────────────────────────

def generate_fake_tx_hash(user_id: str, tokens: float) -> str:
    """
    Génère un hash de transaction réaliste pour la démo
    Format identique aux vrais hash Ethereum/Polygon
    """
    raw = f"{user_id}{tokens}{time.time()}{uuid.uuid4()}"
    hash_bytes = hashlib.sha256(raw.encode()).hexdigest()
    return f"0x{hash_bytes}"


# ─────────────────────────────────────────
# FONCTION 1 — Calcul du quota théorique mensuel
# ─────────────────────────────────────────

async def calculate_quota(
    parcelle_id: str,
    mois: int,
    annee: int,
    db: AsyncSession,
) -> dict:
    """
    Calcule le quota théorique d'eau pour une parcelle sur un mois donné.
    Formule : quota = surface_m2 × besoin_l_m2_jour × facteur_saisonnier × jours_du_mois
    """
    try:
        parcelle_uuid = uuid.UUID(parcelle_id)

        # Charger la parcelle et sa plante de référence en une seule requête jointe
        result = await db.execute(
            select(Parcelle, ReferentielPlante).join(
                ReferentielPlante,
                Parcelle.type_plante_id == ReferentielPlante.id,
            ).where(Parcelle.id == parcelle_uuid)
        )
        row = result.one_or_none()

        if not row:
            raise ValueError(f"Parcelle {parcelle_id} introuvable")

        parcelle, plante = row

        # Récupérer le facteur saisonnier depuis le JSONB de la plante
        # La clé est le numéro du mois en chaîne de caractères ("1" à "12")
        sensibilite = plante.sensibilite_saisonniere or {}
        facteur_saisonnier = float(sensibilite.get(str(mois), 1.0))

        # Nombre de jours dans le mois concerné
        jours_du_mois = calendar.monthrange(annee, mois)[1]

        # Calcul du quota mensuel total en litres
        quota = (
            float(parcelle.surface_m2)
            * float(plante.besoin_l_m2_jour)
            * facteur_saisonnier
            * jours_du_mois
        )

        print(f"[TOKEN] Quota calculé: {quota:.2f}L pour parcelle {parcelle_id}")

        return {
            "parcelle_id": parcelle_id,
            "mois": mois,
            "annee": annee,
            "surface_m2": float(parcelle.surface_m2),
            "besoin_l_m2_jour": float(plante.besoin_l_m2_jour),
            "facteur_saisonnier": facteur_saisonnier,
            "jours_du_mois": jours_du_mois,
            "quota_theorique": round(quota, 3),
            "plante_nom": plante.nom,
        }

    except Exception as e:
        print(f"[TOKEN] Erreur lors du calcul du quota: {e}")
        raise


# ─────────────────────────────────────────
# FONCTION 2 — Consommation réelle du mois
# ─────────────────────────────────────────

async def calculate_consommation_reelle(
    parcelle_id: str,
    mois: int,
    annee: int,
    db: AsyncSession,
) -> float:
    """
    Somme les litres réellement consommés pour une parcelle sur un mois donné.
    Retourne 0.0 si aucune entrée n'est enregistrée.
    """
    try:
        # Agréger avec extract() pour filtrer par mois et année PostgreSQL
        result = await db.execute(
            select(
                func.coalesce(func.sum(Consommation.litres_consommes), 0).label("total")
            ).where(
                Consommation.parcelle_id == uuid.UUID(parcelle_id),
                extract("month", Consommation.date) == mois,
                extract("year", Consommation.date) == annee,
            )
        )
        total = float(result.scalar())

        print(f"[TOKEN] Consommation réelle: {total:.3f}L pour parcelle {parcelle_id}")
        return total

    except Exception as e:
        print(f"[TOKEN] Erreur lors du calcul de la consommation réelle: {e}")
        raise


# ─────────────────────────────────────────
# FONCTION 3 — Calcul des tokens AquaToken
# ─────────────────────────────────────────

def calculate_tokens(quota: float, reel: float) -> dict:
    """
    Calcule les tokens selon la formule officielle AquaToken.
    tokens = économie × taux_base × (1 + ratio / 100)

    Le ratio représente le pourcentage d'eau économisé par rapport au quota.
    Un minimum de 5% d'économie est requis pour être éligible.
    """
    economie = quota - reel

    # Pas de tokens si la consommation dépasse le quota
    if economie <= 0:
        return {
            "quota": quota,
            "reel": reel,
            "economie": 0.0,
            "ratio": 0.0,
            "tokens": 0.0,
            "eligible": False,
        }

    # Calcul du ratio d'économie en pourcentage — plafonné à 100%
    ratio = (economie / quota) * 100
    ratio = min(100.0, max(0.0, ratio))

    # Seuil minimum : 5% d'économie requis pour gagner des tokens
    seuil_minimum = 5.0
    if ratio < seuil_minimum:
        return {
            "quota": quota,
            "reel": reel,
            "economie": round(economie, 3),
            "ratio": round(ratio, 2),
            "tokens": 0.0,
            "eligible": False,
        }

    # Formule officielle : 0.1 token par litre économisé + bonus proportionnel au ratio
    taux_base = 0.1
    tokens = economie * taux_base * (1 + ratio / 100)
    tokens = round(tokens, 8)

    return {
        "quota": quota,
        "reel": reel,
        "economie": round(economie, 3),
        "ratio": round(ratio, 2),
        "tokens": tokens,
        "eligible": True,
    }


# ─────────────────────────────────────────
# FONCTION 4 — Calcul du Trust Score
# ─────────────────────────────────────────

async def calculate_trust_score(user_id: str, db: AsyncSession) -> float:
    """
    Calcule le Trust Score d'un utilisateur entre 0 et 1, basé sur :
    - Le ratio de transactions positives (économies validées)
    - Le ratio moyen d'économie sur l'ensemble de ses transactions
    """
    try:
        # Récupérer toutes les transactions de l'utilisateur
        result = await db.execute(
            select(TokenTransaction).where(
                TokenTransaction.user_id == uuid.UUID(user_id)
            )
        )
        transactions = result.scalars().all()

        # Score neutre par défaut pour les nouveaux utilisateurs sans historique
        if not transactions:
            return 0.5

        total = len(transactions)

        # Transactions positives = un mint avec économie réelle (montant > 0)
        positives = sum(1 for t in transactions if t.montant_aqua and t.montant_aqua > 0)
        base_score = positives / total

        # Bonus basé sur le ratio moyen d'économie (max +0.20 au score)
        ratios = [
            float(t.ratio_economie)
            for t in transactions
            if t.ratio_economie is not None
        ]
        avg_ratio = (sum(ratios) / len(ratios)) if ratios else 0.0
        bonus = min(0.2, avg_ratio * 0.002)

        trust_score = min(1.0, base_score + bonus)
        trust_score = round(trust_score, 4)

        print(f"[TOKEN] Trust Score calculé: {trust_score} pour user {user_id}")
        return trust_score

    except Exception as e:
        print(f"[TOKEN] Erreur lors du calcul du Trust Score: {e}")
        raise


# ─────────────────────────────────────────
# FONCTION 5 — Pipeline complet de mint
# ─────────────────────────────────────────

async def mint_tokens(
    user_id: str,
    parcelle_id: str,
    mois: int,
    annee: int,
    db: AsyncSession,
) -> dict:
    """
    Orchestre l'ensemble du pipeline de calcul et enregistre un mint de tokens :
    quota → consommation réelle → calcul tokens → enregistrement en base.
    Le tx_hash est un placeholder local jusqu'à l'intégration blockchain (Phase 10).
    """
    try:
        # ── Étape 1 : Quota théorique du mois ──
        quota_result = await calculate_quota(parcelle_id, mois, annee, db)

        # ── Étape 2 : Consommation réelle du mois ──
        reel = await calculate_consommation_reelle(parcelle_id, mois, annee, db)

        # ── Étape 3 : Calcul des tokens ──
        token_result = calculate_tokens(quota_result["quota_theorique"], reel)

        # ── Vérification d'éligibilité ──
        if not token_result["eligible"]:
            return {
                "success": False,
                "reason": "Économie insuffisante (< 5%)",
                "details": token_result,
            }

        # ── Étape 4 : Trust Score actuel de l'utilisateur ──
        trust_score = await calculate_trust_score(user_id, db)

        # ── Étape 5 : Enregistrement de la transaction de mint ──
        tx_hash = generate_fake_tx_hash(user_id, token_result["tokens"])

        transaction = TokenTransaction(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            type=TransactionType.mint,
            montant_aqua=token_result["tokens"],
            tx_hash=tx_hash,
            quota_theorique=quota_result["quota_theorique"],
            consommation_reelle=reel,
            ratio_economie=token_result["ratio"] / 100,   # stocker en décimal (0-1)
        )

        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        print(f"[TOKEN] Mint enregistré: {token_result['tokens']} AQUA pour user {user_id}")

        return {
            "success": True,
            "tokens_minted": token_result["tokens"],
            "quota": quota_result["quota_theorique"],
            "reel": reel,
            "economie": token_result["economie"],
            "ratio": token_result["ratio"],
            "trust_score": trust_score,
            "tx_hash": transaction.tx_hash,
            "polygonscan_url": f"https://amoy.polygonscan.com/tx/{transaction.tx_hash}",
            "blockchain": "Polygon Amoy (Simulation)",
        }

    except Exception as e:
        print(f"[TOKEN] Erreur lors du mint: {e}")
        raise
