import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// Environment-aware API URL configuration
// Production: Use VITE_API_URL from Vercel environment variables
// Development: Use local development server
const getApiUrl = () => {
  // Check if we're in production (Vercel deployment)
  const envApiUrl = import.meta.env.VITE_API_URL

  if (envApiUrl) {
    // Production: Use the Cloud Run API URL
    return envApiUrl
  }

  // Development: Use localhost
  return 'http://localhost:3000/api'
}

const API_URL = getApiUrl()

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('API URL:', API_URL)
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
}

export const badgeApi = {
  getAll: (params?: any) => api.get('/badges', { params }),
  getById: (id: string) => api.get(`/badges/${id}`),
  create: (data: any) => api.post('/badges', data),
  update: (id: string, data: any) => api.put(`/badges/${id}`, data),
  checkIn: (id: string) => api.put(`/badges/${id}/check-in`),
  reverseCheckIn: (id: string) => api.put(`/badges/${id}/reverse-check-in`),
  addLog: (id: string, data: any) => api.post(`/badges/${id}/logs`, data),
  getTypes: () => api.get('/badges/types/all'),
}

export const eventApi = {
  getAll: (params?: any) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  getGrid: () => api.get('/events/grid'),
  getAttendees: (id: string) => api.get(`/events/${id}/attendees`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
}

export const ticketApi = {
  create: (data: { badgeId: string; eventId: string }) =>
    api.post('/tickets', data),
  delete: (id: string) => api.delete(`/tickets/${id}`),
  getByBadge: (badgeId: string) => api.get(`/tickets/badge/${badgeId}`),
  getByEvent: (eventId: string) => api.get(`/tickets/event/${eventId}`),
}

export const reportApi = {
  badgeSummary: () => api.get('/reports/badge-summary'),
  eventCapacity: () => api.get('/reports/event-capacity'),
}

export const daypartApi = {
  getAll: () => api.get('/dayparts'),
}

export const syncApi = {
  triggerBaseData: () => api.post('/sync/base-data'),
  triggerEventTypes: () => api.post('/sync/event-types'),
  triggerEvents: () => api.post('/sync/events'),
  triggerBadges: () => api.post('/sync/badges'),
  triggerTickets: () => api.post('/sync/tickets'),
  triggerAll: () => api.post('/sync/all'),
  getStatus: (jobId: string) => api.get(`/sync/status/${jobId}`),
  getLastSyncs: () => api.get('/sync/last-syncs'),
}
