import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import WaterGPTWidget from "../components/WaterGPTWidget"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      {/* Top nav */}
      <nav className="h-16 bg-white shadow-sm flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm"
               style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}>
            💧
          </div>
          <span className="text-xl font-black text-[#005d90]">AquaToken</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-mono">
            {user?.wallet_address?.slice(0, 6)}...{user?.wallet_address?.slice(-4)}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-[#005d90] mb-2">
            Bienvenue sur AquaToken 🌊
          </h1>
          <p className="text-gray-500 mb-2">
            Connecté en tant que: <span className="font-mono font-bold">{user?.type}</span>
          </p>
          <p className="text-gray-400 text-sm">
            Dashboard complet en cours de développement
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-3xl font-black text-[#005d90]">0</div>
            <div className="text-xs text-gray-400 font-bold uppercase mt-1">Tokens AQUA</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-3xl font-black text-[#2c694e]">0</div>
            <div className="text-xs text-gray-400 font-bold uppercase mt-1">Parcelles</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-3xl font-black text-[#00626f]">0.5</div>
            <div className="text-xs text-gray-400 font-bold uppercase mt-1">Trust Score</div>
          </div>
        </div>
      </main>

      {/* WaterGPT Widget */}
      <WaterGPTWidget
        crop_type={user?.type === "agriculteur" ? "olive" : "non spécifié"}
        region="Tunisie"
        expected_water={1000}
        actual_water={800}
        tokens={0}
        trust_score={0.5}
      />
    </div>
  )
}
