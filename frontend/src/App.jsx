import { Routes, Route } from 'react-router-dom'
import ProtectedRoute  from './components/ProtectedRoute'
import OnboardingRoute from './components/OnboardingRoute'
import Landing         from './pages/Landing'
import SignIn          from './pages/SignIn'
import SignUp          from './pages/SignUp'
import Onboarding      from './pages/Onboarding'
import Dashboard       from './pages/Dashboard'
import Leads           from './pages/Leads'
import Conversations   from './pages/Conversations'
import Agents          from './pages/Agents'
import Settings        from './pages/Settings'

export default function App() {
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
      <Route path="/leads" element={
        <ProtectedRoute><Leads /></ProtectedRoute>
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
