const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options = {}, timeoutMs = 15_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, signal: controller.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
    return data
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Is the backend running?')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function registerUser(idToken, { name, phoneNumber, industry }) {
  return request('/users/register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_token:     idToken,
      name,
      phone_number: phoneNumber || null,
      industry,
    }),
  })
}

export async function getMe(idToken) {
  try {
    return await request('/users/me', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
  } catch (err) {
    if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
      return null
    }
    throw err
  }
}

// Dashboard API endpoints
export async function getDashboardMetrics(idToken) {
  return request('/dashboard/metrics', {
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

// Playground API endpoints
export async function sendPlaygroundMessage(idToken, { content, client_name }) {
  return request('/playground/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      content,
      client_name,
    }),
  })
}

export async function getPlaygroundConversation(idToken, conversationId) {
  return request(`/playground/conversation/${conversationId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

export async function deletePlaygroundConversation(idToken, conversationId) {
  return request(`/playground/conversation/${conversationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

export async function deleteUser(idToken) {
  return request('/users/delete/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  })
}
