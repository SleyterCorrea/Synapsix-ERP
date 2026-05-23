/**
 * SYNAPSIX ERP — Settings API
 */
import api from './axios'

export const settingsApi = {
  getAll: () => api.get('/settings/'),
  update: (key, value) => api.patch('/settings/', { key, value }),
  getPermissions: (roleId) => api.get(`/core/roles/${roleId}/permissions/`),
  updatePermissions: (roleId, permissions) =>
    api.put(`/core/roles/${roleId}/permissions/`, { permissions }),
  getRoles: () => api.get('/core/roles/'),
  getDepartments: () => api.get('/core/departments/'),
}
