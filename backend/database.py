from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import (
    Column, String, Numeric, Boolean, Date,
    DateTime, Text, Enum, ForeignKey, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum
from datetime import datetime, timezone
from dotenv import load_dotenv
import os


# ─────────────────────────────────────────
# CONFIGURATION — Connexion à la base de données PostgreSQL
# ─────────────────────────────────────────

# Charger les variables d'environnement depuis backend/.env
load_dotenv()

# URL de connexion asynchrone (asyncpg driver)
DATABASE_URL = os.getenv("DATABASE_URL")

# Moteur SQLAlchemy asynchrone — echo=True affiche les requêtes SQL dans la console
engine = create_async_engine(DATABASE_URL, echo=True)

# Fabrique de sessions asynchrones (expire_on_commit=False évite les lazy-loads post-commit)
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Classe de base pour tous les modèles ORM
Base = declarative_base()


# ─────────────────────────────────────────
# DÉPENDANCE FastAPI — Injection de session DB
# ─────────────────────────────────────────

async def get_db():
    """Générateur de session à injecter via Depends(get_db) dans les routes FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ─────────────────────────────────────────
# ENUMS — Types métier de la plateforme AquaToken
# ─────────────────────────────────────────

class UserType(str, enum.Enum):
    """Type de compte utilisateur."""
    agriculteur = "agriculteur"
    entreprise = "entreprise"


class SaisonType(str, enum.Enum):
    """Saison agricole pour l'enregistrement de la consommation."""
    printemps = "printemps"
    ete = "été"
    automne = "automne"
    hiver = "hiver"


class TransactionType(str, enum.Enum):
    """Type de transaction de tokens AquaToken."""
    mint = "mint"


# ─────────────────────────────────────────
# MODÈLES ORM — Schéma de la base de données
# ─────────────────────────────────────────

class User(Base):
    """Compte utilisateur agriculteur identifié par son numéro GSM."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prenom = Column(String(80), nullable=False, default="")
    nom = Column(String(80), nullable=False, default="")
    gsm = Column(String(20), unique=True, nullable=False, default="")
    aqua_id = Column(String(10), unique=True, nullable=False, default="")
    # Mot de passe haché avec bcrypt — jamais stocké en clair
    password_hash = Column(String(255), nullable=False, default="")
    type = Column(Enum(UserType), nullable=False)
    localisation = Column(String(100))
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class ReferentielPlante(Base):
    """Référentiel agronomique — besoins en eau par culture."""
    __tablename__ = "referentiel_plantes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String(80), unique=True, nullable=False)
    # Besoin théorique en litres par m² par jour
    besoin_l_m2_jour = Column(Numeric(6, 3), nullable=False)
    # Coefficients saisonniers stockés en JSON : {"printemps": 1.1, "été": 1.5, ...}
    sensibilite_saisonniere = Column(JSONB)
    description = Column(Text)


class Parcelle(Base):
    """Parcelle agricole appartenant à un utilisateur."""
    __tablename__ = "parcelles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type_plante_id = Column(
        UUID(as_uuid=True),
        ForeignKey("referentiel_plantes.id"),
        nullable=False,
    )
    surface_m2 = Column(Numeric(10, 2), nullable=False)
    date_plantation = Column(Date)
    actif = Column(Boolean, default=True)


class Consommation(Base):
    """Enregistrement journalier de la consommation d'eau d'une parcelle."""
    __tablename__ = "consommation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcelle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("parcelles.id"),
        nullable=False,
    )
    date = Column(Date, nullable=False)
    litres_consommes = Column(Numeric(12, 3), nullable=False)
    saison = Column(Enum(SaisonType), nullable=False)


class TokenTransaction(Base):
    """Transaction de tokens AquaToken — mint lors d'une économie d'eau validée."""
    __tablename__ = "token_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    type = Column(Enum(TransactionType), nullable=False)
    # Montant en AquaToken avec précision blockchain (18 décimales)
    montant_aqua = Column(Numeric(18, 8))
    # Hash de la transaction on-chain
    tx_hash = Column(String(66))
    # Quota théorique calculé depuis le référentiel plantes
    quota_theorique = Column(Numeric(12, 3))
    consommation_reelle = Column(Numeric(12, 3))
    # ratio_economie = (quota - réel) / quota — entre 0 et 1
    ratio_economie = Column(Numeric(5, 4))
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


# ─────────────────────────────────────────
# INDEX — Optimisation des requêtes fréquentes
# ─────────────────────────────────────────

# Recherche rapide d'un utilisateur par GSM (login)
Index("ix_users_gsm", User.gsm)
Index("ix_users_aqua_id", User.aqua_id)

# Filtrage des parcelles par propriétaire
Index("ix_parcelles_user", Parcelle.user_id)

# Historique de consommation trié par parcelle + date
Index("ix_consommation_parcelle_date", Consommation.parcelle_id, Consommation.date)


# ─────────────────────────────────────────
# CRÉATION DES TABLES
# ─────────────────────────────────────────

async def create_tables():
    """Crée toutes les tables définies dans Base.metadata si elles n'existent pas encore."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DB] Toutes les tables créées avec succès")


# ─────────────────────────────────────────
# BLOC PRINCIPAL DE TEST
# ─────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    asyncio.run(create_tables())
