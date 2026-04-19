import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import API from "../api/client"
import NotificationBell from "../components/NotificationBell"

const REASONS = [
  "💧 Échange d'eau",
  "🤝 Remboursement",
  "🌱 Coopérative agricole",
  "🎁 Cadeau",
  "✏️ Autre",
]

const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CHAR_COLORS = ["#4ade80", "#60a5fa", "#f59e0b", "#f87171", "#a78bfa"]

function generateCaptcha() {
  return Array.from({ length: 5 }, () =>
    CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
  ).join("")
}

export default function EnvoyerTokensPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [balance, setBalance] = useState(0)
  const [receiverCode, setReceiverCode] = useState("")
  const [amount, setAmount] = useState("")
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptcha())
  const [captchaInput, setCaptchaInput] = useState("")
  const [reason, setReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [step, setStep] = useState(1)
  const [transferResult, setTransferResult] = useState(null)
  const [toast, setToast] = useState("")

  const captchaRotations = useMemo(
    () => Array.from({ length: 5 }, () => (Math.random() - 0.5) * 20),
    [captchaCode]
  )

  const activeNav = "send"
  const navItems = [
    { key: "dashboard", icon: "dashboard", label: "Dashboard" },
    { key: "quotas", icon: "opacity", label: "Quotas d'Eau" },
    { key: "send", icon: "send", label: "Envoyer tokens" },
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
    async function fetchBalance() {
      try {
        const res = await API.get("/tokens/balance")
        setBalance(res.data.balance ?? 0)
      } catch {}
      finally { setPageLoading(false) }
    }
    fetchBalance()
  }, [])

  const handleLogout = () => { logout(); navigate("/") }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const handleNavClick = (key) => {
    if (key === "parametres") showToast("⚙️ Paramètres bientôt disponibles.")
    else {
      const routes = { dashboard: "/dashboard", quotas: "/parcelles", send: "/envoyer", portefeuille: "/portefeuille" }
      if (routes[key]) navigate(routes[key])
    }
  }

  const handleContinue = () => {
    setErrorMsg("")
    const parsedAmount = parseFloat(amount)
    if (receiverCode === user?.user_code) {
      setErrorMsg("Vous ne pouvez pas vous envoyer des tokens")
      return
    }
    if (parsedAmount > balance) {
      setErrorMsg("Solde insuffisant")
      return
    }
    setStep(2)
  }

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha())
    setCaptchaInput("")
  }

  const handleTransfer = async () => {
    if (captchaInput.toUpperCase() !== captchaCode) {
      setErrorMsg("Code de vérification incorrect")
      refreshCaptcha()
      return
    }

    setLoading(true)
    setErrorMsg("")

    try {
      const res = await API.post("/tokens/transfer", {
        receiver_code: receiverCode,
        amount: parseFloat(amount),
        reason: reason === "✏️ Autre" ? customReason : reason || "Transfert de tokens",
      })
      setTransferResult(res.data)
      setStep(3)
      const balRes = await API.get("/tokens/balance")
      setBalance(balRes.data.balance ?? 0)
    } catch (err) {
      const detail = err.response?.data?.detail || "Erreur lors du transfert"
      setErrorMsg(detail)
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setReceiverCode("")
    setAmount("")
    setCaptchaInput("")
    setCaptchaCode(generateCaptcha())
    setTransferResult(null)
    setErrorMsg("")
  }

  const canContinue = receiverCode.length === 6 && amount && parseFloat(amount) > 0
  const canConfirm = captchaInput.toUpperCase() === captchaCode && !loading

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🪙</div>
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
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Envoyer des Tokens</h1>
            <p className="text-xs text-slate-400 font-medium">Transférez vos tokens à un autre agriculteur</p>
          </div>
          <div className="bg-[#005d90]/10 text-[#005d90] px-4 py-2 rounded-full text-sm font-bold">
            🪙 {balance.toFixed(2)} tokens disponibles
          </div>
        </header>

        <main className="p-8">
          <div className="max-w-lg mx-auto pt-4">

            {/* Page header */}
            <div className="mb-6">
              <span className="text-xs font-bold text-[#005d90] uppercase tracking-[0.2em] mb-2 block">Transfert</span>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">🪙 Envoyer des Tokens</h2>
              <p className="text-slate-500 mt-2 font-medium text-sm">Transférez vos tokens à un autre agriculteur</p>
            </div>

            {/* Balance card */}
            <div className="rounded-2xl p-5 text-white mb-6 flex justify-between items-center"
                 style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
              <div>
                <div className="text-xs opacity-70 font-bold uppercase">Solde disponible</div>
                <div className="text-3xl font-black">{balance.toFixed(2)}</div>
                <div className="text-xs opacity-70">tokens</div>
              </div>
              <div className="text-4xl">🪙</div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <span className="text-xl">❌</span>
                <span className="font-medium text-sm">{errorMsg}</span>
              </div>
            )}

            {/* STEP 1 — Form */}
            {step === 1 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                {/* Receiver code */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Code du destinataire
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#005d90] font-bold">#</span>
                    <input
                      type="text"
                      maxLength={6}
                      value={receiverCode}
                      onChange={(e) => setReceiverCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full bg-[#f2f4f6] rounded-xl py-3 pl-10 pr-4 text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#005d90]/20"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Entrez le code à 6 chiffres du destinataire</p>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Montant à envoyer
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex: 10.00"
                      className="w-full bg-[#f2f4f6] rounded-xl py-3 px-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#005d90]/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#005d90] text-xs font-bold">tokens</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {["5", "10", "25", "50"].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmount(amt)}
                        className="px-3 py-1 rounded-full bg-[#f2f4f6] text-sm font-bold hover:bg-[#005d90] hover:text-white transition-all"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Motif (optionnel)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {REASONS.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setReason(r); if (r !== "✏️ Autre") setCustomReason("") }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          reason === r
                            ? "bg-[#005d90] text-white"
                            : "bg-[#f2f4f6] text-gray-600 hover:bg-[#e0e3e5]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason === "✏️ Autre" && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                      placeholder="Décrivez le motif..."
                      maxLength={100}
                      className="w-full bg-[#f2f4f6] rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#005d90]/20"
                    />
                  )}
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="w-full py-3 rounded-full text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
                >
                  Continuer →
                </button>
              </div>
            )}

            {/* STEP 2 — Captcha */}
            {step === 2 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
                {/* Summary */}
                <div className="bg-[#f2f4f6] rounded-2xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Destinataire</span>
                    <span className="font-black font-mono text-[#005d90]">#{receiverCode}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Montant</span>
                    <span className="font-black text-[#191c1e]">{amount} tokens</span>
                  </div>
                </div>

                {/* Captcha */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-3 font-medium">
                    Tapez le code ci-dessous pour confirmer
                  </p>
                  <div className="relative inline-block">
                    <div className="bg-[#001d32] rounded-2xl px-8 py-4 inline-flex items-center gap-3 shadow-xl">
                      {captchaCode.split("").map((char, i) => (
                        <span
                          key={i}
                          className="text-3xl font-black font-mono"
                          style={{
                            transform: `rotate(${captchaRotations[i]}deg)`,
                            color: CHAR_COLORS[i % 5],
                            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                            display: "inline-block",
                          }}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ opacity: 0.3 }}
                    >
                      <line x1="10%" y1="30%" x2="90%" y2="70%" stroke="white" strokeWidth="1.5" />
                      <line x1="20%" y1="80%" x2="80%" y2="20%" stroke="white" strokeWidth="1" />
                    </svg>
                  </div>
                  <button
                    onClick={refreshCaptcha}
                    className="block mx-auto mt-2 text-xs text-[#005d90] hover:underline"
                  >
                    🔄 Nouveau code
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={5}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Tapez le code ici"
                  className="w-full bg-[#f2f4f6] rounded-xl py-3 px-4 text-center text-xl font-mono font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#005d90]/20"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setErrorMsg("") }}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ← Retour
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={!canConfirm}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Envoi...
                      </>
                    ) : "Confirmer l'envoi"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Success */}
            {step === 3 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-2xl font-black text-[#191c1e] mb-2">Transfert réussi !</h2>
                <p className="text-gray-500 mb-6">
                  {transferResult?.amount} tokens envoyés à{" "}
                  <span className="font-bold text-[#005d90]">{transferResult?.receiver_name}</span>
                  {" "}(#{transferResult?.receiver_code})
                </p>

                <div className="rounded-2xl p-4 text-white mb-6"
                     style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
                  <div className="text-xs opacity-70">Nouveau solde</div>
                  <div className="text-3xl font-black">{balance.toFixed(2)} tokens</div>
                </div>

                <button
                  onClick={resetForm}
                  className="w-full py-3 text-white font-bold rounded-full"
                  style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
                >
                  Nouveau transfert
                </button>
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
    </div>
  )
}
