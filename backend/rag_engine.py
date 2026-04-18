import os
import pickle
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer


# ─────────────────────────────────────────
# MOTEUR RAG — Retrieval-Augmented Generation
# ─────────────────────────────────────────

class RAGEngine:

    def __init__(self):
        # Charger le modèle d'embeddings léger et performant
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        # Chemins de persistance de l'index et des chunks
        self.index_path = "vector_store/faiss.index"
        self.chunks_path = "vector_store/chunks.pkl"

        # Index FAISS et liste de chunks (initialisés à vide)
        self.index: faiss.Index | None = None
        self.chunks: list[str] = []

        print("[RAG] Modèle d'embeddings chargé")

    # ─────────────────────────────────────
    # CONSTRUCTION DE L'INDEX FAISS
    # ─────────────────────────────────────

    def build_index(self, chunks: list[str]) -> None:
        """
        Génère les embeddings pour chaque chunk, construit un index FAISS
        IndexFlatL2 et sauvegarde l'index + les chunks sur le disque.
        """
        try:
            if not chunks:
                print("[RAG] Aucun chunk fourni — index non construit.")
                return

            # S'assurer que le dossier vector_store/ existe
            os.makedirs("vector_store", exist_ok=True)

            print(f"[RAG] Génération des embeddings pour {len(chunks)} chunk(s)...")

            # Encoder tous les chunks en vecteurs float32
            embeddings = self.model.encode(chunks, show_progress_bar=False)
            embeddings = np.array(embeddings, dtype=np.float32)

            # Dimension des vecteurs (384 pour all-MiniLM-L6-v2)
            dimension = embeddings.shape[1]

            # Créer un index de similarité L2 (distance euclidienne)
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(embeddings)

            # Sauvegarder l'index FAISS sur le disque
            faiss.write_index(self.index, self.index_path)

            # Sauvegarder les chunks textuels avec pickle
            self.chunks = chunks
            with open(self.chunks_path, "wb") as f:
                pickle.dump(self.chunks, f)

            print(
                f"[RAG] Index FAISS construit avec {len(chunks)} chunks et sauvegardé"
            )

        except Exception as e:
            print(f"[RAG] Erreur lors de la construction de l'index : {e}")

    # ─────────────────────────────────────
    # CHARGEMENT D'UN INDEX EXISTANT
    # ─────────────────────────────────────

    def load_index(self) -> bool:
        """
        Charge l'index FAISS et les chunks depuis le disque si les deux fichiers
        existent. Retourne True si le chargement a réussi, False sinon.
        """
        try:
            # Vérifier la présence des deux fichiers de persistance
            if not os.path.exists(self.index_path) or not os.path.exists(self.chunks_path):
                print("[RAG] Aucun index existant trouvé.")
                return False

            # Charger l'index FAISS
            self.index = faiss.read_index(self.index_path)

            # Charger les chunks textuels
            with open(self.chunks_path, "rb") as f:
                self.chunks = pickle.load(f)

            print(
                f"[RAG] Index existant chargé ({len(self.chunks)} chunks, "
                f"dimension {self.index.d})"
            )
            return True

        except Exception as e:
            print(f"[RAG] Erreur lors du chargement de l'index : {e}")
            return False

    # ─────────────────────────────────────
    # RECHERCHE — RETRIEVAL
    # ─────────────────────────────────────

    def retrieve(self, question: str, top_k: int = 3) -> list[str]:
        """
        Encode la question, recherche les `top_k` chunks les plus proches dans
        l'index FAISS et retourne les textes correspondants.
        """
        try:
            # Vérifier qu'un index est disponible
            if self.index is None:
                print("[RAG] Avertissement : aucun index chargé — appelez build_index() ou load_index() d'abord.")
                return []

            # Encoder la question en vecteur float32
            query_embedding = self.model.encode([question])
            query_embedding = np.array(query_embedding, dtype=np.float32)

            # Limiter top_k au nombre de chunks disponibles
            k = min(top_k, len(self.chunks))

            # Recherche des k voisins les plus proches (distances L2)
            distances, indices = self.index.search(query_embedding, k)

            # Récupérer les chunks correspondants aux indices retournés
            results = [self.chunks[i] for i in indices[0] if i < len(self.chunks)]

            print(f"[RAG] {len(results)} chunk(s) récupéré(s) pour la question.")
            return results

        except Exception as e:
            print(f"[RAG] Erreur lors de la recherche : {e}")
            return []


# ─────────────────────────────────────────
# BLOC PRINCIPAL DE TEST
# ─────────────────────────────────────────

if __name__ == "__main__":
    from pdf_loader import load_and_chunk_pdf

    rag = RAGEngine()

    # Essayer de charger un index existant, sinon en construire un nouveau
    if not rag.load_index():
        print("[RAG] Construction d'un nouvel index...")
        chunks = load_and_chunk_pdf("knowledge_base/agriculture_water_guide.pdf")
        rag.build_index(chunks)

    # Tester la récupération avec une question en français
    question = "Comment économiser de l'eau pour les oliviers?"
    results = rag.retrieve(question, top_k=3)

    print(f"\n[TEST] Question: {question}")
    print(f"[TEST] {len(results)} chunk(s) récupéré(s):")
    for i, chunk in enumerate(results):
        print(f"\n--- Chunk {i+1} ---")
        print(chunk[:200])
