import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import API from "../api/client"
import WaterGPTWidget from "../components/WaterGPTWidget"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({ total_tokens: 0, total_transactions: 0 })
  const [parcelles, setParcelles] = useState([])
  const [trustScore, setTrustScore] = useState(0.5)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState("dashboard")

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
        const [statsRes, parcellesRes, trustRes] = await Promise.all([
          API.get("/users/me/stats"),
          API.get("/parcelles"),
          API.get("/tokens/trust-score"),
        ])
        setStats(statsRes.data)
        setParcelles(parcellesRes.data)
        setTrustScore(trustRes.data.trust_score ?? 0.5)
      } catch {
        // silently fail — state stays at defaults
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const truncateWallet = (addr) => {
    if (!addr) return ""
    return addr.slice(0, 6) + "..." + addr.slice(-4)
  }

  const trustColor =
    trustScore > 0.7 ? "bg-green-500" : trustScore >= 0.4 ? "bg-yellow-400" : "bg-red-500"

  const navItems = [
    { key: "dashboard", icon: "dashboard", label: "Dashboard" },
    { key: "quotas", icon: "opacity", label: "Quotas d'Eau" },
    { key: "marketplace", icon: "storefront", label: "Marketplace" },
    { key: "portfolio", icon: "account_balance_wallet", label: "Portefeuille" },
    { key: "settings", icon: "settings", label: "Paramètres" },
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

        {/* Logo */}
        <div className="px-8 pt-8 mb-10">
          <div className="text-2xl font-bold bg-gradient-to-r from-sky-700 to-cyan-500 bg-clip-text text-transparent">
            AquaToken
          </div>
          <div className="text-xs font-medium text-slate-500 tracking-wider mt-1">
            Conservation Agricole
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
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

        {/* Bottom: wallet + logout */}
        <div className="px-6 pb-8 pt-4 border-t border-slate-200/30">
          <div className="text-xs text-slate-400 font-mono mb-3 truncate">
            {truncateWallet(user?.wallet_address)}
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
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">AquaDashboard</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {stats.total_tokens.toFixed(2)} AQUA
              </div>
              <div className="text-xs font-mono font-medium text-sky-600">
                {truncateWallet(user?.wallet_address)}
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
                Bienvenue,{" "}
                {user?.type === "agriculteur" ? "Agriculteur" : "Entreprise"}
              </h2>
              <p className="text-slate-500 mt-2 font-medium font-mono text-sm">
                {truncateWallet(user?.wallet_address)}
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <button className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-[#005d90] transition-colors bg-[#f2f4f6]">
                7 Jours
              </button>
              <button className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#005d90] shadow-sm">
                30 Jours
              </button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 — Water Saved */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500 border border-transparent hover:border-sky-100">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-sky-50 rounded-2xl text-sky-600">
                  <span className="material-symbols-outlined">water_drop</span>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+Actif</span>
              </div>
              <div className="mt-8">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">
                  {(stats.total_tokens * 10).toLocaleString("fr-FR")} L
                </div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
                  Eau Économisée (Litres)
                </div>
              </div>
            </div>

            {/* Card 2 — AQUA Balance (gradient) */}
            <div className="p-6 rounded-[2rem] shadow-lg flex flex-col justify-between text-white relative overflow-hidden group"
                 style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl bg-white/10 -mr-12 -mt-12 group-hover:bg-white/20 transition-all duration-700" />
              <div className="flex justify-between items-start z-10 relative">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <button
                  onClick={() => alert("Fonctionnalité blockchain bientôt disponible")}
                  className="text-[10px] font-black uppercase tracking-widest bg-white text-[#005d90] px-4 py-2 rounded-full hover:bg-blue-50 transition-all"
                >
                  Mint $AQUA
                </button>
              </div>
              <div className="mt-8 z-10 relative">
                <div className="text-4xl font-black tracking-tighter">
                  {stats.total_tokens.toFixed(2)}
                </div>
                <div className="text-sm font-semibold opacity-70 uppercase tracking-widest mt-1">
                  Solde $AQUA
                </div>
              </div>
            </div>

            {/* Card 3 — Trust Score */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-500 border border-transparent hover:border-cyan-100">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-cyan-50 rounded-2xl text-cyan-600">
                  <span className="material-symbols-outlined">hub</span>
                </div>
              </div>
              <div className="mt-8">
                <div className="text-4xl font-black text-slate-900 tracking-tighter">
                  {(trustScore * 100).toFixed(1)}/100
                </div>
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">
                  Trust Score
                </div>
                <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${trustColor}`}
                    style={{ width: `${trustScore * 100}%` }}
                  />
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
                    Analyse des 30 derniers jours
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
                    d="M0,180 Q100,140 200,160 T400,100 T600,120 T800,40 L800,200 L0,200 Z"
                    fill="url(#areaGradient)"
                  />
                  <path
                    d="M0,180 Q100,140 200,160 T400,100 T600,120 T800,40"
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
                  <span>Jour 01</span>
                  <span>Jour 07</span>
                  <span>Jour 14</span>
                  <span>Jour 21</span>
                  <span>Jour 30</span>
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
                      Vos tokens $AQUA peuvent être échangés contre du matériel d'irrigation chez nos partenaires.
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

          {/* BOTTOM ROW */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Parcelles Ledger */}
            <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 pb-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Mes Parcelles</h3>
                <button className="text-xs font-bold text-white bg-[#005d90] hover:bg-[#004a73] px-4 py-2 rounded-full transition-colors">
                  Ajouter +
                </button>
              </div>

              {parcelles.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="text-4xl">🌱</div>
                  <p className="mt-2 font-medium">Aucune parcelle enregistrée</p>
                  <p className="text-sm">Ajoutez votre première parcelle pour commencer</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#f2f4f6]/50">
                      <tr>
                        {["ID", "Culture", "Surface", "Statut"].map((h) => (
                          <th key={h} className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parcelles.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-mono text-xs text-sky-700">
                            AQ-{String(p.id).slice(0, 4).toUpperCase()}
                          </td>
                          <td className="px-8 py-4 text-sm font-medium text-slate-700">
                            {p.type_plante_id ? `Plante #${p.type_plante_id}` : "—"}
                          </td>
                          <td className="px-8 py-4 text-sm font-bold text-slate-900">
                            {p.surface_m2} m²
                          </td>
                          <td className="px-8 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              p.actif
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {p.actif ? "Actif" : "Inactif"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Marketplace Preview */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Marketplace</h3>
                <div className="flex gap-2">
                  <button className="p-1.5 rounded-full bg-[#f2f4f6] text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <button className="p-1.5 rounded-full bg-[#f2f4f6] text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Product 1 */}
                <div className="group cursor-pointer">
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden mb-3 flex items-center justify-center"
                       style={{ background: "linear-gradient(135deg, #60a5fa, #06b6d4)" }}>
                    <span className="text-4xl">💧</span>
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-[#005d90]">
                      2 400 AQUA
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 group-hover:text-[#005d90] transition-colors text-sm">
                    Kit Irrigation Goutte-à-Goutte
                  </h4>
                  <p className="text-xs font-medium text-slate-400">Économisez jusqu'à 50% d'eau</p>
                </div>

                {/* Product 2 */}
                <div className="group cursor-pointer">
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden mb-3 flex items-center justify-center"
                       style={{ background: "linear-gradient(135deg, #4ade80, #10b981)" }}>
                    <span className="text-4xl">🌿</span>
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-[#2c694e]">
                      1 100 AQUA
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 group-hover:text-[#2c694e] transition-colors text-sm">
                    Bundle Semences Résistantes
                  </h4>
                  <p className="text-xs font-medium text-slate-400">Variétés adaptées au climat tunisien</p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* WaterGPT Widget */}
      <WaterGPTWidget
        crop_type={parcelles.length > 0 ? "olive" : "non spécifié"}
        region={user?.localisation || "Tunisie"}
        expected_water={1000}
        actual_water={800}
        tokens={Math.round(stats.total_tokens)}
        trust_score={trustScore}
      />
    </div>
  )
}
