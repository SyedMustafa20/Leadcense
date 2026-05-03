import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import ProtectedRoute  from './components/ProtectedRoute'
import OnboardingRoute from './components/OnboardingRoute'
import Landing         from './pages/Landing'
import SignIn          from './pages/SignIn'
import SignUp          from './pages/SignUp'
import Onboarding      from './pages/Onboarding'
import Dashboard       from './pages/Dashboard'
import Playground      from './pages/Playground'
import Leads           from './pages/Leads'
import LeadDetail      from './pages/LeadDetail'
import Conversations   from './pages/Conversations'
import Agents          from './pages/Agents'
import Settings        from './pages/Settings'

function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f9ff', zIndex: 9999,
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid #e0e7ff',
        borderTopColor: '#4f46e5',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  const { loading: authLoading } = useAuth()
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  if (authLoading || !fontsReady) return <PageLoader />

  return (
    <Routes>
      <Route path="/"            element={<Landing />} />
      <Route path="/signin"      element={<SignIn />} />
      <Route path="/signup"      element={<SignUp />} />

      <Route path="/onboarding" element={
        <OnboardingRoute>
          <Onboarding />
        </OnboardingRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/playground" element={
        <ProtectedRoute><Playground /></ProtectedRoute>
      } />
      <Route path="/leads" element={
        <ProtectedRoute><Leads /></ProtectedRoute>
      } />
      <Route path="/leads/:leadId" element={
        <ProtectedRoute><LeadDetail /></ProtectedRoute>
      } />
      <Route path="/conversations" element={
        <ProtectedRoute><Conversations /></ProtectedRoute>
      } />
      <Route path="/agents" element={
        <ProtectedRoute><Agents /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Settings /></ProtectedRoute>
      } />
    </Routes>
  )
}
