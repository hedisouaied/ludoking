import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { Home } from './pages/Home'
import { LobbyPage } from './pages/LobbyPage'
import { LocalGamePage } from './pages/LocalGamePage'
import { LocalSetup } from './pages/LocalSetup'
import { OnlineGamePage } from './pages/OnlineGamePage'
import { RulesPage } from './pages/RulesPage'
import { useAuth } from './stores/auth'

export default function App() {
  const init = useAuth((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/local" element={<LocalSetup />} />
          <Route path="/play" element={<LocalGamePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/auth/:mode" element={<AuthPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/lobby/:code" element={<LobbyPage />} />
          <Route path="/game/:id" element={<OnlineGamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}