import { createContext, useContext, useEffect, useState } from 'react'
import { auth, onAuthStateChanged } from '../services/firebase'
import { getMe } from '../services/api'

// createContext() creates a "global store" that any child component can read
// without prop-drilling (passing data through every intermediate component).
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)  // raw Firebase user
  const [dbUser,       setDbUser]       = useState(null)  // our DB record {user, agent_config}
  const [loading,      setLoading]      = useState(true)  // true while we check auth on page load

  useEffect(() => {
    // onAuthStateChanged fires immediately with the current auth state,
    // and again whenever the user signs in or out.
    // It returns an "unsubscribe" function we call in the cleanup so we
    // don't leak the listener when this component unmounts.
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (fbUser) {
        try {
          const token = await fbUser.getIdToken()
          const data  = await getMe(token)   // null → onboarding not done
          setDbUser(data)
        } catch {
          setDbUser(null)
        }
      } else {
        setDbUser(null)
      }

      setLoading(false)
    })

    return unsubscribe   // cleanup on unmount
  }, [])

  // setDbUser is exposed so Onboarding can update the context after registering
  // without waiting for the next onAuthStateChanged cycle.
  return (
    <AuthContext.Provider value={{ firebaseUser, dbUser, setDbUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — any component can call useAuth() to access auth state.
export const useAuth = () => useContext(AuthContext)
