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

### Phase 7 — JWT Authentication ✅
- [x] POST /auth/register (wallet + type + localisation)
- [x] POST /auth/login (wallet → JWT token)
- [x] JWT middleware (get_current_user)
- [x] bcrypt password hashing

### Phase 8 — API Routes ✅
- [x] GET /users/me
- [x] GET /users/me/stats
- [x] GET/POST/DELETE /parcelles
- [x] POST/GET /consommation
- [x] GET /consommation/{id}/summary
- [x] GET /plantes (public)
- [x] Seed script for referentiel_plantes

---

### Phase 9 — Token Calculation Service ✅
- [x] calculate_quota (surface × besoin × facteur_saisonnier × jours)
- [x] calculate_consommation_reelle (SUM from DB)
- [x] calculate_tokens (official formula with ratio bonus)
- [x] calculate_trust_score (based on transaction history)
- [x] mint_tokens (full pipeline)
- [x] GET /tokens/quota/{parcelle_id}
- [x] POST /tokens/mint
- [x] GET /tokens/balance
- [x] GET /tokens/trust-score

---

## ⏳ In Progress

### Phase 10 — Smart Contract (NEXT)
- [ ] ERC20 + Ownable + ReentrancyGuard
- [ ] mintRewards function
- [ ] Deploy to Polygon Mumbai testnet
- [ ] web3.py integration in backend

### Phase 11a — Frontend Auth + Routing ✅
- [x] React Router setup (react-router-dom v6)
- [x] AuthContext with login/register/logout
- [x] JWT stored in localStorage
- [x] axios client with auth interceptor
- [x] LoginPage with toggle login/register, glass card design
- [x] DashboardPage placeholder with stats cards
- [x] ProtectedRoute component

### Phase 11b — Dashboard Page ✅
- [x] Sidebar with navigation
- [x] KPI cards connected to real API data
- [x] Consumption chart (SVG)
- [x] WaterGPT insights panel
- [x] Parcelles ledger table
- [x] Marketplace preview
- [x] Loading state

### Phase 11c — Frontend Pages (remaining)
- [ ] Parcelles management page
- [ ] Consumption input form
- [ ] Asset portfolio / token balance page
- [ ] Marketplace page

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
