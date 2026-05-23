/**
 * SYNAPSIX ERP — Modules API
 */
import api from './axios'

export const modulesApi = {
  getAll: () =>
    api.get('/core/modules/'),

  getActive: () =>
    api.get('/core/modules/active/'),
}
