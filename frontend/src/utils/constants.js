export const INDUSTRIES = [
  { value: 'real_estate',  label: 'Real Estate' },
  { value: 'healthcare',   label: 'Healthcare' },
  { value: 'technology',   label: 'Technology' },
  { value: 'finance',      label: 'Finance' },
  { value: 'education',    label: 'Education' },
  { value: 'legal',        label: 'Legal' },
  { value: 'automotive',   label: 'Automotive' },
  { value: 'ecommerce',    label: 'E-Commerce' },
  { value: 'hospitality',  label: 'Hospitality' },
  { value: 'fitness',      label: 'Fitness' },
  { value: 'construction', label: 'Construction' },
  { value: 'recruitment',  label: 'Recruitment' },
]

export const INDUSTRY_LABELS = Object.fromEntries(
  INDUSTRIES.map(({ value, label }) => [value, label])
)

export function getAuthError(err) {
  const code = err?.code || ''
  if (code.includes('email-already-in-use'))  return 'This email is already registered. Try signing in instead.'
  if (code.includes('wrong-password') ||
      code.includes('invalid-credential'))     return 'Invalid email or password.'
  if (code.includes('user-not-found'))         return 'No account found with this email.'
  if (code.includes('weak-password'))          return 'Password must be at least 6 characters.'
  if (code.includes('popup-closed'))           return 'Sign-in cancelled. Please try again.'
  if (code.includes('network-request-failed')) return 'Network error. Check your connection.'
  if (code.includes('operation-not-allowed'))  return 'Email/password sign-in is not enabled. Enable it in the Firebase console.'
  if (code.includes('too-many-requests'))      return 'Too many attempts. Please wait a moment and try again.'
  if (code.includes('invalid-api-key'))        return 'Invalid Firebase configuration. Check your .env.local file.'
  return err?.message || 'Something went wrong. Please try again.'
}
