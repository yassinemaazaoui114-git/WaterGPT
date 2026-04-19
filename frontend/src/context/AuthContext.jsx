import { createContext, useContext, useState, useEffect } from "react"
import API from "../api/client"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("aquatoken_jwt")
    const savedUser = localStorage.getItem("aquatoken_user")
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (gsm, password) => {
    const response = await API.post("/auth/login", { gsm, password })
    const data = response.data
    localStorage.setItem("aquatoken_jwt", data.access_token)
    localStorage.setItem("aquatoken_user", JSON.stringify({
      id: data.user_id,
      aqua_id: data.aqua_id,
      prenom: data.prenom,
      nom: data.nom,
      gsm: data.gsm,
      type: data.type,
    }))
    setUser({ id: data.user_id, aqua_id: data.aqua_id, prenom: data.prenom, nom: data.nom, gsm: data.gsm, type: data.type })
    return data
  }

  const register = async (prenom, nom, gsm, password, type, localisation) => {
    const response = await API.post("/auth/register", {
      prenom, nom, gsm, password, type, localisation,
    })
    const data = response.data
    localStorage.setItem("aquatoken_jwt", data.access_token)
    localStorage.setItem("aquatoken_user", JSON.stringify({
      id: data.user_id,
      aqua_id: data.aqua_id,
      prenom: data.prenom,
      nom: data.nom,
      gsm: data.gsm,
      type: data.type,
    }))
    setUser({ id: data.user_id, aqua_id: data.aqua_id, prenom: data.prenom, nom: data.nom, gsm: data.gsm, type: data.type })
    return data
  }

  const logout = () => {
    localStorage.removeItem("aquatoken_jwt")
    localStorage.removeItem("aquatoken_user")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
