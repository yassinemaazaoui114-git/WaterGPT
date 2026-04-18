import os
from groq import Groq
from dotenv import load_dotenv


# ─────────────────────────────────────────
# INITIALISATION — Charger les variables d'environnement et configurer Groq
# ─────────────────────────────────────────

# Charger le fichier .env situé dans le dossier backend/
load_dotenv()

# Lire la clé API depuis l'environnement (jamais hardcodée dans le code)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Créer le client Groq
client = Groq(api_key=GROQ_API_KEY)

print("[LLM] Client Groq initialisé")


# ─────────────────────────────────────────
# SYSTEM PROMPT — Identité et règles de WaterGPT
# ─────────────────────────────────────────

SYSTEM_PROMPT = """
Tu es WaterGPT, un assistant agricole intelligent spécialisé dans la conservation
de l'eau pour les agriculteurs tunisiens. Tu parles français (ou arabe si demandé).

Tes rôles :
- Aider les agriculteurs à réduire leur consommation d'eau avec des conseils concrets
- Expliquer les bonnes pratiques d'irrigation adaptées au climat tunisien
- Donner des conseils spécifiques par culture (olive, blé, tomate, maïs, etc.)
- Expliquer le système de tokens AquaToken clairement
- Encourager l'agriculture durable

Règles :
- Toujours prioriser les recommandations d'économie d'eau
- Utiliser un langage simple et pratique adapté aux agriculteurs
- Personnaliser les réponses selon le contexte fourni (culture, région, consommation)
- Si question sur les tokens : expliquer tokens = (seuil - réel) × coefficient
- Ne jamais accuser l'agriculteur si la consommation semble anormale
- Mentionner les organisations tunisiennes quand pertinent : UTAP, SONEDE, GDA
- Être concis et actionnable
- Tu as accès à une base de connaissances sur la conservation de l'eau. Utilise-la toujours.

Règles de format :
- Maximum 4 phrases par réponse
- Jamais de listes numérotées de plus de 3 éléments
- Être direct et actionnable
- Pas d'introduction ni de conclusion longue
- Si tu donnes des conseils, maximum 2 conseils concrets par message
- Ne jamais répéter une information déjà donnée dans la conversation
"""


# ─────────────────────────────────────────
# FONCTION PRINCIPALE — Appel à l'API Groq (LLaMA 3.3 70B)
# ─────────────────────────────────────────

def call_llm(
    user_prompt: str,
    conversation_history: list = None,
    rag_context: str = "",
) -> str:
    """
    Envoie une question au modèle LLaMA via Groq avec le contexte RAG et
    l'historique de conversation. Retourne la réponse textuelle du modèle.

    Args:
        user_prompt:          La question posée par l'utilisateur.
        conversation_history: Historique au format [{"role": "user"|"assistant", "content": "..."}].
        rag_context:          Texte extrait de la base de connaissances par le RAG.

    Returns:
        La réponse générée par le LLM sous forme de chaîne de caractères.
    """
    try:
        # ── Étape 1 : Construire le prompt complet (RAG context + question) ──
        if rag_context and rag_context.strip():
            full_prompt = (
                f"Contexte de la base de connaissances:\n{rag_context}\n\n"
                f"Question: {user_prompt}"
            )
        else:
            # Aucun contexte RAG disponible — poser la question directement
            full_prompt = user_prompt

        # ── Étape 2 : Construire la liste messages pour l'API Groq ──
        # Le system prompt est toujours injecté en premier message
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Ajouter l'historique de conversation (rôles "user" et "assistant" natifs pour Groq)
        for msg in (conversation_history or []):
            role = "assistant" if msg["role"] == "assistant" else "user"
            messages.append({"role": role, "content": msg["content"]})

        # Ajouter le message courant de l'utilisateur en dernier
        messages.append({"role": "user", "content": full_prompt})

        # ── Étape 3 : Appeler l'API Groq avec LLaMA 3.3 70B ──
        print(f"[LLM] Envoi du prompt à Groq ({len(full_prompt)} caractères)...")

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=400,
            temperature=0.7,
        )

        print("[LLM] Réponse reçue de Groq.")

        # ── Étape 4 : Extraire et retourner le texte de la réponse ──
        return response.choices[0].message.content

    except Exception as e:
        print(f"[LLM] Erreur Groq: {e}")
        return "Désolé, une erreur s'est produite. Veuillez réessayer."


# ─────────────────────────────────────────
# BLOC PRINCIPAL DE TEST
# ─────────────────────────────────────────

if __name__ == "__main__":
    # Contexte RAG simulé pour le test
    test_rag = """
    Section 1: L'agriculture consomme 70% de l'eau douce mondiale.
    Besoin en eau : Olive 2500-3000L/kg, Blé 1200-1500L/kg
    Section 2: Le goutte-à-goutte économise jusqu'à 50% d'eau.
    """

    response = call_llm(
        user_prompt="J'ai des oliviers à Sfax, comment réduire ma consommation d'eau?",
        conversation_history=[],
        rag_context=test_rag,
    )

    print(f"[TEST] Réponse WaterGPT:\n{response}")
