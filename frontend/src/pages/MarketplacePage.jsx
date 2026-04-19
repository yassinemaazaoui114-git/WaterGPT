import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import API from "../api/client"
import WaterGPTWidget from "../components/WaterGPTWidget"

const ITEMS = [
  { id: 1, emoji: "💧", gradient: "from-blue-400 to-cyan-500", title: "Kit Irrigation Goutte-à-Goutte", description: "Économisez jusqu'à 50% d'eau. Idéal pour oliviers et tomates.", price: 2400, partner: "SONEDE", badge: "Populaire" },
  { id: 2, emoji: "🌿", gradient: "from-green-400 to-emerald-500", title: "Bundle Semences Résistantes", description: "10 variétés adaptées au climat tunisien semi-aride.", price: 1100, partner: "UTAP", badge: "Nouveau" },
  { id: 3, emoji: "📡", gradient: "from-purple-400 to-violet-500", title: "Capteur Humidité Sol", description: "Capteur IoT connecté. Alertes en temps réel sur votre mobile.", price: 800, partner: "GDA", badge: "Tech" },
  { id: 4, emoji: "🚰", gradient: "from-orange-400 to-amber-500", title: "Réduction Facture SONEDE", description: "15% de réduction sur votre prochaine facture d'eau.", price: 500, partner: "SONEDE", badge: "Offre" },
  { id: 5, emoji: "🌱", gradient: "from-teal-400 to-green-500", title: "Formation Agriculture Durable", description: "Accès à 6 modules de formation certifiés MALE.", price: 300, partner: "MALE", badge: "Formation" },
  { id: 6, emoji: "🏦", gradient: "from-sky-400 to-blue-500", title: "Crédit Agricole Préférentiel", description: "Accès à un crédit agricole à taux réduit via nos partenaires.", price: 5000, partner: "CRDA", badge: "Finance" },
]

const PARTNERS = ["SONEDE", "UTAP", "GDA", "CRDA", "MALE"]

export default function MarketplacePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [purchaseMsg, setPurchaseMsg] = useState("")
  const [toast, setToast] = useState("")

  const activeNav = "marketplace"
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
        const res = await API.get("/tokens/balance")
        setBalance(res.data.balance ?? 0)
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

  const handleConfirmPurchase = () => {
    if (!selectedItem) return
    setPurchaseMsg(`🎉 Échange confirmé ! Votre partenaire ${selectedItem.partner} vous contactera dans 48h.`)
    setSelectedItem(null)
    setTimeout(() => setPurchaseMsg(""), 5000)
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
            <div className="text-sm font-bold text-[#191c1e]">{user?.prenom} {user?.nom}</div>
            <div className="text-xl font-black text-[#005d90] font-mono tracking-widest mt-1">
              #{user?.user_code}
            </div>
            <div className="text-xs text-gray-400 capitalize mt-1">{user?.type}</div>
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
          <div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Marketplace AquaToken</h1>
            <p className="text-xs text-slate-400 font-medium">Échangez vos tokens contre des récompenses agricoles</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[#005d90]/10 text-[#005d90] px-4 py-2 rounded-full text-sm font-bold">
              💰 {balance.toFixed(2)} tokens disponibles
            </div>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* Page header */}
          <div>
            <span className="text-xs font-bold text-[#005d90] uppercase tracking-[0.2em] mb-2 block">Récompenses</span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Dépenser mes Tokens</h2>
            <p className="text-slate-500 mt-2 font-medium text-sm">Échangez vos tokens contre du matériel, des services et des formations</p>
          </div>

          {/* Success message */}
          {purchaseMsg && (
            <div className="p-5 rounded-2xl border border-green-200 text-green-800 font-medium text-sm"
                 style={{ background: "linear-gradient(135deg, #dcfce7, #f0fdf4)" }}>
              {purchaseMsg}
            </div>
          )}

          {/* PARTNER LOGOS BAR */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Partenaires :</span>
            {PARTNERS.map((p) => (
              <span key={p} className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-bold whitespace-nowrap hover:bg-slate-200 transition-colors cursor-default">
                {p}
              </span>
            ))}
          </div>

          {/* ITEMS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ITEMS.map((item) => {
              const canAfford = balance >= item.price
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                  {/* Card top */}
                  <div className={`relative h-40 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <span className="text-5xl">{item.emoji}</span>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-xl text-[10px] font-black text-slate-700">
                      {item.price.toLocaleString("fr-FR")} tokens
                    </div>
                    <div className="absolute top-3 left-3 bg-black/20 backdrop-blur px-3 py-1 rounded-xl text-[10px] font-bold text-white">
                      {item.badge}
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase">
                        {item.partner}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#005d90] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                    <button
                      onClick={() => canAfford && setSelectedItem(item)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        canAfford
                          ? "text-white hover:opacity-90 shadow-sm"
                          : "text-slate-400 bg-slate-100 cursor-not-allowed"
                      }`}
                      style={canAfford ? { background: "linear-gradient(135deg, #005d90, #0077b6)" } : {}}
                    >
                      {canAfford ? "Obtenir →" : "Solde insuffisant"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* PURCHASE MODAL */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null) }}
        >
          <div className="mt-24 bg-white rounded-[2rem] p-8 shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Confirmer l'échange</h2>
              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={`h-28 rounded-2xl bg-gradient-to-br ${selectedItem.gradient} flex items-center justify-center mb-6`}>
              <span className="text-5xl">{selectedItem.emoji}</span>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-slate-900">{selectedItem.title}</h3>
              <p className="text-sm text-slate-400">{selectedItem.description}</p>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Votre solde</span>
                <span className="font-bold text-slate-900">{balance.toFixed(2)} tokens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Coût</span>
                <span className="font-bold text-red-500">− {selectedItem.price.toLocaleString("fr-FR")} tokens</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Après échange</span>
                <span className="font-black text-slate-900">{(balance - selectedItem.price).toFixed(2)} tokens</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl mb-6">
              ⚠️ La transaction blockchain réelle sera disponible après déploiement du smart contract sur Polygon Mumbai.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setSelectedItem(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleConfirmPurchase}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
                Confirmer l'échange
              </button>
            </div>
          </div>
        </div>
      )}

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
        tokens={Math.round(balance)}
        trust_score={0.5}
      />
    </div>
  )
}
