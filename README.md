# AquaToken 🌊

> Plateforme de tokenisation de l'efficacité de conservation d'eau pour les agriculteurs tunisiens.

---

## 📋 Description

AquaToken récompense les agriculteurs qui consomment moins d'eau que leur quota mensuel personnalisé. Chaque litre économisé génère des tokens échangeables contre du matériel agricole, des réductions sur les factures d'eau, et plus encore.

### Fonctionnalités principales
- 🌱 **Quotas personnalisés** — calculés selon la culture, la surface et la saison
- 🪙 **Tokens de récompense** — gagnés automatiquement pour chaque économie d'eau
- 💬 **WaterGPT** — assistant IA agricole spécialisé pour la Tunisie
- 📤 **Transfert peer-to-peer** — envoi de tokens entre agriculteurs via code à 6 chiffres
- 🔔 **Notifications** — alertes en temps réel pour les transferts et récompenses
- 📊 **Dashboard** — suivi de consommation avec graphiques dynamiques

---

## 🏗️ Stack Technique

| Composant | Technologie |
|---|---|
| Backend | Python 3.14 + FastAPI |
| Base de données | PostgreSQL 17 + SQLAlchemy async |
| LLM | Groq API (LLaMA 3.3 70B) |
| RAG | FAISS + sentence-transformers |
| Frontend | React 18 + Vite + Tailwind CSS 3 |
| Auth | JWT HS256 + bcrypt |

---

## 📁 Structure du projet
WaterGPT/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── database.py                # Modèles SQLAlchemy
│   ├── auth.py                    # JWT + bcrypt
│   ├── pdf_loader.py              # Chargement PDF + chunking
│   ├── rag_engine.py              # FAISS vector store
│   ├── llm_client.py              # Client Groq API
│   ├── seed.py                    # Données plantes
│   ├── seed_demo.py               # Données démo
│   ├── reset_db.py                # Reset base de données
│   ├── routers/
│   │   ├── auth_router.py
│   │   ├── users_router.py
│   │   ├── parcelles_router.py
│   │   ├── consommation_router.py
│   │   ├── tokens_router.py
│   │   └── notifications_router.py
│   ├── services/
│   │   ├── token_service.py
│   │   └── notification_service.py
│   ├── knowledge_base/
│   │   └── agriculture_water_guide.pdf
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ParcellesPage.jsx
│   │   │   ├── PortefeuillePage.jsx
│   │   │   └── EnvoyerTokensPage.jsx
│   │   ├── components/
│   │   │   ├── WaterGPTWidget.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── api/
│   │       └── client.js
│   └── package.json
├── blockchain/
│   └── contracts/
│       └── AquaToken.sol
└── docs/
└── PROGRESS.md

---

## ⚙️ Installation

### Prérequis
- Python 3.11+
- Node.js 18+
- PostgreSQL 17

---

### 1. Cloner le projet

```bash
git clone https://github.com/yassinemaazaoui114-git/WaterGPT.git
cd WaterGPT
```

---

### 2. Backend

#### Installer les dépendances Python
```bash
cd backend
pip install -r requirements.txt
```

#### Configurer les variables d'environnement
Créer le fichier `backend/.env` :
```env
# Base de données
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aquatoken

# JWT
SECRET_KEY=aquatoken_secret_key_change_in_production_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

# LLM (Groq)
GROQ_API_KEY=your_groq_api_key_here

# Blockchain (optionnel)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=
CONTRACT_ADDRESS=
```

#### Créer la base de données PostgreSQL
```bash
psql -U postgres
```
```sql
CREATE DATABASE aquatoken;
\q
```

#### Initialiser et peupler la base de données
```bash
python reset_db.py     # Crée toutes les tables
python seed.py         # Ajoute les plantes (Olivier, Blé, Tomate, etc.)
python seed_demo.py    # Ajoute les données de démonstration
```

#### Lancer le backend
```bash
python main.py
```
Le serveur démarre sur **http://localhost:8000**

Documentation API : **http://localhost:8000/docs**

---

### 3. Frontend

#### Installer les dépendances Node
```bash
cd frontend
npm install
```

#### Lancer le frontend
```bash
npm run dev
```
L'application s'ouvre sur **http://localhost:5173**

---

## 🚀 Lancement rapide (résumé)

```bash
# Terminal 1 — Backend
cd backend
python main.py

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Ouvrir **http://localhost:5173**

---

## 👤 Comptes de démonstration

Tous les comptes utilisent le mot de passe : **`demo123`**

| Code | Prénom | Nom | Type | Région |
|---|---|---|---|---|
| `123456` | Yassine | Maazaoui | Agriculteur | Sfax |
| `234567` | Ahmed | Ben Ali | Agriculteur | Nabeul |
| `345678` | Fatima | Trabelsi | Agriculteur | Kairouan |
| `456789` | Mohamed | Gharbi | Entreprise | Tunis |
| `567890` | Sarra | Bouaziz | Agriculteur | Gafsa |

---

## 📊 Modèle de calcul des tokens
Quota mensuel = Surface (m²) × Besoin journalier (L/m²/jour) × Facteur saisonnier × Jours du mois
Économie = Quota - Consommation réelle
Ratio (%) = (Économie / Quota) × 100
Tokens = Économie × 0.1 × (1 + Ratio / 100)

**Condition:** Ratio minimum de 5% pour être éligible aux tokens.

### Facteurs saisonniers par culture (exemple Olivier)
| Mois | Facteur |
|---|---|
| Janvier-Février | 0.6 (hiver) |
| Mars-Mai | 0.8 - 1.2 (printemps) |
| Juin-Août | 1.5 (été — pic) |
| Septembre-Novembre | 0.7 - 1.1 (automne) |

---

## 🔑 API Endpoints principaux

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion |
| GET | `/users/me` | Profil utilisateur |
| GET | `/users/me/stats` | Statistiques |
| GET | `/users/me/chart-data` | Données graphique |
| GET | `/parcelles` | Liste des parcelles |
| POST | `/parcelles` | Ajouter une parcelle |
| DELETE | `/parcelles/{id}` | Supprimer une parcelle |
| POST | `/consommation` | Saisir consommation |
| GET | `/tokens/quota/{id}` | Quota d'une parcelle |
| POST | `/tokens/mint` | Réclamer des tokens |
| POST | `/tokens/transfer` | Envoyer des tokens |
| GET | `/tokens/balance` | Solde tokens |
| GET | `/notifications` | Liste notifications |
| POST | `/chat` | WaterGPT chatbot |

---

## 🤖 WaterGPT

WaterGPT est un assistant IA agricole basé sur :
- **LLM :** LLaMA 3.3 70B via Groq API
- **RAG :** Base de connaissances PDF sur l'agriculture tunisienne
- **Contexte :** Données réelles de l'utilisateur (culture, région, quota, consommation)

### Obtenir une clé Groq gratuite
1. Aller sur **https://console.groq.com**
2. Créer un compte gratuit
3. Générer une API key
4. Ajouter dans `backend/.env` : `GROQ_API_KEY=your_key`

---

## 🐛 Résolution de problèmes

### Backend ne démarre pas
```bash
# Vérifier PostgreSQL
psql -U postgres -c "\l"

# Réinstaller les dépendances
pip install -r requirements.txt
```

### Erreur `ModuleNotFoundError`
```bash
pip install -r requirements.txt --break-system-packages
```

### Frontend erreur de connexion API
Vérifier que le backend tourne sur le port 8000 :
```bash
curl http://localhost:8000/health
```

### Base de données vide après redémarrage
```bash
cd backend
python seed.py
python seed_demo.py
```

### Tokens ne s'affichent pas
1. Aller sur **Quotas d'Eau**
2. Ajouter une parcelle
3. Saisir une consommation inférieure au quota
4. Cliquer **"Réclamer mes tokens"**

---

## 👥 Équipe

Projet développé dans le cadre d'un hackathon de conservation d'eau en Tunisie.

**Support :** support.customer@watergpt.tn
**WhatsApp :** +216 11 111 111

---

## 📄 Licence

MIT License — Libre d'utilisation pour des projets de conservation d'eau.

---

*AquaToken — Chaque goutte compte 💧*