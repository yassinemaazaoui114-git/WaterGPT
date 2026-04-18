import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
      <div className="text-[#005d90] font-bold text-lg animate-pulse">
        Chargement AquaToken...
      </div>
    </div>
  )

  if (!user) return <Navigate to="/" replace />
  return children
}
