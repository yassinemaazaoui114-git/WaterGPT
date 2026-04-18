import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal, ReferentielPlante, create_tables


# ─────────────────────────────────────────
# DONNÉES DE RÉFÉRENCE — Plantes agricoles tunisiennes
# ─────────────────────────────────────────

# Coefficients saisonniers : clé = numéro du mois (1-12), valeur = multiplicateur
# Formule quota journalier : besoin_l_m2_jour × surface_m2 × coefficient_mois
PLANTS_DATA = [
    {
        "nom": "Olivier",
        "besoin_l_m2_jour": 4.5,
        "sensibilite_saisonniere": {
            "1": 0.6, "2": 0.6, "3": 0.8, "4": 1.0,
            "5": 1.2, "6": 1.5, "7": 1.5, "8": 1.4,
            "9": 1.1, "10": 0.9, "11": 0.7, "12": 0.6,
        },
        "description": "Résistant à la sécheresse. Irrigation limitée en été suffit.",
    },
    {
        "nom": "Blé",
        "besoin_l_m2_jour": 3.5,
        "sensibilite_saisonniere": {
            "1": 0.7, "2": 0.8, "3": 1.0, "4": 1.3,
            "5": 1.5, "6": 1.2, "7": 0.5, "8": 0.5,
            "9": 0.7, "10": 0.9, "11": 0.8, "12": 0.7,
        },
        "description": "Critique pendant la floraison et le remplissage du grain.",
    },
    {
        "nom": "Tomate",
        "besoin_l_m2_jour": 5.0,
        "sensibilite_saisonniere": {
            "1": 0.5, "2": 0.5, "3": 0.8, "4": 1.0,
            "5": 1.3, "6": 1.5, "7": 1.5, "8": 1.4,
            "9": 1.2, "10": 0.9, "11": 0.6, "12": 0.5,
        },
        "description": "Besoin régulier. Très sensible aux écarts d'humidité.",
    },
    {
        "nom": "Maïs",
        "besoin_l_m2_jour": 6.0,
        "sensibilite_saisonniere": {
            "1": 0.4, "2": 0.4, "3": 0.6, "4": 0.9,
            "5": 1.2, "6": 1.5, "7": 1.5, "8": 1.4,
            "9": 1.0, "10": 0.7, "11": 0.5, "12": 0.4,
        },
        "description": "Gros consommateur d'eau en été.",
    },
    {
        "nom": "Agrumes",
        "besoin_l_m2_jour": 5.5,
        "sensibilite_saisonniere": {
            "1": 0.7, "2": 0.7, "3": 0.9, "4": 1.1,
            "5": 1.3, "6": 1.5, "7": 1.5, "8": 1.4,
            "9": 1.2, "10": 1.0, "11": 0.8, "12": 0.7,
        },
        "description": "Besoin constant. Très sensibles au stress hydrique.",
    },
    {
        "nom": "Amandier",
        "besoin_l_m2_jour": 3.0,
        "sensibilite_saisonniere": {
            "1": 0.5, "2": 0.6, "3": 0.9, "4": 1.2,
            "5": 1.4, "6": 1.5, "7": 1.3, "8": 1.2,
            "9": 1.0, "10": 0.8, "11": 0.6, "12": 0.5,
        },
        "description": "Tolérant à la sécheresse une fois bien établi.",
    },
]


# ─────────────────────────────────────────
# FONCTION DE SEED
# ─────────────────────────────────────────

async def seed_plants():
    """
    Insère les plantes de référence dans la base de données.
    Ignore les doublons (vérification par nom avant insertion).
    """
    # S'assurer que les tables existent avant de seeder
    await create_tables()

    async with AsyncSessionLocal() as session:
        for plant_data in PLANTS_DATA:
            # Vérifier si la plante existe déjà pour éviter les doublons
            result = await session.execute(
                select(ReferentielPlante).where(
                    ReferentielPlante.nom == plant_data["nom"]
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"[SEED] {plant_data['nom']} existe déjà, ignoré")
                continue

            # Insérer la nouvelle plante
            new_plant = ReferentielPlante(
                nom=plant_data["nom"],
                besoin_l_m2_jour=plant_data["besoin_l_m2_jour"],
                sensibilite_saisonniere=plant_data["sensibilite_saisonniere"],
                description=plant_data["description"],
            )
            session.add(new_plant)
            print(f"[SEED] Plante ajoutée: {plant_data['nom']}")

        # Valider toutes les insertions en une seule transaction
        await session.commit()

    print("[SEED] Seed terminé avec succès.")


# ─────────────────────────────────────────
# BLOC PRINCIPAL
# ─────────────────────────────────────────

if __name__ == "__main__":
    asyncio.run(seed_plants())
