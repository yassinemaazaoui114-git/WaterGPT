import { useState, useRef, useEffect } from "react"

const API_URL = "http://localhost:8000"

const QUICK_QUESTIONS = [
  "💧 Comment économiser l'eau ?",
  "🌿 Irrigation pour oliviers ?",
  "🪙 Comment gagner des tokens ?",
]

const WELCOME_TEXT =
  "Bonjour ! Je suis WaterGPT 💧\nJe peux vous aider avec vos questions sur l'irrigation, les cultures et le système de tokens AquaToken.\nComment puis-je vous aider aujourd'hui ?"

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderText(text) {
  return text.split('\n').map((line, lineIdx, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    const rendered = parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )
    return (
      <span key={lineIdx}>
        {rendered}
        {lineIdx < arr.length - 1 && <br />}
      </span>
    )
  })
}

// ── Bubble components ────────────────────────────────────────────────────────

function UserBubble({ text }) {
  return (
    <div className="flex justify-end mb-3">
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-none text-white text-sm leading-relaxed"
        style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
      >
        {text}
      </div>
    </div>
  )
}

function BotBubble({ text }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      {/* Mini avatar */}
      <div
        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-1"
        style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
      >
        🤖
      </div>
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm"
        style={{ background: "#ffffff", color: "#191c1e" }}
      >
        {renderText(text)}
      </div>
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div
        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-1"
        style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
      >
        🤖
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center"
        style={{ background: "#ffffff" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full inline-block"
            style={{
              background: "#005d90",
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TokensNotification({ canEarn }) {
  return (
    <div
      className="mx-auto my-2 px-4 py-2 rounded-full text-sm font-medium text-center transition-all duration-300"
      style={{ background: "#aeeecb", color: "#2c694e", maxWidth: "fit-content" }}
    >
      🪙 Vous pouvez gagner {canEarn} tokens !
    </div>
  )
}

// ── Main Widget ──────────────────────────────────────────────────────────────

export default function WaterGPTWidget({
  crop_type = "olive",
  region = "Sfax",
  expected_water = 1000,
  actual_water = 800,
  tokens = 150,
  trust_score = 0.85,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [tokensNotif, setTokensNotif] = useState(null)   // { canEarn }

  const messagesEndRef = useRef(null)

  // Inject Google Fonts — Inter
  useEffect(() => {
    if (document.getElementById("watergpt-inter-font")) return
    const link = document.createElement("link")
    link.id = "watergpt-inter-font"
    link.rel = "stylesheet"
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    document.head.appendChild(link)
  }, [])

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Auto-hide tokens notification after 5 s
  useEffect(() => {
    if (!tokensNotif) return
    const timer = setTimeout(() => setTokensNotif(null), 5000)
    return () => clearTimeout(timer)
  }, [tokensNotif])

  // ── Send message ─────────────────────────────────────────────────────────

  async function sendMessage(text) {
    const trimmed = (text || inputValue).trim()
    if (!trimmed || isLoading) return

    // Add user bubble immediately
    setMessages((prev) => [...prev, { role: "user", text: trimmed }])
    setConversationHistory((prev) => [...prev, { role: "user", content: trimmed }])
    setInputValue("")
    setIsLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          crop_type,
          region,
          expected_water,
          actual_water,
          tokens,
          trust_score,
          conversation_history: conversationHistory,
        }),
      })

      const data = await res.json()
      const botText = data.answer || "Désolé, aucune réponse reçue."

      setMessages((prev) => [...prev, { role: "bot", text: botText }])
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: botText },
      ])

      // Show tokens notification if API returned tokens_info
      if (data.tokens_info && data.tokens_info.can_earn > 0) {
        setTokensNotif({ canEarn: data.tokens_info.can_earn })
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Désolé, une erreur de connexion. Vérifiez que le serveur est démarré.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showWelcome = messages.length === 0

  return (
    <>
      {/* Bouncing-dot keyframes injected once */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .wg-slide-up { animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1) both; }
      `}</style>

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          className="wg-slide-up fixed z-50 flex flex-col overflow-hidden rounded-2xl"
          style={{
            bottom: "6rem",
            right: "1.5rem",
            width: "min(24rem, calc(100vw - 2rem))",
            height: "600px",
            boxShadow: "0 24px 60px rgba(0,93,144,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-t-2xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #005d90, #0077b6)" }}
          >
            {/* Left: avatar + title */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                🤖
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">WaterGPT</p>
                <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Assistant Agricole
                </p>
              </div>
            </div>

            {/* Right: context pill + close */}
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded-full text-white"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                🌿 {crop_type} · {region}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white transition-all duration-200 hover:scale-110 w-7 h-7 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.15)" }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Messages area ── */}
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ background: "#f7f9fb" }}
          >
            {/* Welcome message (static) */}
            <BotBubble text={WELCOME_TEXT} />

            {/* Quick question pills — only before first user message */}
            {showWelcome && (
              <div className="flex flex-wrap gap-2 mt-1 mb-3 pl-8">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: "#e8f4fd",
                      color: "#005d90",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <UserBubble key={i} text={msg.text} />
              ) : (
                <BotBubble key={i} text={msg.text} />
              )
            )}

            {/* Typing indicator */}
            {isLoading && <LoadingBubble />}

            {/* Tokens notification */}
            {tokensNotif && <TokensNotification canEarn={tokensNotif.canEarn} />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <div
            className="flex items-center gap-2 px-3 py-3 rounded-b-2xl flex-shrink-0"
            style={{ background: "#ffffff" }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="flex-1 px-4 py-2 rounded-full text-sm outline-none transition-all duration-200"
              style={{
                background: "#f7f9fb",
                color: "#191c1e",
                fontFamily: "'Inter', sans-serif",
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                background: !inputValue.trim() || isLoading
                  ? "#707881"
                  : "linear-gradient(135deg, #005d90, #0077b6)",
              }}
              aria-label="Envoyer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed z-50 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          bottom: "1.5rem",
          right: "1.5rem",
          background: "linear-gradient(135deg, #005d90, #0077b6)",
          boxShadow: "0 8px 32px rgba(0,93,144,0.40), 0 2px 8px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          fontFamily: "'Inter', sans-serif",
        }}
        aria-label={isOpen ? "Fermer WaterGPT" : "Ouvrir WaterGPT"}
      >
        {/* Online pulse dot */}
        <span
          className="absolute top-1 right-1 w-3 h-3 rounded-full"
          style={{ background: "#4ade80" }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "#4ade80",
              animation: "bounce 1.5s ease-in-out infinite",
              opacity: 0.5,
            }}
          />
        </span>

        {/* Toggle icon */}
        {isOpen ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>💧</span>
        )}
      </button>
    </>
  )
}
