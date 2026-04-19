import { useState, useEffect, useRef } from "react"
import API from "../api/client"

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        API.get("/notifications"),
        API.get("/notifications/unread-count")
      ])
      setNotifications(notifRes.data)
      setUnreadCount(countRes.data.count)
    } catch (e) {}
  }

  const handleOpen = async () => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0) {
      await API.put("/notifications/mark-all-read")
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({...n, is_read: true})))
    }
  }

  const getIcon = (type) => {
    switch(type) {
      case "transfer_received": return "🪙"
      case "transfer_sent": return "📤"
      case "tokens_minted": return "🌱"
      default: return "🔔"
    }
  }

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `Il y a ${mins}min`
    if (hours < 24) return `Il y a ${hours}h`
    return `Il y a ${days}j`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-slate-100/50 
                   transition-all text-slate-500"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 
                           bg-red-500 text-white text-[10px] font-black 
                           rounded-full flex items-center justify-center
                           animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl 
                        shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <span className="font-bold text-[#191c1e]">Notifications</span>
            <span className="text-xs text-gray-400">{notifications.length} au total</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm font-medium">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 
                              transition-colors cursor-pointer
                              ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-[#191c1e]">{notif.title}</span>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-[#005d90] rounded-full flex-shrink-0 mt-1 ml-2"/>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      {notif.data?.reason && notif.data.reason !== "Transfert de tokens" && (
                        <span className="text-[10px] bg-[#f2f4f6] text-gray-500 
                                         px-2 py-0.5 rounded-full mt-1 inline-block">
                          {notif.data.reason}
                        </span>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">{getTimeAgo(notif.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 text-center border-t border-gray-100">
              <button
                onClick={async () => {
                  await API.put("/notifications/mark-all-read")
                  setUnreadCount(0)
                  setNotifications(prev => prev.map(n => ({...n, is_read: true})))
                }}
                className="text-xs text-[#005d90] font-bold hover:underline"
              >
                Tout marquer comme lu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}