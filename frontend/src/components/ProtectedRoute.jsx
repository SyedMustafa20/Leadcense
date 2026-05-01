import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Requires both a Firebase session AND a completed DB profile.
// Unauthed → /signin   |   authed but not onboarded → /onboarding
export default function ProtectedRoute({ children }) {
  const { firebaseUser, dbUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text)]">
        Loading…
      </div>
    )
  }

  if (!firebaseUser) return <Navigate to="/signin" replace />
  if (!dbUser)       return <Navigate to="/onboarding" replace />
  return children
}
