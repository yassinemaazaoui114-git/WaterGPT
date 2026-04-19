import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function LoginPage() {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState("login") // "login" | "register"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registeredAquaId, setRegisteredAquaId] = useState("")

  // Login fields
  const [gsm, setGsm] = useState("")
  const [password, setPassword] = useState("")

  // Register-only fields
  const [prenom, setPrenom] = useState("")
  const [nom, setNom] = useState("")
  const [userType, setUserType] = useState("agriculteur")
  const [localisation, setLocalisation] = useState("")

  useEffect(() => {
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
    link.rel = "stylesheet"
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  useEffect(() => {
    if (user) navigate("/dashboard")
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (mode === "login") {
        await login(gsm, password)
        navigate("/dashboard")
      } else {
        const data = await register(prenom, nom, gsm, password, userType, localisation)
        setRegisteredAquaId(data.aqua_id)
        // Don't navigate immediately — show the AQ-ID card first
      }
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      if (status === 401) setError("Numéro GSM ou mot de passe incorrect")
      else if (status === 400) setError(detail || "Données invalides")
      else setError("Erreur de connexion. Vérifiez le serveur.")
    } finally {
      setLoading(false)
    }
  }

  // After register — show AQ-ID and let user go to dashboard
  if (registeredAquaId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #001d32 0%, #003d5c 50%, #00626f 100%)" }}
      >
        <div className="relative z-10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-center"
             style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>
          <div className="text-5xl mb-4">💧</div>
          <h2 className="text-2xl font-black text-[#005d90] mb-2">Compte créé !</h2>
          <p className="text-slate-500 text-sm mb-6">Bienvenue sur AquaToken, {prenom} !</p>

          <div className="bg-blue-50 rounded-2xl p-6 mb-6">
            <p className="text-xs text-gray-500 mb-2">Votre identifiant AquaToken</p>
            <p className="text-4xl font-black text-[#005d90] tracking-widest font-mono">
              {registeredAquaId}
            </p>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Notez cet identifiant — il vous permet d'échanger des tokens avec vos partenaires
            </p>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-3.5 rounded-full text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
          >
            Accéder au tableau de bord →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #001d32 0%, #003d5c 50%, #00626f 100%)" }}
    >
      {/* Decorative glow circles */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-20"
           style={{ background: "radial-gradient(circle, #0077b6, transparent)" }} />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-10"
           style={{ background: "radial-gradient(circle, #00b4d8, transparent)" }} />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl"
           style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
               style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
            <span className="material-symbols-outlined text-xl">water_drop</span>
          </div>
          <div>
            <div className="font-black text-[#005d90] text-xl leading-tight">AquaToken</div>
            <div className="text-xs text-gray-400 leading-tight">Conservation intelligente</div>
          </div>
        </div>

        {/* Mode toggle tabs */}
        <div className="flex gap-6 mb-8 border-b border-gray-200">
          <button
            onClick={() => { setMode("login"); setError("") }}
            className={`pb-3 text-sm font-semibold transition-all ${
              mode === "login"
                ? "text-[#005d90] border-b-2 border-[#005d90]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Se Connecter
          </button>
          <button
            onClick={() => { setMode("register"); setError("") }}
            className={`pb-3 text-sm font-semibold transition-all ${
              mode === "register"
                ? "text-[#005d90] border-b-2 border-[#005d90]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Créer un Compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Register-only: Prénom + Nom */}
          {mode === "register" && (
            <>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  person
                </span>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Votre prénom"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80
                             text-sm focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent
                             disabled:opacity-50"
                />
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  badge
                </span>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom de famille"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80
                             text-sm focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent
                             disabled:opacity-50"
                />
              </div>
            </>
          )}

          {/* GSM (login + register) */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              phone
            </span>
            <input
              type="tel"
              value={gsm}
              onChange={(e) => setGsm(e.target.value)}
              placeholder={mode === "login" ? "Votre numéro GSM" : "Ex: 25123456"}
              required
              disabled={loading}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80
                         text-sm focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent
                         disabled:opacity-50"
            />
          </div>
          {mode === "register" && (
            <p className="text-xs text-gray-400 -mt-2 pl-2">Numéro tunisien 8 chiffres</p>
          )}

          {/* Password */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              lock
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              disabled={loading}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80
                         text-sm focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent
                         disabled:opacity-50"
            />
          </div>

          {/* Register-only: Type + Localisation */}
          {mode === "register" && (
            <>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Type de compte
                </div>
                <div className="flex gap-3">
                  {["agriculteur", "entreprise"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUserType(t)}
                      disabled={loading}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold border-2 transition-all capitalize
                        ${userType === t
                          ? "border-[#005d90] bg-[#005d90] text-white"
                          : "border-gray-200 text-gray-500 hover:border-[#005d90] hover:text-[#005d90]"
                        } disabled:opacity-50`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  location_on
                </span>
                <input
                  type="text"
                  value={localisation}
                  onChange={(e) => setLocalisation(e.target.value)}
                  placeholder="Ex: Sfax, Nabeul, Tunis"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80
                             text-sm focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent
                             disabled:opacity-50"
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-white font-bold text-sm mt-2
                       flex items-center justify-center gap-2 transition-all
                       hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {mode === "login" ? "Connexion en cours..." : "Création en cours..."}
              </>
            ) : (
              mode === "login" ? "Connexion →" : "Créer mon compte →"
            )}
          </button>
        </form>

        {/* Trust signals */}
        <div className="flex justify-center gap-6 mt-8 pt-6 border-t border-gray-100">
          {[
            { icon: "encrypted", label: "Chiffré" },
            { icon: "eco", label: "Agricole" },
            { icon: "verified", label: "Sécurisé" },
          ].map(({ icon, label }) => (
            <div key={icon} className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-[#0077b6] text-xl">{icon}</span>
              <span className="text-[10px] text-gray-400 font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
