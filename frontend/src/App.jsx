import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import ParcellesPage from "./pages/ParcellesPage"
import PortefeuillePage from "./pages/PortefeuillePage"
import MarketplacePage from "./pages/MarketplacePage"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/parcelles" element={
            <ProtectedRoute><ParcellesPage /></ProtectedRoute>
          } />
          <Route path="/portefeuille" element={
            <ProtectedRoute><PortefeuillePage /></ProtectedRoute>
          } />
          <Route path="/marketplace" element={
            <ProtectedRoute><MarketplacePage /></ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
