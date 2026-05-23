/**
 * SYNAPSIX ERP — Auth API
 */
import api from './axios'

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login/', { email, password }),

  logout: (refreshToken) =>
    api.post('/auth/logout/', { refresh: refreshToken }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh/', { refresh: refreshToken }),

  me: () =>
    api.get('/auth/me/'),

  updateProfile: (data) =>
    api.patch('/auth/me/', data),
}
