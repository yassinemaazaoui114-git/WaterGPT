import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import API from "../api/client"
import WaterGPTWidget from "../components/WaterGPTWidget"

const SAISONS = ["printemps", "été", "automne", "hiver"]

function getSaisonFromMonth() {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return "printemps"
  if (m >= 6 && m <= 8) return "été"
  if (m >= 9 && m <= 11) return "automne"
  return "hiver"
}

export default function ParcellesPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [parcelles, setParcelles] = useState([])
  const [plantes, setPlantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState("")

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ type_plante_id: "", surface_m2: "", date_plantation: "" })
  const [addError, setAddError] = useState("")
  const [addLoading, setAddLoading] = useState(false)

  const [showConsoForm, setShowConsoForm] = useState(false)
  const [selectedParcelle, setSelectedParcelle] = useState(null)
  const [consoForm, setConsoForm] = useState({ date: new Date().toISOString().split("T")[0], litres_consommes: "", saison: getSaisonFromMonth() })
  const [consoError, setConsoError] = useState("")
  const [consoLoading, setConsoLoading] = useState(false)
  const [tokenResult, setTokenResult] = useState(null)

  const activeNav = "quotas"
  const navItems = [
    { key: "dashboard", icon: "dashboard", label: "Dashboard" },
    { key: "quotas", icon: "opacity", label: "Quotas d'Eau" },
    { key: "marketplace", icon: "storefront", label: "Marketplace" },
    { key: "portefeuille", icon: "account_balance_wallet", label: "Portefeuille" },
    { key: "parametres", icon: "settings", label: "Paramètres" },
  ]

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
        const [parcellesRes, plantesRes] = await Promise.all([
          API.get("/parcelles"),
          API.get("/plantes"),
        ])
        setParcelles(parcellesRes.data)
        setPlantes(plantesRes.data)
        if (plantesRes.data.length > 0) {
          setAddForm((f) => ({ ...f, type_plante_id: String(plantesRes.data[0].id) }))
        }
      } catch {}
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const refetchParcelles = async () => {
    try { const res = await API.get("/parcelles"); setParcelles(res.data) } catch {}
  }

  const handleLogout = () => { logout(); navigate("/") }
  const truncateWallet = (addr) => addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : ""

  const getPlanteName = (typeId) => {
    const p = plantes.find(p => String(p.id) === String(typeId))
    return p ? (p.nom_commun || p.nom) : `Culture #${String(typeId).slice(0, 4)}`
  }

  const showToast = (msg, duration = 3000) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(""), duration)
  }

  const handleNavClick = (key) => {
    if (key === "parametres") {
      showToast("⚙️ Paramètres bientôt disponibles.")
    } else {
      const routes = { dashboard: "/dashboard", quotas: "/parcelles", marketplace: "/marketplace", portefeuille: "/portefeuille" }
      if (routes[key]) navigate(routes[key])
    }
  }

  const openAddModal = () => {
    setAddError("")
    setAddForm({ type_plante_id: "", surface_m2: "", date_plantation: "" })
    setShowAddForm(true)
  }

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
      await refetchParcelles()
      setShowAddForm(false)
      showToast("Parcelle ajoutée avec succès ✅")
    } catch (err) {
      const detail = err?.response?.data?.detail
      setAddError(detail || "Erreur lors de l'ajout. Vérifiez les données.")
    } finally {
      setAddLoading(false)
    }
  }

  const openConsoModal = (parcelle) => {
    setSelectedParcelle(parcelle)
    setConsoError("")
    setConsoForm({ date: new Date().toISOString().split("T")[0], litres_consommes: "", saison: getSaisonFromMonth() })
    setTokenResult(null)
    setShowConsoForm(true)
  }

  const handleAddConso = async (e) => {
    e.preventDefault()
    setConsoError("")
    if (!consoForm.litres_consommes) {
      setConsoError("Veuillez saisir les litres consommés.")
      return
    }
    setConsoLoading(true)
    try {
      await API.post("/consommation", {
        parcelle_id: selectedParcelle.id,
        date: consoForm.date,
        litres_consommes: parseFloat(consoForm.litres_consommes),
        saison: consoForm.saison,
      })
      setShowConsoForm(false)
      showToast("Consommation enregistrée ✅", 4000)
      try {
        const quotaRes = await API.get(`/tokens/quota/${selectedParcelle.id}`)
        setTokenResult(quotaRes.data)
      } catch {}
    } catch (err) {
      const detail = err?.response?.data?.detail
      setConsoError(detail || "Erreur lors de l'enregistrement.")
    } finally {
      setConsoLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">💧</div>
        <div className="font-bold" style={{ color: "#005d90" }}>Chargement AquaToken...</div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#f7f9fb]">

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-screen w-72 flex flex-col z-50 border-r border-slate-200/20"
             style={{ background: "rgba(248,250,252,0.80)", backdropFilter: "blur(20px)" }}>
        <div className="px-8 pt-8 mb-10">
          <div className="text-2xl font-bold bg-gradient-to-r from-sky-700 to-cyan-500 bg-clip-text text-transparent">
            AquaToken
          </div>
          <div className="text-xs font-medium text-slate-500 tracking-wider mt-1">Conservation Agricole</div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
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
          <div className="text-xs text-slate-400 font-mono mb-3 truncate">{truncateWallet(user?.wallet_address)}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 ml-72 flex flex-col">
        <header className="h-20 sticky top-0 z-40 flex items-center justify-between px-8 border-b border-slate-200/20"
                style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(12px)" }}>
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mes Parcelles</h1>
          <div className="flex items-center gap-4">
            <button className="hover:bg-slate-100/60 rounded-full p-2 text-slate-500 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="hover:bg-slate-100/60 rounded-full p-2 text-slate-500 transition-colors">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* Page header */}
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-bold text-[#005d90] uppercase tracking-[0.2em] mb-2 block">Gestion Agricole</span>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Quotas d'Eau</h2>
              <p className="text-slate-500 mt-2 font-medium text-sm">Gérez vos parcelles et saisissez votre consommation</p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white hover:opacity-90 transition-all shadow-sm"
              style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Nouvelle Parcelle
            </button>
          </div>

          {/* Token result info card */}
          {tokenResult && (
            <div className="p-5 rounded-2xl border border-sky-200 text-sm font-medium text-sky-800"
                 style={{ background: "linear-gradient(135deg, #e0f4ff, #f0fbff)" }}>
              <span className="font-bold">💧 Résultat Tokens —</span>{" "}
              Quota: <strong>{tokenResult.quota_litres?.toFixed(0) ?? "?"} L</strong> ·
              Réel: <strong>{tokenResult.consommation_reelle?.toFixed(0) ?? "?"} L</strong> ·
              Tokens potentiels: <strong>{tokenResult.tokens_potentiels?.toFixed(2) ?? "?"} tokens</strong>
            </div>
          )}

          {/* Parcelles grid */}
          {parcelles.length === 0 ? (
            <div className="bg-white rounded-[2rem] shadow-sm p-20 text-center">
              <div className="text-6xl mb-4">🌱</div>
              <p className="text-xl font-bold text-slate-700 mb-2">Aucune parcelle enregistrée</p>
              <p className="text-slate-400 mb-6">Ajoutez votre première parcelle pour commencer</p>
              <button
                onClick={openAddModal}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
              >
                Ajouter une parcelle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parcelles.map((parcelle) => (
                <div key={parcelle.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-transparent hover:border-sky-100 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">🌿</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {getPlanteName(parcelle.type_plante_id)}
                      </div>
                      <div className="text-xs font-mono text-sky-600">
                        AQ-{String(parcelle.id).slice(0, 4).toUpperCase()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                      parcelle.actif ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {parcelle.actif ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="material-symbols-outlined text-[#005d90] text-base">straighten</span>
                    <span className="font-black text-2xl text-slate-900">{parcelle.surface_m2}</span>
                    <span className="text-sm font-medium text-slate-400">m²</span>
                  </div>

                  {parcelle.date_plantation && (
                    <div className="text-xs text-slate-400 font-medium">
                      Planté le {new Date(parcelle.date_plantation).toLocaleDateString("fr-FR")}
                    </div>
                  )}

                  <button
                    onClick={() => openConsoModal(parcelle)}
                    className="mt-auto w-full py-2.5 rounded-full text-xs font-bold border-2 border-[#005d90] text-[#005d90] hover:bg-[#005d90] hover:text-white transition-all duration-200"
                  >
                    Saisir Consommation
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ADD PARCELLE MODAL */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false) }}
        >
          <div className="mt-24 bg-white rounded-[2rem] p-8 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Ajouter une Parcelle</h2>
              <button onClick={() => setShowAddForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddParcelle} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Culture *</label>
                <select
                  value={addForm.type_plante_id}
                  onChange={(e) => setAddForm(f => ({ ...f, type_plante_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                  required
                >
                  <option value="">— Sélectionnez une culture —</option>
                  {plantes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom_commun || p.nom} {p.besoin_eau_m3_ha_jour ? `(${p.besoin_eau_m3_ha_jour} m³/ha/j)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Surface (m²) *</label>
                <input
                  type="number" min="1" step="0.01" placeholder="Ex: 5000"
                  value={addForm.surface_m2}
                  onChange={(e) => setAddForm(f => ({ ...f, surface_m2: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Date de plantation <span className="font-normal text-slate-400 normal-case">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={addForm.date_plantation}
                  onChange={(e) => setAddForm(f => ({ ...f, date_plantation: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                />
              </div>
              {addError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium">{addError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
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

      {/* CONSUMPTION MODAL */}
      {showConsoForm && selectedParcelle && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConsoForm(false) }}
        >
          <div className="mt-24 bg-white rounded-[2rem] p-8 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Saisir Consommation</h2>
                <p className="text-xs text-slate-400 mt-1">{getPlanteName(selectedParcelle.type_plante_id)} · {selectedParcelle.surface_m2} m²</p>
              </div>
              <button onClick={() => setShowConsoForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddConso} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date *</label>
                <input
                  type="date"
                  value={consoForm.date}
                  onChange={(e) => setConsoForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Litres consommés *</label>
                <input
                  type="number" min="0" step="0.1" placeholder="Ex: 1500"
                  value={consoForm.litres_consommes}
                  onChange={(e) => setConsoForm(f => ({ ...f, litres_consommes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saison</label>
                <div className="flex gap-2 flex-wrap">
                  {SAISONS.map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => setConsoForm(f => ({ ...f, saison: s }))}
                      className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all ${
                        consoForm.saison === s
                          ? "bg-[#005d90] text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {consoError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium">{consoError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowConsoForm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={consoLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
                  {consoLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Enregistrement...
                    </span>
                  ) : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold animate-pulse">
          {successMsg}
        </div>
      )}

      <WaterGPTWidget
        crop_type={parcelles.length > 0 ? getPlanteName(parcelles[0]?.type_plante_id) : "non spécifié"}
        region={user?.localisation || "Tunisie"}
        expected_water={1000}
        actual_water={800}
        tokens={0}
        trust_score={0.5}
      />
    </div>
  )
}
