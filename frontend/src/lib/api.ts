import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = Cookies.get('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          Cookies.set('access_token', res.data.access_token)
          Cookies.set('refresh_token', res.data.refresh_token)
          original.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(original)
        } catch {
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, full_name?: string) =>
    api.post('/auth/register', { email, password, full_name }),
  me: () => api.get('/auth/me'),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
}

// Logs
export const logsApi = {
  list: (params?: {
    page?: number
    page_size?: number
    status?: string
    risk_level?: string
    since?: string
  }) => api.get('/logs', { params }),
  stats: (since?: string) => api.get('/logs/stats', { params: { since } }),
  get: (id: string) => api.get(`/logs/${id}`),
}

// Admin — API Keys
export const apiKeysApi = {
  list: () => api.get('/admin/api-keys'),
  create: (name: string, expires_at?: string) =>
    api.post('/admin/api-keys', { name, expires_at }),
  revoke: (id: string) => api.delete(`/admin/api-keys/${id}`),
}

// Admin — Policies
export const policiesApi = {
  list: () => api.get('/admin/policies'),
  create: (data: unknown) => api.post('/admin/policies', data),
  update: (id: string, data: unknown) => api.patch(`/admin/policies/${id}`, data),
}

// Admin — Users
export const usersApi = {
  list: () => api.get('/admin/users'),
  update: (id: string, data: unknown) => api.patch(`/admin/users/${id}`, data),
}

// Gateway
export const gatewayApi = {
  scanInput: (prompt: string) =>
    api.post('/gateway/scan/input', { prompt }),
}
