import os
import fitz  # PyMuPDF
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


# ─────────────────────────────────────────
# PARTIE 1 — GÉNÉRATION DU PDF
# ─────────────────────────────────────────

def generate_pdf(output_path: str = "knowledge_base/agriculture_water_guide.pdf"):
    # Créer le dossier knowledge_base s'il n'existe pas
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Initialiser le document PDF avec marges personnalisées
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    # Récupérer les styles de base et définir des styles personnalisés
    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading1"],
        fontSize=14,
        textColor=colors.HexColor("#005d90"),
        spaceAfter=8,
        spaceBefore=16,
        leading=18,
        fontName="Helvetica-Bold",
    )

    style_body = ParagraphStyle(
        "BodyFR",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        spaceAfter=5,
        fontName="Helvetica",
    )

    style_bullet = ParagraphStyle(
        "BulletFR",
        parent=style_body,
        leftIndent=18,
        bulletIndent=6,
        spaceAfter=4,
    )

    # Contenu du document — liste de Flowables
    story = []

    # ── Titre principal ──
    story.append(Paragraph("Guide de l'Agriculture et de l'Eau — AquaToken", style_title))
    story.append(Spacer(1, 0.4 * cm))

    # ── SECTION 1 ──
    story.append(Paragraph("Section 1 — Consommation d'eau en agriculture", style_title))
    story.append(Paragraph(
        "L'agriculture consomme 70% de l'eau douce mondiale.", style_body))
    story.append(Paragraph(
        "Besoin en eau par culture :", style_body))
    for item in [
        "Blé : 1 200–1 500 L/kg",
        "Olive : 2 500–3 000 L/kg",
        "Tomate : 200–300 L/kg",
        "Maïs : 900–1 200 L/kg",
    ]:
        story.append(Paragraph(f"• {item}", style_bullet))

    story.append(Paragraph(
        "Facteurs augmentant la consommation : chaleur excessive, sol sableux, irrigation par inondation.",
        style_body))
    story.append(Paragraph(
        "Conseils pratiques : irriguer tôt le matin ou le soir, utiliser le goutte-à-goutte, surveiller l'humidité du sol.",
        style_body))
    story.append(Spacer(1, 0.3 * cm))

    # ── SECTION 2 ──
    story.append(Paragraph("Section 2 — Irrigation intelligente", style_title))
    story.append(Paragraph(
        "Types d'irrigation par efficacité :", style_body))
    for item in [
        "Goutte-à-goutte (meilleur)",
        "Aspersion (moyen)",
        "Surface (moins efficace)",
    ]:
        story.append(Paragraph(f"• {item}", style_bullet))

    story.append(Paragraph(
        "Bonnes pratiques : arroser selon les prévisions météo, ajuster la fréquence selon la saison.",
        style_body))
    story.append(Paragraph(
        "Erreurs fréquentes à éviter : trop arroser par habitude, irriguer en plein soleil entre 11h et 16h.",
        style_body))
    story.append(Paragraph(
        "Économies possibles : le goutte-à-goutte économise jusqu'à 50% d'eau vs irrigation de surface.",
        style_body))
    story.append(Spacer(1, 0.3 * cm))

    # ── SECTION 3 ──
    story.append(Paragraph("Section 3 — Santé des plantes et stress hydrique", style_title))
    story.append(Paragraph(
        "Signes de stress hydrique : feuilles jaunies ou enroulées, croissance ralentie, sol sec en profondeur.",
        style_body))
    story.append(Paragraph(
        "Solutions immédiates : paillage du sol (mulching), irrigation nocturne, ombre artificielle.",
        style_body))
    story.append(Paragraph(
        "Excès d'eau : provoque la pourriture des racines, maladies fongiques.",
        style_body))
    story.append(Paragraph(
        "Manque d'eau : stress hydrique, baisse de rendement, mort des plants.",
        style_body))
    story.append(Paragraph(
        "Indicateurs de bonne santé : feuilles vertes et fermes, sol humide à 10 cm de profondeur.",
        style_body))
    story.append(Spacer(1, 0.3 * cm))

    # ── SECTION 4 ──
    story.append(Paragraph("Section 4 — Système de tokens AquaToken", style_title))
    story.append(Paragraph(
        "Formule de calcul : tokens = (consommation_attendue - consommation_réelle) × coefficient.",
        style_body))
    story.append(Paragraph(
        "Le coefficient varie selon la culture :", style_body))
    for item in ["Olive : 1.5", "Blé : 1.2", "Tomate : 1.0", "Maïs : 1.1"]:
        story.append(Paragraph(f"• {item}", style_bullet))

    story.append(Paragraph(
        "Gagner des tokens : réduire la consommation sous la moyenne régionale, utiliser une irrigation efficace, signaler des anomalies.",
        style_body))
    story.append(Paragraph(
        "Trust Score : augmente avec l'optimisation régulière, diminue si des anomalies sont détectées.",
        style_body))
    story.append(Paragraph(
        "Utilisation des tokens : achat de matériel agricole, réduction du coût de l'eau, accès aux subventions gouvernementales, échange sur marketplace.",
        style_body))
    story.append(Paragraph("Partenaires officiels en Tunisie :", style_body))
    for item in [
        "UTAP — Union Tunisienne de l'Agriculture et de la Pêche",
        "SONEDE — Société Nationale d'Exploitation et de Distribution des Eaux",
        "GDA — Groupements de Développement Agricole",
        "Association Eau et Développement Tunisie",
        "MALE — Ministère de l'Agriculture et des Ressources Hydrauliques",
    ]:
        story.append(Paragraph(f"• {item}", style_bullet))
    story.append(Spacer(1, 0.3 * cm))

    # ── SECTION 5 ──
    story.append(Paragraph("Section 5 — Impact environnemental et durabilité", style_title))
    story.append(Paragraph(
        "La Tunisie est l'un des pays les plus vulnérables au changement climatique en Afrique du Nord.",
        style_body))
    story.append(Paragraph(
        "Les ressources en eau souterraine diminuent de 2% par an en Tunisie.",
        style_body))
    story.append(Paragraph(
        "Préservation : chaque litre économisé contribue à la durabilité des nappes phréatiques.",
        style_body))
    story.append(Paragraph(
        "Agriculture durable : rotation des cultures, couverture végétale du sol, agroforesterie.",
        style_body))
    story.append(Paragraph(
        "Rôle de l'IA : optimisation prédictive de l'irrigation, détection précoce du stress hydrique.",
        style_body))
    story.append(Paragraph(
        "Objectif national : réduire la consommation agricole de 30% d'ici 2030.",
        style_body))

    # Construire et sauvegarder le PDF
    doc.build(story)
    print(f"[pdf_loader] PDF généré avec succès : {output_path}")


# ─────────────────────────────────────────
# PARTIE 2 — CHARGEMENT ET DÉCOUPAGE EN CHUNKS
# ─────────────────────────────────────────

def load_and_chunk_pdf(
    pdf_path: str,
    chunk_size: int = 150,
    overlap: int = 20,
    min_chunk_words: int = 30,
) -> list[str]:
    """
    Lit un PDF avec PyMuPDF, découpe d'abord par section (lignes commençant par
    "Section" ou "SECTION"), puis applique un sliding-window de `chunk_size` mots
    avec chevauchement de `overlap` mots à l'intérieur de chaque section.
    Les chunks de moins de `min_chunk_words` mots sont ignorés.
    Retourne une liste de chaînes de caractères.
    """
    try:
        # Ouvrir le document PDF
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"[pdf_loader] Erreur lors de l'ouverture du PDF '{pdf_path}' : {e}")
        return []

    try:
        # Extraire le texte de toutes les pages ligne par ligne
        lines = []
        for page in doc:
            page_text = page.get_text("text")
            lines.extend(page_text.splitlines())
        doc.close()

        if not any(line.strip() for line in lines):
            print("[pdf_loader] Avertissement : le PDF est vide ou illisible.")
            return []

        # ── Stratégie 1 : découpage par section ──
        # Regrouper les lignes en blocs correspondant à chaque section détectée
        sections: list[str] = []
        current_block: list[str] = []

        for line in lines:
            stripped = line.strip()
            # Détecter un en-tête de section (commence par "Section" ou "SECTION")
            if stripped.lower().startswith("section"):
                if current_block:
                    sections.append(" ".join(current_block))
                current_block = [stripped]
            else:
                if stripped:
                    current_block.append(stripped)

        # Ajouter le dernier bloc s'il existe
        if current_block:
            sections.append(" ".join(current_block))

        print(f"[pdf_loader] {len(sections)} section(s) détectée(s).")

        # ── Stratégie 2 : sliding-window à l'intérieur de chaque section ──
        all_chunks: list[str] = []

        for sec_idx, section_text in enumerate(sections, start=1):
            words = section_text.split()
            start = 0

            while start < len(words):
                end = start + chunk_size
                chunk_words = words[start:end]
                word_count = len(chunk_words)

                # Ignorer les chunks trop petits
                if word_count < min_chunk_words:
                    break

                chunk_text = " ".join(chunk_words)
                all_chunks.append(chunk_text)
                print(
                    f"  [chunk #{len(all_chunks)}] section {sec_idx} | "
                    f"mots : {word_count} | début : '{chunk_text[:60]}...'"
                )

                # Avancer avec chevauchement
                start += chunk_size - overlap

        print(f"[pdf_loader] {len(all_chunks)} chunk(s) créé(s) depuis '{pdf_path}'.")
        return all_chunks

    except Exception as e:
        print(f"[pdf_loader] Erreur lors du traitement du texte : {e}")
        return []


# ─────────────────────────────────────────
# PARTIE 3 — BLOC PRINCIPAL DE TEST
# ─────────────────────────────────────────

if __name__ == "__main__":
    # Étape 1 : Générer le PDF
    generate_pdf()

    # Étape 2 : Charger et découper en chunks
    chunks = load_and_chunk_pdf("knowledge_base/agriculture_water_guide.pdf")
    print(f"Total chunks created: {len(chunks)}")
    if chunks:
        print(f"First chunk preview:\n{chunks[0][:300]}")
