import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import API from "../api/client"
import WaterGPTWidget from "../components/WaterGPTWidget"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({ total_tokens: 0, total_transactions: 0, total_consommation_litres: 0 })
  const [parcelles, setParcelles] = useState([])
  const [plantesMap, setPlantesMap] = useState({})
  const [firstQuota, setFirstQuota] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState("dashboard")
  const [period, setPeriod] = useState("30")
  const [filteredStats, setFilteredStats] = useState(null)

  // Mint notification
  const [mintMsg, setMintMsg] = useState("")

  // Add parcelle modal
  const [showAddParcelle, setShowAddParcelle] = useState(false)
  const [plantesList, setPlantesList] = useState([])
  const [addForm, setAddForm] = useState({ type_plante_id: "", surface_m2: "", date_plantation: "" })
  const [addError, setAddError] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState("")
  const [parametresToast, setParametresToast] = useState(false)

  useEffect(() => {
    const link1 = document.createElement("link")
    link1.rel = "stylesheet"
    link1.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
    if (!document.querySelector('link[href*="Inter"]')) document.head.appendChild(link1)

    const link2 = document.createElement("link")
    link2.rel = "stylesheet"
    link2.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    if (!document.querySelector('link[href*="Material+Symbols"]')) document.head.appendChild(link2)
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, parcellesRes, plantesRes] = await Promise.all([
          API.get("/users/me/stats"),
          API.get("/parcelles"),
          API.get("/plantes"),
        ])
        setStats(statsRes.data)
        const parcellesData = parcellesRes.data
        setParcelles(parcellesData)
        const map = {}
        plantesRes.data.forEach(p => { map[p.id] = p })
        setPlantesMap(map)
        if (parcellesData.length > 0) {
          try {
            const quotaRes = await API.get(`/tokens/quota/${parcellesData[0].id}`)
            setFirstQuota(quotaRes.data)
          } catch {}
        }
      } catch {
        // silently fail — state stays at defaults
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchPeriodStats = async () => {
      try {
        const res = await API.get(`/users/me/stats?period=${period}`)
        setFilteredStats(res.data)
      } catch {
        setFilteredStats(null)
      }
    }
    fetchPeriodStats()
  }, [period])

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const truncateWallet = () => ""  // kept for compatibility — unused

  // ── Mint handler ──
  const handleMint = () => {
    setMintMsg("⛓️ Fonctionnalité blockchain bientôt disponible. Vos tokens seront mintés sur Polygon Mumbai.")
    setTimeout(() => setMintMsg(""), 4000)
  }

  // ── Open add-parcelle modal ──
  const openAddModal = async () => {
    setAddError("")
    setAddForm({ type_plante_id: "", surface_m2: "", date_plantation: "" })
    setShowAddParcelle(true)
    try {
      const res = await API.get("/plantes")
      setPlantesList(res.data)
      if (res.data.length > 0) {
        setAddForm((f) => ({ ...f, type_plante_id: String(res.data[0].id) }))
      }
    } catch {
      setPlantesList([])
    }
  }

  // ── Submit new parcelle ──
  const handleAddParcelle = async (e) => {
    e.preventDefault()
    setAddError("")
    if (!addForm.type_plante_id || !addForm.surface_m2) {
      setAddError("Veuillez remplir la culture et la surface.")
      return
    }
    setAddLoading(true)
    try {
      const payload = {
        type_plante_id: addForm.type_plante_id,
        surface_m2: parseFloat(addForm.surface_m2),
        date_plantation: addForm.date_plantation || null,
      }
      console.log("Sending:", payload)
      await API.post("/parcelles", payload)
      const res = await API.get("/parcelles")
      setParcelles(res.data)
      setShowAddParcelle(false)
      setAddSuccess("Parcelle ajoutée avec succès ✅")
      setTimeout(() => setAddSuccess(""), 3000)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setAddError(detail || "Erreur lors de l'ajout. Vérifiez les données.")
    } finally {
      setAddLoading(false)
    }
  }

  const navItems = [
    { key: "dashboard", icon: "dashboard", label: "Dashboard" },
    { key: "quotas", icon: "opacity", label: "Quotas d'Eau" },
    { key: "send", icon: "send", label: "Envoyer tokens" },
    { key: "portefeuille", icon: "account_balance_wallet", label: "Portefeuille" },
    { key: "parametres", icon: "settings", label: "Paramètres" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💧</div>
          <div className="font-bold" style={{ color: "#005d90" }}>Chargement AquaToken...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9fb]">

      {/* ── SIDEBAR ── */}
      <aside className="fixed left-0 top-0 h-screen w-72 flex flex-col z-50 border-r border-slate-200/20"
             style={{ background: "rgba(248,250,252,0.80)", backdropFilter: "blur(20px)" }}>

        <div className="px-8 pt-8 mb-10">
          <div className="text-2xl font-bold bg-gradient-to-r from-sky-700 to-cyan-500 bg-clip-text text-transparent">
            AquaToken
          </div>
          <div className="text-xs font-medium text-slate-500 tracking-wider mt-1">
            Conservation Agricole
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActiveNav(item.key)
                if (item.key === "parametres") {
                  setParametresToast(true)
                  setTimeout(() => setParametresToast(false), 3000)
                } else {
                  const routes = { dashboard: "/dashboard", quotas: "/parcelles", send: "/envoyer", portefeuille: "/portefeuille" }
                  if (routes[item.key]) navigate(routes[item.key])
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                activeNav === item.key
                  ? "bg-white shadow-sm text-sky-700 font-semibold"
                  : "text-slate-500 hover:text-sky-600"
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-6 pb-8 pt-4 border-t border-slate-200/30">
          <div className="px-4 mb-3">
            <div className="text-sm font-bold text-[#191c1e]">{user?.prenom} {user?.nom}</div>
            <div className="text-xl font-black text-[#005d90] font-mono tracking-widest mt-1">
              #{user?.user_code}
            </div>
            <div className="text-xs text-gray-400 capitalize mt-1">{user?.type}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 ml-72 flex flex-col">

        {/* ── TOP NAV ── */}
        <header className="h-20 sticky top-0 z-40 flex items-center justify-between px-8 border-b border-slate-200/20"
                style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(12px)" }}>
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">AquaDashboard</h1>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {(filteredStats || stats).total_tokens.toFixed(2)} tokens
              </div>
              <div className="text-xs font-medium text-sky-600">
                <span className="font-bold text-[#005d90]">{user?.prenom} {user?.nom}</span>
                <span className="font-mono text-gray-400 ml-2">#{user?.user_code}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="hover:bg-slate-100/60 rounded-full p-2 text-slate-500 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="hover:bg-slate-100/60 rounded-full p-2 text-slate-500 transition-colors">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="p-8 space-y-8">

          {/* Welcome Header */}
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#005d90] uppercase tracking-[0.2em] mb-2 block">
                Aperçu du Système
              </span>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                Bienvenue, {user?.prenom || (user?.type === "agriculteur" ? "Agriculteur" : "Entreprise")}
              </h2>
              <p className="text-slate-500 mt-2 font-medium font-mono text-sm">
                #{user?.user_code}
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <button
                onClick={() => setPeriod("7")}
                className={period === "7"
                  ? "px-4 py-2 rounded-xl text-xs font-bold uppercase bg-[#005d90] text-white shadow-sm"
                  : "px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-400 bg-[#f2f4f6] hover:text-[#005d90]"
                }
              >7 Jours</button>
              <button
                onClick={() => setPeriod("30")}
                className={period === "30"
                  ? "px-4 py-2 rounded-xl text-xs font-bold uppercase bg-[#005d90] text-white shadow-sm"
                  : "px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-400 bg-[#f2f4f6] hover:text-[#005d90]"
                }
              >30 Jours</button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 — Total Consumption */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500 border border-transparent hover:border-blue-100">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <span className="material-symbols-outlined">water_drop</span>
                </div>
                {(filteredStats || stats).total_consommation_litres > 0 ? (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">✓ Suivi actif</span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">En attente</span>
                )}
              </div>
              <div className="mt-8">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">
                  {(filteredStats || stats).total_consommation_litres?.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L
                </div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
                  Consommation Totale (Litres)
                </div>
              </div>
            </div>

            {/* Card 2 — AQUA Balance (gradient) */}
            <div>
              <div className="p-6 rounded-[2rem] shadow-lg flex flex-col justify-between text-white relative overflow-hidden group"
                   style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl bg-white/10 -mr-12 -mt-12 group-hover:bg-white/20 transition-all duration-700" />
                <div className="flex justify-between items-start z-10 relative">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  </div>
                  <button
                    onClick={() => navigate("/envoyer")}
                    className="text-[10px] font-black uppercase tracking-widest bg-white text-[#005d90] px-4 py-2 rounded-full hover:bg-blue-50 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    Envoyer
                  </button>
                </div>
                <div className="mt-8 z-10 relative">
                  <div className="text-4xl font-black tracking-tighter">
                    {(filteredStats || stats).total_tokens.toFixed(2)}
                  </div>
                  <div className="text-sm font-semibold opacity-70 uppercase tracking-widest mt-1">
                    Solde tokens
                  </div>
                </div>
              </div>
              {mintMsg && (
                <div className="mt-2 p-3 bg-green-50 text-green-700 rounded-xl text-xs font-medium text-center animate-pulse">
                  {mintMsg}
                </div>
              )}
            </div>

            {/* Card 3 — Efficacité */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500 border border-transparent hover:border-cyan-100">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-cyan-50 rounded-2xl text-cyan-600">
                  <span className="material-symbols-outlined">hub</span>
                </div>
              </div>
              <div className="mt-8">
                <div className="text-4xl font-black tracking-tighter" style={{ color: (filteredStats || stats).total_tokens > 0 ? "#22c55e" : "#94a3b8" }}>
                  {(filteredStats || stats).total_tokens > 0 ? "Bon" : "En attente"}
                </div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
                  Efficacité
                </div>
                <div className="mt-3">
                  {(filteredStats || stats).total_tokens > 0 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ Actif</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">⏳ En attente</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Consumption Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Quota vs Consommation Réelle
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">
                    Analyse des {period} derniers jours
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#005d90]" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Réel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-200" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quota</span>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#005d90" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#005d90" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={period === "7"
                      ? "M0,160 Q100,140 200,150 T400,130 T600,140 T800,120 L800,200 L0,200 Z"
                      : "M0,180 Q100,140 200,160 T400,100 T600,120 T800,40 L800,200 L0,200 Z"}
                    fill="url(#areaGradient)"
                  />
                  <path
                    d={period === "7"
                      ? "M0,160 Q100,140 200,150 T400,130 T600,140 T800,120"
                      : "M0,180 Q100,140 200,160 T400,100 T600,120 T800,40"}
                    fill="none"
                    stroke="#005d90"
                    strokeWidth="4"
                  />
                  <path
                    d="M0,130 L800,130"
                    fill="none"
                    stroke="#e0e3e5"
                    strokeDasharray="8,8"
                    strokeWidth="2"
                  />
                </svg>
                <div className="absolute inset-0 flex justify-between items-end text-[10px] font-bold text-slate-400 uppercase pb-2">
                  {period === "7" ? (
                    <>
                      <span>Jour 01</span>
                      <span>Jour 02</span>
                      <span>Jour 03</span>
                      <span>Jour 05</span>
                      <span>Jour 07</span>
                    </>
                  ) : (
                    <>
                      <span>Jour 01</span>
                      <span>Jour 07</span>
                      <span>Jour 14</span>
                      <span>Jour 21</span>
                      <span>Jour 30</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* WaterGPT Insights */}
            <div className="bg-[#f2f4f6] p-8 rounded-[2rem] flex flex-col justify-between border border-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-[#00626f]">psychology</span>
                  <h3 className="text-lg font-bold text-slate-900">Insights WaterGPT</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/60 p-4 rounded-2xl border border-white/40">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      <span className="font-bold text-[#005d90]">Efficacité :</span>{" "}
                      Votre système fonctionne correctement. Recommandation : Irriguez tôt le matin entre 5h–8h.
                    </p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-2xl border border-white/40">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      <span className="font-bold text-[#2c694e]">Opportunité :</span>{" "}
                      Vos tokens peuvent être échangés contre du matériel d'irrigation chez nos partenaires.
                    </p>
                  </div>
                </div>
              </div>
              <button className="mt-6 w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] relative z-10 hover:opacity-80 transition-opacity"
                      style={{ background: "#001f24", color: "#e7fbff" }}>
                Ouvrir WaterGPT
              </button>
              <div className="absolute -bottom-8 -right-8 opacity-5">
                <span className="material-symbols-outlined" style={{ fontSize: "12rem" }}>waves</span>
              </div>
            </div>
          </div>


        </main>
      </div>

      {/* ── ADD PARCELLE MODAL ── */}
      {showAddParcelle && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddParcelle(false) }}
        >
          <div className="mt-32 bg-white rounded-[2rem] p-8 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Ajouter une Parcelle</h2>
              <button
                onClick={() => setShowAddParcelle(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddParcelle} className="space-y-5">
              {/* Culture select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Culture *
                </label>
                <select
                  value={addForm.type_plante_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, type_plante_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                  required
                >
                  <option value="">— Sélectionnez une culture —</option>
                  {plantesList.length === 0 ? (
                    <option disabled>Chargement...</option>
                  ) : (
                    plantesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom_commun || p.nom} ({p.besoin_eau_m3_ha_jour ?? "?"} m³/ha/j)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Surface */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Surface (m²) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Ex: 5000"
                  value={addForm.surface_m2}
                  onChange={(e) => setAddForm((f) => ({ ...f, surface_m2: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                  required
                />
              </div>

              {/* Date plantation (optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Date de plantation <span className="font-normal text-slate-400 normal-case">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={addForm.date_plantation}
                  onChange={(e) => setAddForm((f) => ({ ...f, date_plantation: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                />
              </div>

              {/* Error */}
              {addError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium">
                  {addError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddParcelle(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
                >
                  {addLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Ajout...
                    </span>
                  ) : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold animate-pulse">
          {addSuccess}
        </div>
      )}
      {parametresToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold">
          ⚙️ Paramètres bientôt disponibles.
        </div>
      )}

      {/* WaterGPT Widget */}
      <WaterGPTWidget
        crop_type={parcelles.length > 0 && plantesMap[parcelles[0]?.type_plante_id]
          ? plantesMap[parcelles[0].type_plante_id].nom.toLowerCase()
          : "olive"}
        region={user?.localisation || "Tunisie"}
        expected_water={firstQuota?.quota_theorique || 1000}
        actual_water={firstQuota?.reel || 0}
        tokens={Math.round(stats.total_tokens)}
        trust_score={0.5}
      />
    </div>
  )
}
