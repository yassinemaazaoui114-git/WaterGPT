import asyncio
import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, select

from auth import hash_password
from database import (
    AsyncSessionLocal, Consommation, Parcelle, ReferentielPlante,
    SaisonType, TokenTransaction, TransactionType, User, UserType,
    create_tables,
)
from services.token_service import generate_fake_tx_hash


def get_saison(month: int) -> SaisonType:
    if month in [3, 4, 5]:
        return SaisonType.printemps
    if month in [6, 7, 8]:
        return SaisonType.ete
    if month in [9, 10, 11]:
        return SaisonType.automne
    return SaisonType.hiver


async def seed_demo():
    await create_tables()

    async with AsyncSessionLocal() as db:
        print("[DEMO] Suppression des données existantes...")
        await db.execute(delete(TokenTransaction))
        await db.execute(delete(Consommation))
        await db.execute(delete(Parcelle))
        await db.execute(delete(User))
        await db.commit()
        print("[DEMO] Tables vidées (referentiel_plantes conservé).")

        # ─── USERS ───
        users_config = [
            {"prenom": "Yassine", "nom": "Maazaoui",  "user_code": "123456", "type": UserType.agriculteur, "localisation": "Sfax"},
            {"prenom": "Ahmed",   "nom": "Ben Ali",    "user_code": "234567", "type": UserType.agriculteur, "localisation": "Nabeul"},
            {"prenom": "Fatima",  "nom": "Trabelsi",   "user_code": "345678", "type": UserType.agriculteur, "localisation": "Kairouan"},
            {"prenom": "Mohamed", "nom": "Gharbi",     "user_code": "456789", "type": UserType.entreprise,  "localisation": "Tunis"},
            {"prenom": "Sarra",   "nom": "Bouaziz",    "user_code": "567890", "type": UserType.agriculteur, "localisation": "Gafsa"},
        ]

        users = []
        for cfg in users_config:
            u = User(
                id=uuid.uuid4(),
                prenom=cfg["prenom"],
                nom=cfg["nom"],
                user_code=cfg["user_code"],
                password_hash=hash_password("demo123"),
                type=cfg["type"],
                localisation=cfg["localisation"],
                created_at=datetime.now(timezone.utc),
            )
            db.add(u)
            users.append(u)

        await db.commit()
        print(f"[DEMO] {len(users)} utilisateurs créés.")
        u1, u2, u3, u4, u5 = users

        # ─── PLANTES ───
        result = await db.execute(select(ReferentielPlante))
        plantes = {p.nom: p for p in result.scalars().all()}
        if not plantes:
            print("[DEMO] ERREUR : aucune plante trouvée. Lancez seed.py d'abord.")
            return

        # ─── PARCELLES ───
        parcelles_config = [
            # (user, nom_plante, surface_m2, date_plantation)
            (u1, "Olivier",  2000, date(2024,  3, 15)),
            (u1, "Tomate",    500, date(2024,  6,  1)),
            (u2, "Blé",      3000, date(2024,  1, 10)),
            (u2, "Maïs",     1000, date(2024,  4, 20)),
            (u3, "Amandier", 1500, date(2023, 11,  5)),
            (u4, "Agrumes",  5000, date(2023,  8, 20)),
            (u5, "Olivier",   800, date(2024,  2, 14)),
        ]

        parcelles = []
        for user, nom_plante, surface, dt_plant in parcelles_config:
            plante = plantes.get(nom_plante)
            if not plante:
                print(f"[DEMO] Plante '{nom_plante}' introuvable. Lancez seed.py d'abord.")
                return
            p = Parcelle(
                id=uuid.uuid4(),
                user_id=user.id,
                type_plante_id=plante.id,
                surface_m2=surface,
                date_plantation=dt_plant,
                actif=True,
            )
            db.add(p)
            parcelles.append((p, plante, surface))

        await db.commit()
        print(f"[DEMO] {len(parcelles)} parcelles créées.")

        # ─── CONSOMMATION ───
        today = date.today()
        month = today.month
        year = today.year
        saison = get_saison(month)
        sparse_days = [1, 4, 8, 12, 16, 20, 24, 28]

        for idx, (parcelle, plante, surface) in enumerate(parcelles):
            sensibilite = plante.sensibilite_saisonniere or {}
            facteur = float(sensibilite.get(str(month), 1.0))
            daily_quota = float(plante.besoin_l_m2_jour) * surface * facteur

            if idx == 0:
                # User 1 Olivier — all 30 days for a nice chart
                for day_offset in range(30):
                    d = date(year, month, 1) + timedelta(days=day_offset)
                    if d > today:
                        break
                    db.add(Consommation(
                        id=uuid.uuid4(),
                        parcelle_id=parcelle.id,
                        date=d,
                        litres_consommes=round(random.uniform(800, 1200), 3),
                        saison=saison,
                    ))
            else:
                # Other parcelles — sparse entries at 30-70 % of daily quota
                for day in sparse_days:
                    try:
                        d = date(year, month, day)
                    except ValueError:
                        continue
                    if d > today:
                        continue
                    litres = daily_quota * random.uniform(0.3, 0.7)
                    db.add(Consommation(
                        id=uuid.uuid4(),
                        parcelle_id=parcelle.id,
                        date=d,
                        litres_consommes=round(litres, 3),
                        saison=saison,
                    ))

        await db.commit()
        print("[DEMO] Consommation créée.")

        # ─── TOKEN TRANSACTIONS (mint + transfers) ───
        now = datetime.now(timezone.utc)

        def days_ago(n: int) -> datetime:
            return now - timedelta(days=n)

        # Mint per user
        mint_configs = [
            (u1, 3500.0,  270000.0,  30000.0, 0.889, 5),
            (u2, 2000.0,  500000.0, 100000.0, 0.800, 7),
            (u3, 1000.0,  135000.0,  40000.0, 0.703, 6),
            (u4, 5000.0,  825000.0, 100000.0, 0.879, 3),
            (u5,  600.0,  108000.0,  40000.0, 0.630, 8),
        ]
        for user, tokens, quota, reel, ratio, age in mint_configs:
            db.add(TokenTransaction(
                id=uuid.uuid4(),
                user_id=user.id,
                type=TransactionType.mint,
                montant_aqua=tokens,
                tx_hash=generate_fake_tx_hash(str(user.id), tokens),
                quota_theorique=quota,
                consommation_reelle=reel,
                ratio_economie=ratio,
                created_at=days_ago(age),
            ))

        # Transfer 1 — User2 → User1 : +50 tokens
        h1 = generate_fake_tx_hash(str(u2.id), 50.0)
        db.add(TokenTransaction(id=uuid.uuid4(), user_id=u2.id, type=TransactionType.mint, montant_aqua=-50.0,  tx_hash=h1, quota_theorique=0, consommation_reelle=0, ratio_economie=0, created_at=days_ago(4)))
        db.add(TokenTransaction(id=uuid.uuid4(), user_id=u1.id, type=TransactionType.mint, montant_aqua= 50.0,  tx_hash=h1, quota_theorique=0, consommation_reelle=0, ratio_economie=0, created_at=days_ago(4)))

        # Transfer 2 — User1 → User3 : -30 tokens
        h2 = generate_fake_tx_hash(str(u1.id), 30.0)
        db.add(TokenTransaction(id=uuid.uuid4(), user_id=u1.id, type=TransactionType.mint, montant_aqua=-30.0,  tx_hash=h2, quota_theorique=0, consommation_reelle=0, ratio_economie=0, created_at=days_ago(3)))
        db.add(TokenTransaction(id=uuid.uuid4(), user_id=u3.id, type=TransactionType.mint, montant_aqua= 30.0,  tx_hash=h2, quota_theorique=0, consommation_reelle=0, ratio_economie=0, created_at=days_ago(3)))

        # Transfer 3 — User4 → User1 : +100 tokens
        h3 = generate_fake_tx_hash(str(u4.id), 100.0)
        db.add(TokenTransaction(id=uuid.uuid4(), user_id=u4.id, type=TransactionType.mint, montant_aqua=-100.0, tx_hash=h3, quota_theorique=0, consommation_reelle=0, ratio_economie=0, created_at=days_ago(2)))
        db.add(TokenTransaction(id=uuid.uuid4(), user_id=u1.id, type=TransactionType.mint, montant_aqua= 100.0, tx_hash=h3, quota_theorique=0, consommation_reelle=0, ratio_economie=0, created_at=days_ago(2)))

        await db.commit()
        print("[DEMO] Transactions créées.")
        print(f"[DEMO] Solde Yassine attendu : {3500 + 50 - 30 + 100} tokens")
        print("[DEMO] ✅ Seed demo terminé avec succès !")
        print("\n  Login : user_code=123456  |  password=demo123")


if __name__ == "__main__":
    asyncio.run(seed_demo())
