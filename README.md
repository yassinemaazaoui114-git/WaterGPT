<div align="center">

# 🌊 AquaToken

### Every drop counts.

A platform that rewards Tunisian farmers for saving water.<br/>
Use less than your quota, earn tokens, and trade them for farming equipment.

<br/>

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8-363636?style=for-the-badge&logo=solidity&logoColor=white)

[Features](#-features) · [Installation](#-installation) · [Token model](#-token-model) · [WaterGPT](#-watergpt) · [API](#-api)

</div>

---

## 💡 The idea

Tunisia faces severe water stress, and agriculture is its biggest water consumer. **AquaToken** turns water savings into a real reward:

```
🌱 Personalized quota  →  💧 Actual usage  →  🪙 Tokens earned  →  🛒 Equipment, discounts, training
```

> [!NOTE]
> Built for a **water conservation hackathon in Tunisia**. The app's interface is in **French**.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🌱 Personalized quotas
A monthly water quota for each plot, based on the **crop**, **area** and **month of the year**.

</td>
<td width="50%" valign="top">

### 🪙 Reward tokens
Earned for every liter saved, with a **bonus** that grows with your saving rate.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💬 WaterGPT
An AI farming assistant for Tunisia that knows your crop, region and water usage.

</td>
<td width="50%" valign="top">

### 📤 Peer-to-peer transfers
Send tokens to another farmer using their **6-digit user code**.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📊 Dashboard & wallet
Usage charts, balance, transaction history and a **trust score** based on your saving record.

</td>
<td width="50%" valign="top">

### 🔔 Notifications
Real-time alerts for transfers and rewards, with an unread counter.

</td>
</tr>
</table>

> [!NOTE]
> A **Marketplace** page (irrigation kits, seeds, sensors, bill discounts, training) is built with a demo catalog but isn't connected to the app's routes yet.

---

## 🏗️ Tech stack

| Layer | Technology |
|---|---|
| **Backend** | Python + FastAPI |
| **Database** | PostgreSQL 17 + async SQLAlchemy (`asyncpg`) |
| **LLM** | Groq API, LLaMA 3.3 70B (`llama-3.3-70b-versatile`) |
| **RAG** | FAISS + sentence-transformers (`all-MiniLM-L6-v2`) |
| **Frontend** | React 18 + Vite + Tailwind CSS 3 |
| **Auth** | JWT (HS256) + bcrypt |
| **Blockchain** *(optional)* | Solidity smart contract + Hardhat, Polygon Amoy testnet |

---

## 📦 Installation

### Prerequisites

- **Python 3.11+** (developed on 3.14)
- **Node.js 18+**
- **PostgreSQL 17**
- A free **Groq** API key ([see below](#get-a-free-groq-api-key))

### 1. Clone the repo

```bash
git clone https://github.com/yassinemaazaoui114-git/WaterGPT.git
cd WaterGPT
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aquatoken

# JWT — replace with a long random string
SECRET_KEY=change_me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

# LLM (Groq)
GROQ_API_KEY=your_groq_api_key_here

# Blockchain (optional)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=
CONTRACT_ADDRESS=
```

> [!TIP]
> Generate a secure `SECRET_KEY` with: `python -c "import secrets; print(secrets.token_hex(32))"`

Create and fill the database:

```bash
psql -U postgres -c "CREATE DATABASE aquatoken;"

python reset_db.py     # Create all tables
python seed.py         # Add the 6 crops and their water needs
python seed_demo.py    # Add demo accounts, plots and transactions
```

Start the server:

```bash
python main.py
```

➡️ API at **http://localhost:8000** · Interactive docs at **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

➡️ App at **http://localhost:5173**

<details>
<summary><b>🚀 Quick start (once installed)</b></summary>

```bash
# Terminal 1 — Backend
cd backend && python main.py

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Then open **http://localhost:5173**.

</details>

---

## 👤 Demo accounts

Created by `seed_demo.py`. Log in with the **user code** and the password **`demo123`**.

| User code | Name | Type | Region |
|---|---|---|---|
| `123456` | Yassine Maazaoui | 🌾 Farmer | Sfax |
| `234567` | Ahmed Ben Ali | 🌾 Farmer | Nabeul |
| `345678` | Fatima Trabelsi | 🌾 Farmer | Kairouan |
| `456789` | Mohamed Gharbi | 🏢 Business | Tunis |
| `567890` | Sarra Bouaziz | 🌾 Farmer | Gafsa |

---

## 🧮 Token model

```text
Monthly quota = Area (m²) × Daily need (L/m²/day) × Seasonal factor × Days in month
Savings       = Quota − Actual usage
Ratio (%)     = (Savings / Quota) × 100            ← capped at 100%
Tokens        = Savings × 0.1 × (1 + Ratio / 100)
```

> [!IMPORTANT]
> You must save **at least 5%** of your quota to earn tokens.

**Example:** a 10,000 L quota with 8,000 L used → 2,000 L saved, a 20% ratio
→ `2000 × 0.1 × 1.2` = **240 tokens** 🪙

### Supported crops

| Crop | Daily need (L/m²/day) |
|---|---|
| 🫒 Olive (*Olivier*) | 4.5 |
| 🌾 Wheat (*Blé*) | 3.5 |
| 🍅 Tomato (*Tomate*) | 5.0 |
| 🌽 Maize (*Maïs*) | 6.0 |
| 🍊 Citrus (*Agrumes*) | 5.5 |
| 🌰 Almond (*Amandier*) | 3.0 |

### Seasonal factors — example: Olive

| Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.6 | 0.6 | 0.8 | 1.0 | 1.2 | **1.5** | **1.5** | 1.4 | 1.1 | 0.9 | 0.7 | 0.6 |

Each crop has its own 12-month curve, defined in `backend/seed.py`.

---

## 🤖 WaterGPT

A farming assistant built into the app as a floating chat widget.

| | |
|---|---|
| **Model** | LLaMA 3.3 70B via Groq |
| **Knowledge** | RAG over a PDF guide on farming and water in Tunisia (FAISS, top 3 passages) |
| **Personalization** | The user's crop, region, expected and actual water usage |
| **Conversation** | Multi-turn history, answers in French |

### Get a free Groq API key

1. Go to **[console.groq.com](https://console.groq.com)**
2. Create a free account
3. Generate an API key
4. Add it to `backend/.env`: `GROQ_API_KEY=your_key`

---

## 🔑 API

Full interactive docs at **http://localhost:8000/docs**.

<details>
<summary><b>See all endpoints</b></summary>

| Method | Route | Description |
|---|---|---|
| **Auth** | | |
| `POST` | `/auth/register` | Sign up |
| `POST` | `/auth/login` | Log in |
| **User** | | |
| `GET` | `/users/me` | Profile |
| `GET` | `/users/me/stats` | Statistics |
| `GET` | `/users/me/chart-data` | Chart data |
| **Plots & crops** | | |
| `GET` | `/parcelles` | List plots |
| `POST` | `/parcelles` | Add a plot |
| `DELETE` | `/parcelles/{id}` | Delete a plot |
| `GET` | `/plantes` | List supported crops |
| **Water usage** | | |
| `POST` | `/consommation` | Log water usage |
| `GET` | `/consommation/{parcelle_id}` | Usage history for a plot |
| `GET` | `/consommation/{parcelle_id}/summary` | Usage summary for a plot |
| **Tokens** | | |
| `GET` | `/tokens/quota/{parcelle_id}` | Quota for a plot |
| `POST` | `/tokens/mint` | Claim tokens |
| `POST` | `/tokens/transfer` | Send tokens |
| `GET` | `/tokens/balance` | Balance |
| `GET` | `/tokens/transactions` | Transaction history |
| `GET` | `/tokens/trust-score` | Trust score |
| **Notifications** | | |
| `GET` | `/notifications` | List notifications |
| `GET` | `/notifications/unread-count` | Unread count |
| `PUT` | `/notifications/{id}/read` | Mark one as read |
| `PUT` | `/notifications/mark-all-read` | Mark all as read |
| **Other** | | |
| `POST` | `/chat` | WaterGPT |
| `GET` | `/health` | API status |

</details>

---

## 📁 Project structure

<details>
<summary><b>Click to expand</b></summary>

```text
WaterGPT/
├── backend/
│   ├── main.py                 # FastAPI app + /chat + /health
│   ├── database.py             # SQLAlchemy models
│   ├── auth.py                 # JWT + bcrypt
│   ├── pdf_loader.py           # PDF loading and chunking
│   ├── rag_engine.py           # FAISS vector index
│   ├── llm_client.py           # Groq client
│   ├── seed.py                 # Crop data
│   ├── seed_demo.py            # Demo data
│   ├── reset_db.py             # Database reset
│   ├── routers/                # auth, users, parcelles, plantes,
│   │                           # consommation, tokens, notifications
│   ├── services/
│   │   ├── token_service.py    # Quotas, tokens, trust score
│   │   └── notification_service.py
│   ├── knowledge_base/
│   │   └── agriculture_water_guide.pdf
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/              # Login, Dashboard, Parcelles (quotas),
│       │                       # Portefeuille (wallet), EnvoyerTokens (send),
│       │                       # Marketplace
│       ├── components/         # WaterGPTWidget, NotificationBell, ProtectedRoute
│       ├── context/AuthContext.jsx
│       └── api/client.js
├── blockchain/
│   ├── contracts/AquaToken.sol # ERC-20-style token + rewards + transfer by code
│   ├── scripts/deploy.js
│   └── hardhat.config.js
└── docs/
    └── PROGRESS.md             # Progress tracker
```

</details>

---

## ⛓️ Blockchain (optional)

The `blockchain/` folder holds the **AquaToken.sol** smart contract. It registers farmers, mints rewards (`mintWaterReward`) and transfers tokens by user code (`transferByAquaId`). It can be deployed to **Polygon Amoy** with Hardhat.

> [!NOTE]
> In the current version, tokens are stored in PostgreSQL and transaction hashes are simulated. Deploying on-chain is the next step.

---

## 🐛 Troubleshooting

<details>
<summary><b>The backend won't start</b></summary>

```bash
psql -U postgres -c "\l"          # Is PostgreSQL running?
pip install -r requirements.txt   # Reinstall dependencies
```

</details>

<details>
<summary><b><code>ModuleNotFoundError</code></b></summary>

Use a virtual environment:

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

</details>

<details>
<summary><b>The frontend can't reach the API</b></summary>

The frontend expects the backend at `http://localhost:8000`. Check that it's running:

```bash
curl http://localhost:8000/health
```

</details>

<details>
<summary><b>The database is empty after a restart</b></summary>

```bash
cd backend
python seed.py
python seed_demo.py
```

</details>

<details>
<summary><b>No tokens showing up</b></summary>

1. Open the **Quotas d'Eau** (water quotas) page
2. Add a plot
3. Log usage **at least 5% below** the quota
4. Click **🪙 Réclamer … tokens** (claim tokens)

</details>

---

## 📄 License

Released under the **MIT** license.

---

<div align="center">

**AquaToken — Every drop counts 💧**

</div>
