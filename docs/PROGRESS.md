# AquaToken — Project Progress Tracker

## ✅ Completed

### Phase 0 — Project Structure
- Full folder structure created (backend/, frontend/, docs/)
- requirements.txt with all dependencies
- .env configured

### Phase 1 — PDF Knowledge Base
- agriculture_water_guide.pdf (6 sections, friend's version)
- pdf_loader.py: generates and chunks PDF into 13 chunks
- Chunking strategy: section-based with 150-word limit

### Phase 2 — RAG Engine
- rag_engine.py: FAISS vector store
- Model: sentence-transformers/all-MiniLM-L6-v2
- Retrieval: top 3 chunks per question
- Index saved locally in vector_store/

### Phase 3 — LLM Client
- llm_client.py: Groq API (llama-3.3-70b-versatile)
- WaterGPT system prompt in French
- Multi-turn conversation history support
- RAG context injection

### Phase 4 — FastAPI Backend
- main.py: FastAPI app with lifespan startup
- POST /chat: full RAG + LLM pipeline
- GET /health: status check
- CORS enabled for React frontend
- Pydantic models for request/response validation

### Phase 5 — React Floating Widget
- WaterGPTWidget.jsx: floating chat button
- Blue gradient design matching AquaToken design system
- Quick question pills
- Real-time responses from backend
- Token notification system
- Mobile responsive

### Phase 6 — PostgreSQL Database
- database.py: SQLAlchemy async setup
- Tables: users, referentiel_plantes, parcelles, consommation, token_transactions
- Enums: UserType, SaisonType, TransactionType
- Indexes on wallet_address, user_id, parcelle+date

---

## ⏳ In Progress

### Phase 7 — JWT Authentication (NEXT)
- [ ] POST /auth/register (wallet + type + localisation)
- [ ] POST /auth/login (wallet → JWT token)
- [ ] JWT middleware (protect routes)
- [ ] Password hashing with bcrypt

---

## 📋 Planned

### Phase 8 — API Routes
- [ ] GET/POST /parcelles
- [ ] GET/POST /consommation
- [ ] GET /users/me

### Phase 9 — Token Calculation Service
- [ ] calculate_quota(parcelle_id, mois, annee)
- [ ] calculate_tokens(quota, reel)
- [ ] calculate_trust_score(user_id)
- [ ] Seed referentiel_plantes with olive, blé, tomate, maïs data

### Phase 10 — Smart Contract
- [ ] ERC20 + Ownable + ReentrancyGuard
- [ ] mintRewards function
- [ ] Deploy to Polygon Mumbai testnet
- [ ] web3.py integration in backend

### Phase 11 — Frontend Pages
- [ ] Dashboard page
- [ ] Parcelles management page
- [ ] Consumption input form
- [ ] Asset portfolio / token balance page
- [ ] Marketplace page
- [ ] Connect wallet page

### Phase 12 — Integration & Polish
- [ ] Connect all frontend pages to backend API
- [ ] README.md with full setup instructions
- [ ] Demo data seeding script
- [ ] Pitch demo preparation

---

## 🔧 Tech Stack
- Backend: Python 3.14 + FastAPI + SQLAlchemy async
- Database: PostgreSQL 17 (local)
- LLM: Groq API (llama-3.3-70b-versatile)
- RAG: FAISS + sentence-transformers
- Frontend: React 18 + Vite + Tailwind CSS 3
- Blockchain: Solidity + Polygon Mumbai (planned)

---

## 📝 Notes
- LLM switched from Gemini to Groq (free tier quota issues)
- PDF replaced with richer version (13 chunks vs 5)
- Floating widget chosen over full-page chat for easier integration
