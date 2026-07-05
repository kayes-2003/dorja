import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function api(path, { method = 'GET', body } = {}) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is missing — check your frontend/.env file')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (networkErr) {
    // This is the actual "Failed to fetch" case — the browser never got a response.
    throw new Error(
      `Could not reach the backend at ${API_BASE_URL}. Is it running? (uvicorn app.main:app --reload --port 8000)`
    )
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}