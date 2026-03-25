/**
 * StackLens API client
 * Automatically attaches the Firebase ID token to every request
 * so the backend can verify the caller is authenticated.
 */
import axios, { AxiosRequestConfig } from 'axios'
import { AnalysisResult, HistoryItem } from '@/types'
import { getAuth } from 'firebase/auth'

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 90000, // 90s for slow Ollama responses
})

/**
 * Get the current Firebase ID token.
 * Returns null if the user is not signed in.
 */
async function getToken(): Promise<string | null> {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken(/* forceRefresh= */ false)
  } catch {
    return null
  }
}

/**
 * Build headers — attach Authorization: Bearer <token> if logged in.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * POST /api/analyze
 * Sends Firebase token so backend can verify auth.
 */
export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  const headers = await authHeaders()
  const { data } = await API.post('/api/analyze', { url }, { headers })
  return data
}

/**
 * GET /api/history
 */
export async function getHistory(): Promise<HistoryItem[]> {
  const headers = await authHeaders()
  const { data } = await API.get('/api/history', { headers })
  return data.history || []
}

/**
 * GET /health
 */
export async function checkHealth(): Promise<{ api: string; ollama: boolean }> {
  const { data } = await API.get('/health')
  return data
}