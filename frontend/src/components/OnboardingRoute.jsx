import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Only reachable when Firebase session exists but DB profile is missing.
// No Firebase session → /signin   |   already onboarded → /dashboard
export default function OnboardingRoute({ children }) {
  const { firebaseUser, dbUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text)]">
        Loading…
      </div>
    )
  }

  if (!firebaseUser) return <Navigate to="/signin" replace />
  if (dbUser)        return <Navigate to="/dashboard" replace />
  return children
}
