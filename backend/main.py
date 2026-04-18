from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import Optional
import os

from pdf_loader import load_and_chunk_pdf
from rag_engine import RAGEngine
from llm_client import call_llm
from routers.auth_router import router as auth_router
from database import create_tables


# ─────────────────────────────────────────
# VARIABLES GLOBALES
# ─────────────────────────────────────────

# Charger les variables d'environnement depuis backend/.env
load_dotenv()

# Instance unique du moteur RAG partagée par toute l'application
rag_engine = RAGEngine()


# ─────────────────────────────────────────
# LIFESPAN — Initialisation au démarrage du serveur
# ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Démarrage ──
    try:
        # Créer toutes les tables PostgreSQL si elles n'existent pas encore
        await create_tables()
        print("[MAIN] Base de données initialisée")

        # Tenter de charger un index FAISS déjà existant sur le disque
        if not rag_engine.load_index():
            print("[MAIN] Aucun index trouvé — construction depuis le PDF...")

            # Charger et découper le PDF de la base de connaissances
            chunks = load_and_chunk_pdf("knowledge_base/agriculture_water_guide.pdf")

            # Construire et sauvegarder l'index FAISS
            rag_engine.build_index(chunks)

        print(f"[MAIN] RAG prêt avec {len(rag_engine.chunks)} chunks")

    except Exception as e:
        print(f"[MAIN] Erreur lors de l'initialisation du RAG : {e}")

    yield  # L'application tourne ici

    # ── Arrêt (rien à nettoyer pour l'instant) ──


# ─────────────────────────────────────────
# APPLICATION FASTAPI
# ─────────────────────────────────────────

app = FastAPI(
    title="WaterGPT API",
    description="API du chatbot agricole AquaToken",
    version="1.0.0",
    lifespan=lifespan,
)


# ─────────────────────────────────────────
# CORS — Autoriser les requêtes depuis le frontend React
# ─────────────────────────────────────────

# Enregistrer le router d'authentification (/auth/register, /auth/login)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────
# MODÈLES PYDANTIC — Schémas de requête et réponse
# ─────────────────────────────────────────

class Message(BaseModel):
    role: str       # "user" ou "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    crop_type: Optional[str] = "non spécifié"
    region: Optional[str] = "non spécifiée"
    expected_water: Optional[float] = 0.0   # Consommation attendue en litres
    actual_water: Optional[float] = 0.0     # Consommation réelle en litres
    tokens: Optional[int] = 0              # Solde AquaToken actuel
    trust_score: Optional[float] = 0.0     # Score de confiance de l'agriculteur
    conversation_history: Optional[list[Message]] = []


class TokensInfo(BaseModel):
    current: int    # Solde actuel
    can_earn: int   # Tokens potentiellement gagnables


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]                      # Extraits des chunks RAG utilisés
    tokens_info: Optional[TokensInfo] = None


# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────

@app.get("/health")
def health_check():
    """Vérification que l'API est opérationnelle."""
    return {"status": "ok", "message": "WaterGPT API opérationnelle"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Point d'entrée principal du chatbot.
    Récupère le contexte RAG, enrichit le prompt avec les données agricoles
    de l'utilisateur, appelle le LLM et retourne la réponse.
    """
    try:
        # ── Étape 1 : Récupérer les chunks pertinents via le RAG ──
        rag_chunks = rag_engine.retrieve(request.question, top_k=3)
        rag_context = "\n\n".join(rag_chunks)

        print(f"[MAIN] {len(rag_chunks)} chunk(s) RAG récupéré(s) pour la question.")

        # ── Étape 2 : Construire le prompt enrichi avec le contexte utilisateur ──
        user_prompt = f"""
Contexte utilisateur:
- Culture: {request.crop_type}
- Région: {request.region}
- Consommation attendue: {request.expected_water}L
- Consommation réelle: {request.actual_water}L
- Solde tokens: {request.tokens}
- Trust score: {request.trust_score}

Question: {request.question}
"""

        # ── Étape 3 : Convertir l'historique Pydantic en liste de dicts ──
        history = [
            {"role": m.role, "content": m.content}
            for m in request.conversation_history
        ]

        # ── Étape 4 : Appeler le LLM avec le prompt et le contexte RAG ──
        print("[MAIN] Appel du LLM...")
        answer = call_llm(user_prompt, history, rag_context)

        # ── Étape 5 : Calculer les tokens gagnables si la question est pertinente ──
        question_lower = request.question.lower()
        tokens_info = None

        if any(kw in question_lower for kw in ("token", "aqua", "économi")):
            # Tokens gagnés = différence de consommation × facteur de conversion
            can_earn = max(0, int((request.expected_water - request.actual_water) * 0.001))
            tokens_info = TokensInfo(current=request.tokens, can_earn=can_earn)
            print(f"[MAIN] Tokens calculés : solde={request.tokens}, potentiel={can_earn}")

        # ── Étape 6 : Construire et retourner la réponse ──
        sources = [chunk[:100] for chunk in rag_chunks]

        return ChatResponse(
            answer=answer,
            sources=sources,
            tokens_info=tokens_info,
        )

    except Exception as e:
        print(f"[MAIN] Erreur dans /chat : {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# BLOC PRINCIPAL — Lancer le serveur en mode développement
# ─────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
