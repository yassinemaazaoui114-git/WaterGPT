import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import API from "../api/client"
import WaterGPTWidget from "../components/WaterGPTWidget"

export default function PortefeuillePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [balance, setBalance] = useState({ balance: 0, transactions: 0 })
  const [trustScore, setTrustScore] = useState(0.5)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState("")

  const [quotaInput, setQuotaInput] = useState("")
  const [reelInput, setReelInput] = useState("")
  const [calcResult, setCalcResult] = useState(null)

  const activeNav = "portefeuille"
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
        const [balanceRes, trustRes] = await Promise.all([
          API.get("/tokens/balance"),
          API.get("/tokens/trust-score"),
        ])
        setBalance(balanceRes.data)
        setTrustScore(trustRes.data.trust_score ?? 0.5)
      } catch {}
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const handleLogout = () => { logout(); navigate("/") }
  const truncateWallet = () => ""  // kept for compatibility — unused

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const handleNavClick = (key) => {
    if (key === "parametres") showToast("⚙️ Paramètres bientôt disponibles.")
    else {
      const routes = { dashboard: "/dashboard", quotas: "/parcelles", marketplace: "/marketplace", portefeuille: "/portefeuille" }
      if (routes[key]) navigate(routes[key])
    }
  }

  const handleCalculate = () => {
    const quota = parseFloat(quotaInput)
    const reel = parseFloat(reelInput)
    if (!quota || !reel || isNaN(quota) || isNaN(reel)) {
      setCalcResult({ error: "Veuillez saisir des valeurs valides." })
      return
    }
    const economie = quota - reel
    if (economie <= 0) {
      setCalcResult({ error: "Aucun token — votre consommation dépasse le quota." })
      return
    }
    const ratio = (economie / quota) * 100
    if (ratio < 5) {
      setCalcResult({ error: `Économie insuffisante (${ratio.toFixed(1)}% < 5% minimum).` })
      return
    }
    const tokens = economie * 0.1 * (1 + ratio / 100)
    setCalcResult({ tokens, economie, ratio })
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
          <div className="px-4 mb-3">
            <div className="text-xs text-gray-400 font-bold uppercase mb-1">Identifiant</div>
            <div className="text-sm font-black text-[#005d90] font-mono">{user?.aqua_id}</div>
            <div className="text-xs text-gray-500">{user?.prenom} {user?.nom}</div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors font-medium">
            <span className="material-symbols-outlined text-lg">logout</span>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 ml-72 flex flex-col">
        <header className="h-20 sticky top-0 z-40 flex items-center justify-between px-8 border-b border-slate-200/20"
                style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(12px)" }}>
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mon Portefeuille</h1>
          <div className="flex gap-1">
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
          <div>
            <span className="text-xs font-bold text-[#005d90] uppercase tracking-[0.2em] mb-2 block">Actifs Numériques</span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Portefeuille tokens</h2>
            <p className="text-slate-500 mt-2 font-medium text-sm">Gérez vos tokens et suivez votre score de confiance</p>
          </div>

          {/* 3 STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 — AQUA Balance */}
            <div className="p-6 rounded-[2rem] shadow-lg flex flex-col justify-between text-white relative overflow-hidden group"
                 style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl bg-white/10 -mr-12 -mt-12 group-hover:bg-white/20 transition-all duration-700" />
              <div className="p-3 bg-white/20 rounded-2xl w-fit z-10 relative">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <div className="mt-8 z-10 relative">
                <div className="text-4xl font-black tracking-tighter">
                  {(balance.balance ?? 0).toFixed(2)}
                </div>
                <div className="text-sm font-semibold opacity-70 uppercase tracking-widest mt-1">Solde Total tokens</div>
              </div>
            </div>

            {/* Card 2 — Score d'Efficacité */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 w-fit">
                <span className="material-symbols-outlined">trending_up</span>
              </div>
              <div className="mt-8">
                <div className="text-3xl font-black tracking-tighter" style={{ color: (balance.balance ?? 0) > 0 ? "#22c55e" : "#94a3b8" }}>
                  {(balance.balance ?? 0) > 0 ? "Bon ✅" : "En attente ⏳"}
                </div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">Score d'Efficacité</div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Votre score s'améliore chaque fois que vous consommez moins que votre quota calculé.
                </p>
              </div>
            </div>

            {/* Card 3 — Transactions */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500 border border-transparent hover:border-sky-100">
              <div className="p-3 bg-sky-50 rounded-2xl text-sky-600 w-fit">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <div className="mt-8">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">
                  {balance.transactions ?? 0}
                </div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
                  Transactions Total
                </div>
              </div>
            </div>
          </div>

          {/* TOKEN CALCULATOR */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Simuler mes Tokens</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Calculez combien de tokens vous pouvez gagner en fonction de votre économie d'eau</p>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mb-6">
              <p className="text-sm text-[#005d90] font-medium leading-relaxed">
                <span className="font-bold">💡 Comment fonctionnent les tokens ?</span><br/>
                Chaque mois, le système calcule un quota d'eau personnalisé pour votre parcelle selon la culture et la surface.
                Si vous consommez MOINS que ce quota, vous gagnez des tokens.
                Plus vous économisez, plus vous gagnez.
                <br/><br/>
                <span className="font-bold">Formule :</span>{" "}
                tokens = (quota - consommation réelle) × 0.1 × (1 + ratio d'économie)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quota prévu (L)</label>
                <input
                  type="number" min="0" step="0.1" placeholder="Ex: 5000"
                  value={quotaInput}
                  onChange={(e) => { setQuotaInput(e.target.value); setCalcResult(null) }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consommation réelle (L)</label>
                <input
                  type="number" min="0" step="0.1" placeholder="Ex: 3500"
                  value={reelInput}
                  onChange={(e) => { setReelInput(e.target.value); setCalcResult(null) }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#005d90]/30 bg-[#f7f9fb]"
                />
              </div>
              <button
                onClick={handleCalculate}
                className="py-3 px-6 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
              >
                Calculer →
              </button>
            </div>

            {calcResult && (
              <div className={`mt-6 p-5 rounded-2xl text-sm font-medium ${calcResult.error ? "bg-red-50 text-red-700 border border-red-100" : "border border-sky-100 text-sky-800"}`}
                   style={!calcResult.error ? { background: "linear-gradient(135deg, #e0f4ff, #f0fbff)" } : {}}>
                {calcResult.error ? (
                  <span>⚠️ {calcResult.error}</span>
                ) : (
                  <div className="space-y-1">
                    <div className="text-lg font-black text-sky-900">
                      💰 Estimation: {calcResult.tokens.toFixed(2)} tokens
                    </div>
                    <div className="text-sky-600">
                      Économie: <strong>{calcResult.economie.toFixed(0)} L</strong> ({calcResult.ratio.toFixed(1)}% du quota)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRANSACTION HISTORY */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6">Historique des Transactions</h3>
            {(balance.transactions ?? 0) === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-500 font-medium">Aucune transaction.</p>
                <p className="text-sm text-slate-400 mt-1">Commencez par saisir votre consommation d'eau pour générer des tokens.</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#f7f9fb] text-sm text-slate-500 font-medium text-center">
                {balance.transactions} transaction(s) enregistrée(s). Détail disponible prochainement.
              </div>
            )}
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold">
          {toast}
        </div>
      )}

      <WaterGPTWidget
        crop_type="non spécifié"
        region={user?.localisation || "Tunisie"}
        expected_water={1000}
        actual_water={800}
        tokens={Math.round(balance.balance ?? 0)}
        trust_score={trustScore}
      />
    </div>
  )
}
